import { NextResponse } from 'next/server'
import { z } from 'zod'

import { ASSISTANT_TIMEOUT_MS, assistantEndpoint } from '@/lib/support'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * =============================================================================
 *  Support chat — server-side proxy to the Globify Tech AI Assistant
 * =============================================================================
 *
 *  The browser posts here; this route posts to `ai.globifytech.com/api/chat`
 *  and pipes the Server-Sent Events straight back. The visitor's connection
 *  never leaves `globifytech.com`.
 *
 *  Piping the body through rather than buffering it is the whole point: the
 *  assistant streams its answer token by token, and reading it to completion
 *  here would turn a reply that starts appearing in about a second into one
 *  that arrives all at once several seconds later.
 * =============================================================================
 */

/* Mirrors the assistant's own request schema, so a malformed body is refused
   here instead of costing a round trip to be refused there. The 4000-character
   cap is the assistant's; matching it means a too-long message fails with our
   error copy rather than an opaque upstream 400. */
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50),
  conversationRef: z.string().max(64).optional(),
})

/* Same in-memory limiter as /api/contact: enough to blunt casual abuse on a
   single instance. The assistant applies its own Redis-backed limit as well,
   which is the one that holds across restarts and multiple instances — this
   one exists so an obvious flood never becomes upstream traffic at all. */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 30
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimit(key: string): boolean {
  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_PER_WINDOW) return false

  entry.count += 1
  return true
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous'

  const endpoint = assistantEndpoint('/api/chat')
  if (!endpoint) {
    /* 503, not 500: the assistant is a dependency that has not been pointed at
       yet, and the client renders the WhatsApp fallback on this exact code. */
    return NextResponse.json(
      {
        ok: false,
        code: 'not-configured',
        error: 'The AI assistant is not connected yet. Please use WhatsApp or call us.',
      },
      { status: 503 },
    )
  }

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { ok: false, code: 'rate-limited', error: 'Too many messages. Please slow down a moment.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  /* Two ways this call should end early, and both have to be honoured: the
     visitor pressing stop or closing the tab (request.signal), and an upstream
     that accepted the connection and then went quiet (the timeout). Without the
     first, an abandoned answer keeps generating and keeps being billed; without
     the second, a wedged host holds this worker until the platform reaps it. */
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(ASSISTANT_TIMEOUT_MS)])

  let upstream: Response
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        /* The assistant rate-limits per IP and logs the conversation. Without
           this every visitor would arrive as this one server, sharing a single
           quota between all of them. */
        'X-Forwarded-For': ip,
        'X-Globify-Source': 'globifytech.com/contact/support',
      },
      body: JSON.stringify(parsed.data),
      signal,
      cache: 'no-store',
    })
  } catch (error) {
    /* The visitor navigating away aborts this fetch too. There is no one left
       to answer and nothing went wrong, so it is not logged as a failure. */
    if (request.signal.aborted) return new Response(null, { status: 499 })

    console.error('[support] could not reach the AI assistant', error)
    return NextResponse.json(
      {
        ok: false,
        code: 'unreachable',
        error: 'The assistant is offline right now. Please use WhatsApp or call us.',
      },
      { status: 502 },
    )
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    console.error(`[support] assistant responded ${upstream.status}`, detail.slice(0, 500))

    /* 429 is the assistant's own limiter and means something specific to the
       visitor — pass it through so they are told to slow down rather than told
       the service is broken. */
    const status = upstream.status === 429 ? 429 : 502
    return NextResponse.json(
      {
        ok: false,
        code: status === 429 ? 'rate-limited' : 'upstream-error',
        error:
          status === 429
            ? 'Too many messages. Please slow down a moment.'
            : 'The assistant could not answer that. Please try again, or reach us on WhatsApp.',
      },
      { status },
    )
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      /* Hostinger fronts this site with a caching proxy, and a buffering proxy
         holds every token until the answer is complete — the model streams
         perfectly and the widget still looks frozen for the whole reply. */
      'X-Accel-Buffering': 'no',
    },
  })
}
