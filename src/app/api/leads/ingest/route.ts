import crypto from 'node:crypto'

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isDatabaseConfigured } from '@/db'
import { LEAD_CHANNELS } from '@/db/schema'
import { upsertChannelLead } from '@/lib/data/leads'
import { getCourseBySlug } from '@/lib/data/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * =============================================================================
 *  Lead ingest — the assistant's way into the admin inbox
 * =============================================================================
 *
 *  The AI assistant owns its own database, and enquiries it captures live
 *  there: an admission form filled in mid-conversation, a counselling session
 *  booked, a WhatsApp thread that turned into a real question. None of that is
 *  visible to the admissions team working out of /admin, because it is in a
 *  different database on a different host.
 *
 *  Rather than have the admin read across to another system — which makes every
 *  page load depend on that system being up, and stops working the moment
 *  someone changes its schema — the assistant posts them here and they become
 *  ordinary rows in the same table the contact form writes to. One inbox, one
 *  query, and an assistant outage costs new leads rather than the whole screen.
 *
 *  Authentication is a shared secret over an HMAC of the body, not a bearer
 *  token: the signature covers the payload, so a captured request cannot be
 *  edited and replayed with a different phone number on it.
 *
 *      X-Globify-Signature-256: sha256=<hmac of the raw body, LEAD_INGEST_SECRET>
 * =============================================================================
 */

const bodySchema = z.object({
  channel: z.enum(LEAD_CHANNELS),
  /** The assistant's own id for this enquiry — its conversation reference. */
  externalRef: z.string().min(1).max(191),
  handle: z.string().max(191).nullish(),
  name: z.string().max(191).nullish(),
  phone: z.string().max(64).nullish(),
  email: z.string().email().max(191).nullish().catch(null),
  message: z.string().max(5000).nullish(),
  /** Validated against the live catalogue below, not trusted as sent. */
  courseSlug: z.string().max(191).nullish(),
  source: z.string().max(64).default('assistant'),
  campaign: z.string().max(191).nullish(),
})

function verify(raw: string, header: string | null, secret: string): boolean {
  if (!secret || !header?.startsWith('sha256=')) return false

  const received = header.slice('sha256='.length)
  const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex')

  if (received.length !== expected.length || !/^[0-9a-f]+$/i.test(received)) return false
  return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'))
}

export async function POST(request: Request) {
  const secret = process.env.LEAD_INGEST_SECRET?.trim() ?? ''

  /* Unconfigured fails closed. An ingest endpoint that accepts anything while
     nobody has set a secret is a public write into the admissions inbox. */
  if (!secret) {
    console.error('[leads] LEAD_INGEST_SECRET is not set — ingest is refused.')
    return NextResponse.json({ ok: false, error: 'Ingest not configured.' }, { status: 503 })
  }

  const raw = await request.text()

  if (!verify(raw, request.headers.get('x-globify-signature-256'), secret)) {
    console.warn('[leads] rejected an ingest with an invalid signature.')
    return NextResponse.json({ ok: false, error: 'Invalid signature.' }, { status: 401 })
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(parsedJson)
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

  if (!isDatabaseConfigured()) {
    /* 503 rather than a silent 200: the sender should be able to retry, and a
       lead acknowledged but never stored is worse than one that failed loudly. */
    console.error('[leads] ingest received a lead but no DATABASE_URL is configured.')
    return NextResponse.json({ ok: false, error: 'Storage unavailable.' }, { status: 503 })
  }

  const lead = parsed.data

  /* The course is resolved against the catalogue rather than stored as sent, so
     a slug the assistant knows and this site does not cannot invent a course
     name in the inbox. An unknown slug degrades to "not sure yet" instead of
     rejecting an otherwise good lead. */
  const course = lead.courseSlug ? await getCourseBySlug(lead.courseSlug) : null

  try {
    await upsertChannelLead({
      channel: lead.channel,
      externalRef: lead.externalRef,
      handle: lead.handle ?? null,
      name: lead.name ?? null,
      phone: lead.phone ?? null,
      email: lead.email ?? null,
      message: lead.message ?? null,
      ...(course ? { courseSlug: course.slug, courseTitle: course.title } : {}),
      source: lead.source,
      campaign: lead.campaign ?? null,
    })
  } catch (error) {
    console.error('[leads] could not store an ingested lead', error)
    return NextResponse.json({ ok: false, error: 'Could not store the lead.' }, { status: 500 })
  }

  /* No revalidation call: every /admin route renders dynamically, so the next
     time someone opens the inbox the query runs again and the lead is there. */
  return NextResponse.json({ ok: true })
}
