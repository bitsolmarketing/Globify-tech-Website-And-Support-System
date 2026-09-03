import 'server-only'

import { randomUUID } from 'node:crypto'

import { and, count, desc, eq, gte, inArray, isNotNull, lte, sql, type SQL } from 'drizzle-orm'

import { getDb } from '@/db'
import {
  broadcastRecipients,
  broadcasts,
  conversationMessages,
  conversations,
  leads,
  whatsappOptOuts,
  type BroadcastAudience,
  type BroadcastDeliveryStatus,
  type BroadcastKind,
  type BroadcastRecipientRow,
  type BroadcastRecipientStatus,
  type BroadcastRow,
  type BroadcastStatus,
} from '@/db/schema'
import { normalisePhone } from '@/lib/whatsapp/format'

/**
 * ---------------------------------------------------------------------------
 * Broadcast persistence
 * ---------------------------------------------------------------------------
 *
 * Everything that touches the `broadcasts`, `broadcast_recipients` and
 * `whatsapp_opt_outs` tables lives here, exactly as `leads.ts` owns its own.
 * The runner, the server actions and the webhook all go through these
 * functions, which is what keeps the "never message an opted-out number" rule
 * in one place instead of three.
 */

/* ---------------------------------------------------------------------------
 * Broadcasts
 * ------------------------------------------------------------------------ */

export type BroadcastInput = {
  name: string
  kind: BroadcastKind
  templateName?: string | null
  templateLanguage?: string | null
  templateVariables?: string[]
  headerParameter?: string | null
  headerImageUrl?: string | null
  body?: string | null
  audience: BroadcastAudience
  scheduledFor?: Date | null
  createdBy?: string | null
}

export async function createBroadcast(input: BroadcastInput): Promise<BroadcastRow> {
  const [row] = await getDb()
    .insert(broadcasts)
    .values({
      id: randomUUID(),
      name: input.name,
      kind: input.kind,
      status: input.scheduledFor ? 'scheduled' : 'draft',
      templateName: input.templateName ?? null,
      templateLanguage: input.templateLanguage ?? 'en_US',
      templateVariables: input.templateVariables ?? [],
      headerParameter: input.headerParameter ?? null,
      headerImageUrl: input.headerImageUrl ?? null,
      body: input.body ?? null,
      audience: input.audience,
      scheduledFor: input.scheduledFor ?? null,
      createdBy: input.createdBy ?? null,
    })
    .returning()

  return row
}

/**
 * Edits are refused once a send has begun.
 *
 * Half the recipients having received the old wording and half the new one is
 * not a state anybody can reason about afterwards — least of all the person
 * reading the replies. The guard is here rather than only in the UI because a
 * server action is reachable without the page it came from.
 */
export async function updateBroadcast(id: string, input: BroadcastInput): Promise<void> {
  const existing = await getBroadcast(id)
  if (!existing) throw new Error('That broadcast no longer exists.')
  if (existing.status === 'sending' || existing.status === 'completed') {
    throw new Error(
      `A ${existing.status} broadcast cannot be edited. Duplicate it instead to send a revised version.`,
    )
  }

  await getDb()
    .update(broadcasts)
    .set({
      name: input.name,
      kind: input.kind,
      status: input.scheduledFor ? 'scheduled' : 'draft',
      templateName: input.templateName ?? null,
      templateLanguage: input.templateLanguage ?? 'en_US',
      templateVariables: input.templateVariables ?? [],
      headerParameter: input.headerParameter ?? null,
      headerImageUrl: input.headerImageUrl ?? null,
      body: input.body ?? null,
      audience: input.audience,
      scheduledFor: input.scheduledFor ?? null,
      updatedAt: sql`now()`,
    })
    .where(eq(broadcasts.id, id))
}

export async function getBroadcast(id: string): Promise<BroadcastRow | null> {
  const [row] = await getDb().select().from(broadcasts).where(eq(broadcasts.id, id)).limit(1)
  return row ?? null
}

