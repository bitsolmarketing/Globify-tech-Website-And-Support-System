'use client'

import * as React from 'react'
import { ArrowUp, Bot, MessageCircle, Phone, RotateCcw, Square, Ticket } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { SupportMessageBubble, type SupportMessage } from '@/components/support/support-message'
import { cn } from '@/lib/utils'

/* The assistant's SSE contract. Kept as a local type rather than imported —
   the two applications deploy independently, so this is a wire format, and
   writing it down here is what makes a change to it visible as a change to
   this file. */
type ChatActionKind = 'ADMISSION_FORM' | 'MEETING_FORM' | 'SUPPORT_FORM' | 'CAREER_FORM'

type ChatStreamEvent =
  | { type: 'meta'; language: 'en' | 'ur' | 'ur_roman' | 'pa' }
  | { type: 'chunk'; text: string }
  | {
      type: 'done'
      ticketId?: string
      suggestions?: string[]
      action?: { kind: ChatActionKind; subject?: string }
    }
  | { type: 'error'; message: string }

const STORAGE_KEY = 'globify.support.chat.v1'

const DEFAULT_SUGGESTIONS = [
  'Which course suits me if I am a beginner?',
  'What are the fees and the 50% discount?',
  'What are the batch timings?',
  'Do you help with jobs after the course?',
]

/** Crockford-ish alphabet: no characters that are misread over a phone call. */
function shortId(length = 8): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length]
  return out
}

/* Matches the reference format the assistant generates for itself, so a
   conversation started here is indistinguishable from one started on
   ai.globifytech.com in its admin console. */
const newConversationRef = () => `GT-CONV-${shortId(10)}`

type Outage = { code: string; message: string }

type Props = {
  /** Campaign-aware WhatsApp deep link, built on the server. */
  whatsappHref: string
  phoneHref: string
  phoneDisplay: string
  className?: string
}

/**
 * =============================================================================
 *  Globify Tech AI Assistant — chat surface on globifytech.com
 * =============================================================================
 *
 *  The assistant itself runs at ai.globifytech.com. This is its front end on
 *  the marketing site: same conversation, same knowledge base, rendered in this
 *  site's own design system and served same-origin through
 *  `/api/support/chat`.
 *
 *  When the assistant cannot be reached the surface does not pretend — it says
 *  so and puts WhatsApp and the counsellor's number in reach, because a visitor
 *  asking about fees at 11pm needs an answer, not an error.
 * =============================================================================
 */
