import { NextResponse } from 'next/server'

import { isDatabaseConfigured } from '@/db'
import { getCourseBySlug } from '@/lib/data/courses'
import { createLead } from '@/lib/data/leads'
import { contactFormSchema } from '@/lib/validations'
import { contactInfo } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* Very small in-memory rate limiter. Enough to blunt casual abuse on a single
   instance; put a real limiter (Upstash/Vercel KV) in front for production. */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5
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

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again in a minute.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = contactFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Validation failed.',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 422 },
    )
  }

  const { website, consent: _consent, ...lead } = parsed.data

  // Honeypot tripped — respond 200 so bots learn nothing, but drop the lead.
  if (website) return NextResponse.json({ ok: true })

  /* The course slug is validated here rather than in the shared zod schema:
     the catalogue lives in Postgres and the schema is shipped to the browser. */
  const course = await getCourseBySlug(lead.course)
  if (!course && lead.course !== 'not-sure') {
    return NextResponse.json(
      {
        ok: false,
        error: 'Validation failed.',
        issues: [{ path: 'course', message: 'Please choose a course from the list' }],
      },
      { status: 422 },
    )
  }

  const courseTitle = course?.title ?? 'Not sure yet'

  const payload = {
    ...lead,
    courseTitle,
    source: 'website-contact-form',
    campaign: 'azadi-sale-14-august',
    receivedAt: new Date().toISOString(),
    notify: process.env.CONTACT_FORM_TO_EMAIL || contactInfo.admissionsEmail,
  }

  /* Persist first: the lead is the thing we cannot afford to lose. A webhook
     failure below still leaves an admin-visible row. */
  if (isDatabaseConfigured()) {
    try {
      await createLead({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        courseSlug: lead.course,
        courseTitle,
        message: lead.message,
        source: 'website-contact-form',
        campaign: 'azadi-sale-14-august',
      })
    } catch (error) {
      console.error('[contact] could not store lead', error)
      return NextResponse.json(
        { ok: false, error: 'We could not save your message. Please try WhatsApp.' },
        { status: 500 },
      )
    }
  } else {
    console.info('[contact] new lead (no DATABASE_URL configured)', payload)
  }

  const webhook = process.env.CONTACT_FORM_WEBHOOK_URL
  if (webhook) {
    try {
      const forwarded = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!forwarded.ok) throw new Error(`Webhook responded ${forwarded.status}`)
    } catch (error) {
      /* The lead is already saved, so this is a notification failure, not a
         lost enquiry — log it and still confirm to the visitor. */
      console.error('[contact] webhook delivery failed', error)
      if (!isDatabaseConfigured()) {
        return NextResponse.json(
          { ok: false, error: 'We could not deliver your message. Please try WhatsApp.' },
          { status: 502 },
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