export async function listBroadcasts(limit = 100): Promise<BroadcastRow[]> {
  return getDb().select().from(broadcasts).orderBy(desc(broadcasts.createdAt)).limit(limit)
}

export async function deleteBroadcast(id: string): Promise<void> {
  const db = getDb()
  /* No foreign keys anywhere in this schema (see the note in `schema.ts`), so
     the children are removed explicitly. Recipients first: a crash between the
     two leaves orphan rows nothing reads, whereas the other order leaves a
     broadcast whose recipient list has silently emptied. */
  await db.delete(broadcastRecipients).where(eq(broadcastRecipients.broadcastId, id))
  await db.delete(broadcasts).where(eq(broadcasts.id, id))
}

export async function setBroadcastStatus(
  id: string,
  status: BroadcastStatus,
  extra: { startedAt?: Date | null; completedAt?: Date | null; lastError?: string | null } = {},
): Promise<void> {
  await getDb()
    .update(broadcasts)
    .set({ status, ...extra, updatedAt: sql`now()` })
    .where(eq(broadcasts.id, id))
}

/**
 * Scheduled broadcasts whose time has come. Read by the cron route.
 *
 * `scheduled` only — a paused or cancelled broadcast keeps its `scheduledFor`
 * so the admin can still see when it was meant to go, and picking it up again
 * because the timestamp is in the past would override a deliberate stop.
 */
export async function dueScheduledBroadcasts(now = new Date()): Promise<BroadcastRow[]> {
  return getDb()
    .select()
    .from(broadcasts)
    .where(
      and(
        eq(broadcasts.status, 'scheduled'),
        isNotNull(broadcasts.scheduledFor),
        lte(broadcasts.scheduledFor, now),
      ),
    )
    .orderBy(broadcasts.scheduledFor)
    .limit(10)
}

/** Broadcasts a sweep should keep pushing along, oldest first. */
export async function sendingBroadcasts(): Promise<BroadcastRow[]> {
  return getDb()
    .select()
    .from(broadcasts)
    .where(eq(broadcasts.status, 'sending'))
    .orderBy(broadcasts.startedAt)
    .limit(10)
}

/* ---------------------------------------------------------------------------
 * Audience
 * ------------------------------------------------------------------------ */

export type Candidate = {
  phone: string
  name: string | null
  courseTitle: string | null
  leadId: string | null
}

/**
 * Turn a saved filter into the actual people it selects.
 *
 * Numbers are normalised to Cloud API's format *here*, before the dedupe, so
 * that `0300 123 4567` from the contact form and `+923001234567` from a
 * WhatsApp thread are recognised as the same person. Deduplicating on the raw
 * strings — which is what a naive `SELECT DISTINCT phone` does — messages that
 * person twice, and they are the most engaged person on the list precisely
 * because they appear in both tables.
 */