export function SupportChat({ whatsappHref, phoneHref, phoneDisplay, className }: Props) {
  const [messages, setMessages] = React.useState<SupportMessage[]>([])
  const [streaming, setStreaming] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [handoff, setHandoff] = React.useState<{ kind: ChatActionKind; subject?: string } | null>(
    null,
  )
  const [ticketId, setTicketId] = React.useState<string | null>(null)
  const [outage, setOutage] = React.useState<Outage | null>(null)
  const [announcement, setAnnouncement] = React.useState('')
  const [draft, setDraft] = React.useState('')

  const conversationRef = React.useRef('')
  const abortRef = React.useRef<AbortController | null>(null)
  const transcriptRef = React.useRef<HTMLDivElement>(null)
  const composerRef = React.useRef<HTMLTextAreaElement>(null)
  const stickToBottom = React.useRef(true)

  /* `send` needs the transcript, but reading it from state would give the
     callback a new identity on every token — re-rendering the composer and the
     suggestion chips for the whole length of every answer. */
  const messagesRef = React.useRef(messages)
  messagesRef.current = messages

  /* ------------------------------------------------------------- restore -- */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const saved = raw ? (JSON.parse(raw) as { reference?: string; messages?: SupportMessage[] }) : null
      conversationRef.current = saved?.reference || newConversationRef()
      if (saved?.messages?.length) setMessages(saved.messages)
    } catch {
      conversationRef.current = newConversationRef()
    }
  }, [])

  /* ------------------------------------------------------------- persist -- */
  /* Written once the reply has settled, never per token: serialising the whole
     transcript is synchronous, grows with the conversation, and doing it dozens
     of times a second is the most expensive thing on the page during an
     answer. It only has to survive a reload. */
  React.useEffect(() => {
    if (streaming || !conversationRef.current) return

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ reference: conversationRef.current, messages }),
        )
      } catch {
        /* Quota or private mode — the conversation still works in memory. */
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [messages, streaming])

  /* --------------------------------------------------------- auto-scroll -- */
  /* Smooth scrolling restarts its animation on every call, so per-token it
     never finishes and never reaches the bottom. Smooth is kept for the events
     a person reads as a jump; streaming text follows instantly. The scroll is
     skipped entirely when the visitor has scrolled up to re-read something. */
  React.useEffect(() => {
    const el = transcriptRef.current
    if (!el || !stickToBottom.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: streaming ? 'auto' : 'smooth' })
  }, [messages, streaming, handoff])

  const onTranscriptScroll = React.useCallback(() => {
    const el = transcriptRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])

  /* ---------------------------------------------------------------- send -- */
  const send = React.useCallback(async (text: string) => {
    const question = text.trim()
    if (!question || abortRef.current) return

    setSuggestions([])
    setHandoff(null)
    setOutage(null)
    setDraft('')

    const assistantId = shortId(12)
    const history: SupportMessage[] = [
      ...messagesRef.current,
      { id: shortId(12), role: 'user', content: question },
    ]

    stickToBottom.current = true
    setMessages([...history, { id: assistantId, role: 'assistant', content: '' }])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    /* Declared here so the `finally` can cancel a frame that is still queued
       when the stream ends early — otherwise an aborted turn repaints once more
       after the fact and overwrites what the error handler just put there. */
    let frame = 0
    let full = ''

    const fail = (message: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: message } : m)),
      )
      setAnnouncement(message)
    }

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationRef: conversationRef.current,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as {
          code?: string
          error?: string
        } | null
        const message =
          payload?.error ?? 'The assistant could not answer that. Please try again in a moment.'

        /* Anything that is not the visitor's own fault puts the human channels
           on screen. A rate limit is theirs to wait out, so it stays inline. */
        if (payload?.code !== 'rate-limited') {
          setOutage({ code: payload?.code ?? 'upstream-error', message })
        }

        fail(message)
        return
      }

      /* Tokens arrive faster than the screen refreshes. Committing each one
         separately re-renders the transcript and re-runs the formatter over the
         whole answer per token — work that grows with the length of the reply,
         so the longer the answer the further the text falls behind. Painting on
         the animation frame coalesces whatever arrived since the last one.
         Nothing is dropped: `full` holds every token, and the flush after the
         loop guarantees the last one lands. */
      let pending = false
      const paint = () => {
        frame = 0
        pending = false
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)),
        )
      }
      const schedulePaint = () => {
        if (pending) return
        pending = true
        frame = requestAnimationFrame(paint)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue

          const payload = trimmed.slice(5).trim()
          if (!payload) continue

          let event: ChatStreamEvent
          try {
            event = JSON.parse(payload) as ChatStreamEvent
          } catch {
            continue
          }

          if (event.type === 'chunk') {
            full += event.text
            schedulePaint()
          } else if (event.type === 'done') {
            if (event.suggestions?.length) setSuggestions(event.suggestions)
            if (event.action) setHandoff(event.action)
            if (event.ticketId) setTicketId(event.ticketId)
          } else if (event.type === 'error') {
            full = event.message
            schedulePaint()
          }
        }
      }

      if (frame) cancelAnimationFrame(frame)
      paint()
      setAnnouncement(full)
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return

      const message =
        'I could not reach the assistant. Please check your connection and try again — or message us on WhatsApp.'
      setOutage({ code: 'unreachable', message })
      fail(message)
    } finally {
      if (frame) cancelAnimationFrame(frame)
      setStreaming(false)
      abortRef.current = null
    }
  }, [])

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setStreaming(false)
  }

  const reset = () => {
    stop()
    conversationRef.current = newConversationRef()
    setMessages([])
    setSuggestions([])
    setHandoff(null)
    setTicketId(null)
    setOutage(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* Nothing to clear. */
    }
  }

  /* Grow the composer with its content, up to a cap, then let it scroll. */
  const onDraftChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value)
    const el = event.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const onComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter starts a new line. IME composition must not send.
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (composerRef.current) composerRef.current.style.height = 'auto'
    void send(draft)
  }

  const chips = suggestions.length ? suggestions : DEFAULT_SUGGESTIONS
  const isEmpty = messages.length === 0
  const last = messages[messages.length - 1]
  const awaitingFirstToken = streaming && last?.role === 'assistant' && !last.content

  return (
    <div
      className={cn(
        'flex h-[38rem] flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-soft sm:h-[42rem]',
        className,
      )}
    >
      {/* ------------------------------------------------------------ Header */}
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-brand-950 px-4 py-3 text-white sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-gold-400 ring-1 ring-white/15 ring-inset"
          >
            <Bot className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-sans text-sm font-bold">Globify AI Assistant</p>
            <p className="flex items-center gap-1.5 font-sans text-xs text-white/60">
              <span aria-hidden className="size-1.5 rounded-full bg-emerald-400" />
              Answers instantly · English &amp; اردو
            </p>
          </div>
        </div>

        <Button
          variant="ghost-light"
          size="sm"
          onClick={reset}
          disabled={isEmpty && !streaming}
          className="shrink-0"
        >
          <RotateCcw aria-hidden />
          <span className="hidden sm:inline">New chat</span>
        </Button>
      </div>

      {/* -------------------------------------------------------- Transcript */}
      <div
        ref={transcriptRef}
        onScroll={onTranscriptScroll}
        className="flex-1 overflow-y-auto px-4 py-5 sm:px-5"
      >
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <span
              aria-hidden
              className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-brand-800 to-brand-950 text-gold-400"
            >
              <Bot className="size-7" />
            </span>
            <h3 className="mt-5 font-sans text-lg font-bold text-ink-900">
              Ask me anything about Globify Tech
            </h3>
            <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-ink-500">
              Courses, fees, batch timings, admission steps or which skill fits your background —
              in English, Urdu or Roman Urdu.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) =>
              message.role === 'assistant' && !message.content && awaitingFirstToken ? (
                <div key={message.id} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-800 to-brand-950 text-gold-400"
                  >
                    <Bot className="size-4" />
                  </span>
                  <span className="flex gap-1.5 rounded-2xl rounded-tl-sm bg-ink-50 px-4 py-4 ring-1 ring-hairline ring-inset">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        aria-hidden
                        className="size-1.5 animate-bounce rounded-full bg-ink-400"
                        style={{ animationDelay: `${dot * 140}ms` }}
                      />
                    ))}
                    <span className="sr-only">The assistant is typing</span>
                  </span>
                </div>
              ) : (
                <SupportMessageBubble key={message.id} message={message} />
              ),
            )}

            {ticketId && (
              <div className="ml-11 flex items-center gap-2">
                <Badge variant="gold" size="md">
                  <Ticket aria-hidden />
                  Ticket {ticketId}
                </Badge>
                <span className="font-sans text-xs text-ink-500">
                  Our team has been notified and will follow up.
                </span>
              </div>
            )}

            {handoff && (
              <HandoffCard
                kind={handoff.kind}
                subject={handoff.subject}
                whatsappHref={whatsappHref}
              />
            )}
          </div>
        )}
      </div>

      {/* Announced only once an answer has settled — a live region fed token by
          token reads the reply back one fragment at a time. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* ----------------------------------------------------------- Outage */}
      {outage && (
        <div
          role="status"
          className="border-t border-amber-200 bg-amber-50/80 px-4 py-3 sm:px-5"
        >
          <p className="font-sans text-[0.8125rem] font-semibold text-amber-900">
            The assistant is unavailable right now
          </p>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-amber-800">
            Our team answers on WhatsApp within minutes during opening hours.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button asChild variant="whatsapp" size="sm">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden />
                Chat on WhatsApp
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`tel:${phoneHref}`}>
                <Phone aria-hidden />
                {phoneDisplay}
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- Composer */}
      <div className="border-t border-hairline bg-white px-4 py-3 sm:px-5">
        {chips.length > 0 && (
          <ul className="mb-2.5 flex gap-2 overflow-x-auto pb-1">
            {chips.map((chip) => (
              <li key={chip}>
                <button
                  type="button"
                  disabled={streaming}
                  onClick={() => void send(chip)}
                  className={cn(
                    'shrink-0 rounded-full border border-ink-200 bg-white px-3 py-1.5 font-sans text-xs whitespace-nowrap text-ink-600',
                    'transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {chip}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (composerRef.current) composerRef.current.style.height = 'auto'
            void send(draft)
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="support-composer" className="sr-only">
            Your message to the Globify AI Assistant
          </label>
          <Textarea
            id="support-composer"
            ref={composerRef}
            rows={1}
            value={draft}
            onChange={onDraftChange}
            onKeyDown={onComposerKeyDown}
            maxLength={4000}
            placeholder="Type your question…"
            className="max-h-40 min-h-12 resize-none py-3.5"
          />

          {streaming ? (
            <Button type="button" variant="secondary" size="icon" onClick={stop} title="Stop">
              <Square aria-hidden className="size-4 fill-current" />
              <span className="sr-only">Stop generating</span>
            </Button>
          ) : (
            <Button type="submit" variant="primary" size="icon" disabled={!draft.trim()}>
              <ArrowUp aria-hidden />
              <span className="sr-only">Send message</span>
            </Button>
          )}
        </form>

        <p className="mt-2 text-center font-sans text-[0.6875rem] text-ink-400">
          AI answers can be imperfect — confirm fees and dates with our admissions team.
        </p>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * Handoff
 *
 * The assistant signals when a conversation has reached the point of an actual
 * enrolment, a booked session or a support request. On ai.globifytech.com that
 * opens a structured form; here it hands the visitor to the equivalent journey
 * that already exists on this site — the enquiry form that writes to the leads
 * table and notifies admissions, or WhatsApp for support.
 * ------------------------------------------------------------------------ */
function HandoffCard({
  kind,
  subject,
  whatsappHref,
}: {
  kind: ChatActionKind
  subject?: string
  whatsappHref: string
}) {
  const copy: Record<ChatActionKind, { title: string; body: string; cta: string; href: string }> = {
    ADMISSION_FORM: {
      title: 'Ready to enrol?',
      body: 'Leave your details and an admissions counsellor will confirm your seat, batch and discount within one working day.',
      cta: 'Open the admission form',
      href: subject ? `/courses/${subject}` : '/contact#enroll',
    },
    MEETING_FORM: {
      title: 'Book your free counselling session',
      body: 'Twenty minutes with a counsellor who will recommend the right course for your background — honestly.',
      cta: 'Book a session',
      href: '/contact#enroll',
    },
    CAREER_FORM: {
      title: 'Get a career recommendation',
      body: 'Tell us your education and where you want to be, and we will map the fastest route there.',
      cta: 'Request guidance',
      href: '/contact#enroll',
    },
    SUPPORT_FORM: {
      title: 'Talk to a person',
      body: 'Our team picks up on WhatsApp within minutes during opening hours.',
      cta: 'Chat on WhatsApp',
      href: whatsappHref,
    },
  }

  const { title, body, cta, href } = copy[kind]
  const external = href.startsWith('http')

  return (
    <div className="ml-11 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
      <p className="font-sans text-sm font-bold text-brand-900">{title}</p>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-600">{body}</p>
      <Button asChild variant={external ? 'whatsapp' : 'primary'} size="sm" className="mt-3">
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {external && <MessageCircle aria-hidden />}
          {cta}
        </a>
      </Button>
    </div>
  )
}
