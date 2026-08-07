import { NextResponse } from 'next/server'

import { isDatabaseConfigured } from '@/db'
import { createSubscriber } from '@/lib/data/subscribers'
import { newsletterSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = newsletterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid email address.' },
      { status: 422 },
    )
  }

  const { email, website } = parsed.data

  // Honeypot tripped — silently accept and discard.
  if (website) return NextResponse.json({ ok: true })

  if (isDatabaseConfigured()) {
    try {
      // Re-subscribing is absorbed by the unique index — never a user-facing error.
      await createSubscriber(email, 'website-footer')
    } catch (error) {
      console.error('[newsletter] could not store subscriber', error)
      return NextResponse.json(
        { ok: false, error: 'Subscription service is unavailable. Please try again later.' },
        { status: 500 },
      )
    }
  } else {
    console.info('[newsletter] new subscriber (no DATABASE_URL configured)', email)
  }

  const webhook = process.env.NEWSLETTER_WEBHOOK_URL
  if (webhook) {
    try {
      const forwarded = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'website-footer',
          subscribedAt: new Date().toISOString(),
        }),
      })
      if (!forwarded.ok) throw new Error(`Webhook responded ${forwarded.status}`)
    } catch (error) {
      /* Already stored locally, so a provider outage is not the subscriber's
         problem — log it and confirm. */
      console.error('[newsletter] webhook delivery failed', error)
      if (!isDatabaseConfigured()) {
        return NextResponse.json(
          { ok: false, error: 'Subscription service is unavailable. Please try again later.' },
          { status: 502 },
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