export async function resolveAudience(audience: BroadcastAudience): Promise<Candidate[]> {
  const db = getDb()
  const found = new Map<string, Candidate>()

  /* First writer wins for every field: the sources are ordered most-informative
     first, so a later duplicate cannot replace a real name with a null. */
  const add = (candidate: Candidate) => {
    const existing = found.get(candidate.phone)
    if (!existing) {
      found.set(candidate.phone, candidate)
      return
    }
    existing.name = existing.name ?? candidate.name
    existing.courseTitle = existing.courseTitle ?? candidate.courseTitle
    existing.leadId = existing.leadId ?? candidate.leadId
  }

  const since = audience.sinceDays
    ? new Date(Date.now() - audience.sinceDays * 86_400_000)
    : null

  if (audience.source === 'leads') {
    const clauses: SQL[] = [isNotNull(leads.phone)]
    if (audience.leadStatus) clauses.push(eq(leads.status, audience.leadStatus))
    if (audience.courseSlug) clauses.push(eq(leads.courseSlug, audience.courseSlug))
    if (since) clauses.push(gte(leads.createdAt, since))

    const rows = await db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        courseTitle: leads.courseTitle,
      })
      .from(leads)
      .where(and(...clauses))
      .orderBy(desc(leads.createdAt))
      .limit(10_000)

    for (const row of rows) {
      const phone = normalisePhone(row.phone)
      if (!phone) continue
      add({ phone, name: row.name, courseTitle: row.courseTitle, leadId: row.id })
    }
  }

  if (audience.source === 'conversations') {
    const clauses: SQL[] = [
      eq(conversations.channel, 'whatsapp'),
      isNotNull(conversations.contactPhone),
    ]
    if (since) clauses.push(gte(conversations.updatedAt, since))

    const rows = await db
      .select({
        phone: conversations.contactPhone,
        name: conversations.contactName,
      })
      .from(conversations)
      .where(and(...clauses))
      .orderBy(desc(conversations.updatedAt))
      .limit(10_000)

    for (const row of rows) {
      const phone = normalisePhone(row.phone)
      if (!phone) continue
      add({ phone, name: row.name, courseTitle: null, leadId: null })
    }
  }

  if (audience.source === 'manual') {
    for (const raw of audience.manual ?? []) {
      const phone = normalisePhone(raw)
      if (!phone) continue
      add({ phone, name: null, courseTitle: null, leadId: null })
    }

    /* A pasted list is usually a list of people already known — a WhatsApp
       group export, a batch roster. Borrowing their names from `leads` is what
       makes `{name}` work for a manual audience instead of falling back to
       "there" for everyone. */
    const phones = [...found.keys()]
    if (phones.length) {
      const known = await db
        .select({
          id: leads.id,
          name: leads.name,
          phone: leads.phone,
          courseTitle: leads.courseTitle,
        })
        .from(leads)
        .where(isNotNull(leads.phone))
        .limit(10_000)

      for (const row of known) {
        const phone = normalisePhone(row.phone)
        if (!phone) continue
        const candidate = found.get(phone)
        if (!candidate) continue
        candidate.name = candidate.name ?? row.name
        candidate.courseTitle = candidate.courseTitle ?? row.courseTitle
        candidate.leadId = candidate.leadId ?? row.id
      }
    }
  }

  return [...found.values()]
}

export type AudienceResult = {
  added: number
  optedOut: number
  total: number
}

/**
 * Replace a draft's recipient list with the people the filter now selects.
 *
 * Only ever called on a broadcast that has not started. Rebuilding the list of
 * one that has would either re-queue people already messaged or delete the
 * record of who was, and both are worse than refusing.
 */
export async function rebuildRecipients(
  broadcastId: string,
  candidates: Candidate[],
): Promise<AudienceResult> {
  const db = getDb()

  const broadcast = await getBroadcast(broadcastId)
  if (!broadcast) throw new Error('That broadcast no longer exists.')
  if (broadcast.status === 'sending' || broadcast.status === 'completed') {
    throw new Error(`The audience of a ${broadcast.status} broadcast cannot be rebuilt.`)
  }

  const suppressed = await optedOutPhones(candidates.map((candidate) => candidate.phone))
  const sendable = candidates.filter((candidate) => !suppressed.has(candidate.phone))

  await db.delete(broadcastRecipients).where(eq(broadcastRecipients.broadcastId, broadcastId))

  /* Chunked: a single insert of several thousand rows exceeds the parameter
     limit the driver will bind, and fails as an opaque protocol error rather
     than as "too many". */
  for (let index = 0; index < sendable.length; index += 500) {
    const slice = sendable.slice(index, index + 500)
    await db
      .insert(broadcastRecipients)
      .values(
        slice.map((candidate) => ({
          id: randomUUID(),
          broadcastId,
          phone: candidate.phone,
          name: candidate.name,
          courseTitle: candidate.courseTitle,
          leadId: candidate.leadId,
        })),
      )
      /* The unique index is the real dedupe. This makes a repeat harmless
         rather than fatal — two admins pressing "rebuild" at once is a
         collision, not an error worth surfacing. */
      .onConflictDoNothing()
  }

  return {
    added: sendable.length,
    optedOut: candidates.length - sendable.length,
    total: candidates.length,
  }
}

