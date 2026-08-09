'use client'

import * as React from 'react'
import { Bot, User } from 'lucide-react'

import { cn } from '@/lib/utils'

export type SupportMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/** True when the text contains Urdu / Punjabi (Arabic) script. */
export function isUrduScript(text: string): boolean {
  return /[؀-ۿݐ-ݿ]/.test(text)
}

/**
 * One message in the transcript.
 *
 * Memoised on its contents. Every token that arrives replaces the transcript
 * array, so without this an eight-message thread re-runs the formatter for all
 * eight messages on every animation frame in order to add one word to the last
 * one — the cost of an answer would grow with the length of the conversation.
 */
function SupportMessageBubbleImpl({ message }: { message: SupportMessage }) {
  const isUser = message.role === 'user'
  const rtl = isUrduScript(message.content)

  return (
    <div className={cn('flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl',
          isUser
            ? 'bg-ink-100 text-ink-600'
            : 'bg-linear-to-br from-brand-800 to-brand-950 text-gold-400',
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>

      <div
        dir={rtl ? 'rtl' : undefined}
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed',
          isUser
            ? 'rounded-tr-sm bg-brand-900 text-white'
            : 'rounded-tl-sm bg-ink-50 text-ink-700 ring-1 ring-hairline ring-inset',
        )}
      >
        <span className="sr-only">{isUser ? 'You said: ' : 'Assistant replied: '}</span>
        {renderContent(message.content)}
      </div>
    </div>
  )
}

export const SupportMessageBubble = React.memo(
  SupportMessageBubbleImpl,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.role === next.message.role,
)

/**
 * The assistant answers in light markdown — bold section headings, bullets and
 * numbered steps. This renders those four shapes as React nodes and leaves
 * everything else as text.
 *
 * Deliberately not a markdown library: the parser would ship to every visitor
 * who opens the page, and the only alternative that is small — writing HTML
 * into `dangerouslySetInnerHTML` — puts model output into the DOM as markup.
 * Returning nodes means nothing the model emits can become an element.
 */
function renderContent(text: string): React.ReactNode {
  return text.split('\n').map((line, index) => {
    const trimmed = line.trimStart()

    if (!trimmed) return <span key={index} aria-hidden className="block h-2" />

    // A line that is entirely bold reads as a section heading.
    const heading = /^\*\*(.+)\*\*:?$/.exec(trimmed)
    if (heading) {
      return (
        <p key={index} className={cn('font-sans font-bold', index > 0 && 'mt-3')}>
          {heading[1]}
        </p>
      )
    }

    const bullet = /^([-*•])\s+/.exec(trimmed)
    const numbered = /^(\d+)\.\s+/.exec(trimmed)

    if (bullet || numbered) {
      return (
        <p key={index} className={cn('flex gap-2', index > 0 && 'mt-1')}>
          <span aria-hidden className="shrink-0 font-semibold text-brand-700">
            {numbered ? `${numbered[1]}.` : '•'}
          </span>
          <span>{formatInline(trimmed.replace(/^([-*•]|\d+\.)\s+/, ''))}</span>
        </p>
      )
    }

    return (
      <p key={index} className={cn(index > 0 && 'mt-1.5')}>
        {formatInline(line)}
      </p>
    )
  })
}

function formatInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.length > 2 && part.startsWith('_') && part.endsWith('_')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}