/* ---------------------------------------------------------------------------
 * Recipients
 * ------------------------------------------------------------------------ */

export async function listRecipients(
  broadcastId: string,
  options: { status?: BroadcastRecipientStatus; limit?: number } = {},
): Promise<BroadcastRecipientRow[]> {
  const clauses: SQL[] = [eq(broadcastRecipients.broadcastId, broadcastId)]
  if (options.status) clauses.push(eq(broadcastRecipients.status, options.status))

  return getDb()
    .select()
    .from(broadcastRecipients)
    .where(and(...clauses))
    .orderBy(desc(broadcastRecipients.sentAt), broadcastRecipients.createdAt)
    .limit(options.limit ?? 500)
}

export type RecipientTotals = Record<BroadcastRecipientStatus, number> & { total: number }

export async function countRecipients(broadcastId: string): Promise<RecipientTotals> {
  const rows = await getDb()
    .select({ status: broadcastRecipients.status, value: count() })
    .from(broadcastRecipients)
    .where(eq(broadcastRecipients.broadcastId, broadcastId))
    .groupBy(broadcastRecipients.status)

  const totals: RecipientTotals = {
    queued: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  }

  for (const row of rows) {
    if (row.status in totals) totals[row.status] = row.value
    totals.total += row.value
  }

  return totals
}

/** Per-broadcast totals for the list screen, in one query rather than N. */
export async function countRecipientsForAll(): Promise<Map<string, RecipientTotals>> {
  const rows = await getDb()
    .select({
      broadcastId: broadcastRecipients.broadcastId,
      status: broadcastRecipients.status,
      value: count(),
    })
    .from(broadcastRecipients)
    .groupBy(broadcastRecipients.broadcastId, broadcastRecipients.status)

  const byBroadcast = new Map<string, RecipientTotals>()

  for (const row of rows) {
    const totals =
      byBroadcast.get(row.broadcastId) ??
      ({ queued: 0, sending: 0, sent: 0, failed: 0, skipped: 0, total: 0 } as RecipientTotals)

    if (row.status in totals) totals[row.status] = row.value
    totals.total += row.value
    byBroadcast.set(row.broadcastId, totals)
  }

  return byBroadcast
}

/**
 * Take the next batch of recipients, atomically.
 *
 * `FOR UPDATE SKIP LOCKED` is what makes this safe to call from the admin's
 * browser and a cron sweep at the same moment: the second caller steps over
 * the rows the first is holding instead of blocking on them or, worse, reading
 * them as still queued. The status flip and the selection are one statement,
 * so there is no window between "chosen" and "claimed".
 *
 * `attempts` is incremented on the claim rather than after the send, so a
 * worker that dies mid-send still burns an attempt. Otherwise a message that
 * crashes the process would be retried for ever.
 */
export type ClaimedRecipient = {
  id: string
  phone: string
  name: string | null
  courseTitle: string | null
  attempts: number
}

export async function claimRecipients(
  broadcastId: string,
  limit: number,
  maxAttempts: number,
): Promise<ClaimedRecipient[]> {
  /* Written out rather than built with the query builder: Drizzle has no
     expression for `FOR UPDATE SKIP LOCKED` inside an `UPDATE … WHERE id IN
     (SELECT …)`, and that clause is the entire safety property here. Column
     names are unqualified so they resolve to the subquery's own scope. */
  const rows = await getDb().execute<ClaimedRecipient>(sql`
    UPDATE ${broadcastRecipients}
    SET status = 'sending',
        attempts = attempts + 1,
        updated_at = now()
    WHERE id IN (
      SELECT id FROM ${broadcastRecipients}
      WHERE broadcast_id = ${broadcastId}
        AND status = 'queued'
        AND attempts < ${maxAttempts}
      ORDER BY created_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, phone, name, course_title AS "courseTitle", attempts
  `)

  return rows as unknown as ClaimedRecipient[]
}

/**
 * Return rows whose worker never came back.
 *
 * A serverless function can be stopped at any point — the admin closes the
 * tab, the platform reclaims the instance — and whatever it had claimed stays
 * `sending` for ever without this. Five minutes is comfortably longer than any
 * single send can take (the HTTP call times out at 20 seconds) and short
 * enough that a resumed broadcast does not visibly stall.
 */
export async function requeueStaleRecipients(broadcastId: string): Promise<number> {
  const rows = await getDb().execute<{ id: string }>(sql`
    UPDATE ${broadcastRecipients}
    SET status = 'queued', updated_at = now()
    WHERE broadcast_id = ${broadcastId}
      AND status = 'sending'
      AND updated_at < now() - interval '5 minutes'
    RETURNING id
  `)

  return (rows as unknown as { id: string }[]).length
}

export async function markRecipientSent(id: string, messageId?: string): Promise<void> {
  await getDb()
    .update(broadcastRecipients)
    .set({
      status: 'sent',
      messageId: messageId ?? null,
      deliveryStatus: 'sent',
      error: null,
      sentAt: new Date(),
      updatedAt: sql`now()`,
    })
    .where(eq(broadcastRecipients.id, id))
}

/**
 * A failure that may yet succeed goes back to `queued`; one that cannot goes
 * to `failed`. The error text is kept either way — a transient failure that
 * eventually succeeds still explains why a broadcast took twice as long.
 */
export async function markRecipientFailed(
  id: string,
  error: string,
  retryable: boolean,
): Promise<void> {
  await getDb()
    .update(broadcastRecipients)
    .set({
      status: retryable ? 'queued' : 'failed',
      error: error.slice(0, 2000),
      updatedAt: sql`now()`,
    })
    .where(eq(broadcastRecipients.id, id))
}

/** Never attempted, and deliberately so — opted out, or outside the window. */
export async function markRecipientSkipped(id: string, reason: string): Promise<void> {
  await getDb()
    .update(broadcastRecipients)
    .set({ status: 'skipped', error: reason.slice(0, 2000), updatedAt: sql`now()` })
    .where(eq(broadcastRecipients.id, id))
}

/** Put failed rows back in the queue so the admin can retry just those. */
export async function requeueFailed(broadcastId: string): Promise<number> {
  const rows = await getDb().execute<{ id: string }>(sql`
    UPDATE ${broadcastRecipients}
    SET status = 'queued', attempts = 0, error = NULL, updated_at = now()
    WHERE broadcast_id = ${broadcastId}
      AND status = 'failed'
    RETURNING id
  `)

  return (rows as unknown as { id: string }[]).length
}

/**
 * Apply a delivery receipt from the status webhook.
 *
 * Keyed on Meta's `wamid`, which is why it is stored. Receipts arrive out of
 * order — `read` can land before the `delivered` for the same message — so a
 * later receipt must never move the status backwards, or a message someone has
 * already read reverts to merely delivered.
 */
const DELIVERY_RANK: Record<BroadcastDeliveryStatus, number> = {
  sent: 0,
  delivered: 1,
  read: 2,
  // A failure is terminal and always wins, whenever it turns up.
  failed: 3,
}

export async function applyDeliveryStatus(
  messageId: string,
  status: BroadcastDeliveryStatus,
  error?: string | null,
): Promise<void> {
  const db = getDb()

  const [row] = await db
    .select({ id: broadcastRecipients.id, current: broadcastRecipients.deliveryStatus })
    .from(broadcastRecipients)
    .where(eq(broadcastRecipients.messageId, messageId))
    .limit(1)

  // Not ours: the bot's own replies produce receipts on the same webhook.
  if (!row) return

  const currentRank = row.current ? DELIVERY_RANK[row.current] : -1
  if (DELIVERY_RANK[status] <= currentRank) return

  await db
    .update(broadcastRecipients)
    .set({
      deliveryStatus: status,
      /* A message that fails after acceptance never reached anyone, so the row
         must stop counting as sent — the whole point of tracking receipts. */
      ...(status === 'failed' ? { status: 'failed' as const } : {}),
      ...(error ? { error: error.slice(0, 2000) } : {}),
      updatedAt: sql`now()`,
    })
    .where(eq(broadcastRecipients.id, row.id))
}

/* ---------------------------------------------------------------------------
 * The 24-hour customer service window
 * ------------------------------------------------------------------------ */

/**
 * When each of these numbers last messaged us.
 *
 * Free-form text only reaches someone inside 24 hours of their own last
 * message; outside it, Meta accepts the send and then fails the message. The
 * runner uses this to skip those recipients with a reason the admin can read,
 * rather than letting them fail one at a time with error 131047.
 *
 * The join is on digits only. `conversations.contact_phone` is stored in
 * display form with a `+`, recipients are stored as bare E.164 digits, and
 * comparing the two as text matches nothing at all — which would present as
 * every single recipient being outside the window.
 */
export async function lastInboundAt(phones: string[]): Promise<Map<string, Date>> {
  if (!phones.length) return new Map()

  /* `'\\D'` in this template literal is the two characters `\D` by the time
     Postgres sees them, which is the regex class the normalisation needs. */
  const digits = sql<string>`regexp_replace(${conversations.contactPhone}, '\\D', '', 'g')`

  const rows = await getDb()
    .select({ phone: digits, lastAt: sql<Date>`max(${conversationMessages.createdAt})` })
    .from(conversations)
    .innerJoin(conversationMessages, eq(conversationMessages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.channel, 'whatsapp'),
        isNotNull(conversations.contactPhone),
        eq(conversationMessages.role, 'user'),
        inArray(digits, phones),
      ),
    )
    .groupBy(digits)

  const byPhone = new Map<string, Date>()
  for (const row of rows) {
    if (row.phone && row.lastAt) byPhone.set(row.phone, new Date(row.lastAt))
  }

  return byPhone
}

/* ---------------------------------------------------------------------------
 * Opt-outs
 * ------------------------------------------------------------------------ */

export async function optedOutPhones(phones: string[]): Promise<Set<string>> {
  if (!phones.length) return new Set()

  const rows = await getDb()
    .select({ phone: whatsappOptOuts.phone })
    .from(whatsappOptOuts)
    .where(inArray(whatsappOptOuts.phone, phones))

  return new Set(rows.map((row) => row.phone))
}

/**
 * Record an opt-out. Idempotent, because "STOP" sent three times in a row is
 * one instruction, and because the first request is the one whose timestamp
 * and wording are worth keeping.
 */
export async function recordOptOut(
  phone: string,
  reason: string,
  source: 'inbound-stop' | 'admin' = 'inbound-stop',
): Promise<void> {
  const normalised = normalisePhone(phone)
  if (!normalised) return

  await getDb()
    .insert(whatsappOptOuts)
    .values({ id: randomUUID(), phone: normalised, reason: reason.slice(0, 191), source })
    .onConflictDoNothing({ target: whatsappOptOuts.phone })
}

export async function removeOptOut(phone: string): Promise<void> {
  await getDb().delete(whatsappOptOuts).where(eq(whatsappOptOuts.phone, phone))
}

export async function listOptOuts(limit = 500) {
  return getDb()
    .select()
    .from(whatsappOptOuts)
    .orderBy(desc(whatsappOptOuts.createdAt))
    .limit(limit)
}

export async function countOptOuts(): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(whatsappOptOuts)
  return row?.value ?? 0
}
