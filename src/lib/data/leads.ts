import 'server-only'

import { randomUUID } from 'node:crypto'

import { and, count, desc, eq, gte, ilike, or, sql, type SQL } from 'drizzle-orm'

import { getDb } from '@/db'
import {
  LEAD_CHANNELS,
  leads,
  type LeadChannel,
  type LeadRow,
  type LeadStatus,
} from '@/db/schema'

export type NewLead = {
  name: string
  phone: string
  email: string
  courseSlug: string
  courseTitle: string
  message: string
  source?: string
  campaign?: string
}

/**
 * The id is generated here rather than by the database so it is known before
 * the write, and `RETURNING` hands back the stored row — including the
 * defaults and timestamps the insert did not supply — in the same round trip.
 */
export async function createLead(input: NewLead): Promise<LeadRow> {
  const [row] = await getDb()
    .insert(leads)
    .values({ id: randomUUID(), ...input })
    .returning()

  return row
}

/**
 * Record an enquiry that arrived over a chat channel.
 *
 * Keyed on `externalRef` — the sending system's own id for the person, such as
 * a WhatsApp contact or an assistant conversation reference. Someone messaging
 * the WhatsApp number sends a first message, then a second, then ten more, and
 * Meta redelivers anything it is not certain was received; every one of those
 * arrives here. Inserting per message would turn one enquirer into a screenful
 * of identical rows, which is how a shared inbox stops being read.
 *
 * So the reference decides: first message creates the lead, everything after it
 * updates the same row. Later messages fill in details the first one lacked —
 * a profile name, a phone number, a course they eventually mention — but never
 * overwrite something with nothing, because a media message with no caption
 * must not blank the question that came before it.
 */
export type ChannelLead = {
  channel: LeadChannel
  /** The sender's id on that channel. Also stored as `handle`. */
  externalRef: string
  handle?: string | null
  name?: string | null
  phone?: string | null
  email?: string | null
  message?: string | null
  courseSlug?: string
  courseTitle?: string
  source: string
  campaign?: string | null
}

export async function upsertChannelLead(input: ChannelLead): Promise<void> {
  const db = getDb()

  /* `set` carries only the columns that have a value, so a later message
     cannot erase what an earlier one established. `ON CONFLICT … DO UPDATE` is
     a single round trip and is atomic against the unique index, which matters
     because webhook deliveries for the same person can overlap. */
  const update: Record<string, unknown> = { updatedAt: sql`now()` }
  if (input.name) update.name = input.name
  if (input.phone) update.phone = input.phone
  if (input.email) update.email = input.email
  if (input.message) update.message = input.message
  if (input.courseSlug) update.courseSlug = input.courseSlug
  if (input.courseTitle) update.courseTitle = input.courseTitle
  if (input.handle) update.handle = input.handle

  await db
    .insert(leads)
    .values({
      id: randomUUID(),
      channel: input.channel,
      externalRef: input.externalRef,
      handle: input.handle ?? input.externalRef,
      name: input.name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      message: input.message ?? null,
      ...(input.courseSlug ? { courseSlug: input.courseSlug } : {}),
      ...(input.courseTitle ? { courseTitle: input.courseTitle } : {}),
      source: input.source,
      campaign: input.campaign ?? null,
    })
    /* Targeted at `external_ref` specifically. MySQL's ON DUPLICATE KEY UPDATE
       fired on whichever unique index happened to be violated; Postgres makes
       the conflict target explicit, and this is the only one that can collide —
       `id` is a fresh uuid on every call. */
    .onConflictDoUpdate({ target: leads.externalRef, set: update })
}

export type LeadFilters = {
  /** Matches name, email, phone, handle or message. */
  search?: string
  courseSlug?: string
  status?: LeadStatus
  channel?: LeadChannel
}

function buildWhere(filters: LeadFilters): SQL | undefined {
  const clauses: SQL[] = []

  if (filters.search) {
    /* `ilike`, not `like`. Under MySQL every column collated as
       utf8mb4_unicode_ci, so `LIKE` was case-insensitive and the distinction
       never came up. Postgres compares text exactly, so a plain `LIKE` here
       would quietly stop matching "Ahmed" when the admin typed "ahmed" — a
       search box that returns nothing looks like a lead that was never
       captured, which is the worst way for this to fail. */
    const term = `%${filters.search}%`
    const match = or(
      ilike(leads.name, term),
      ilike(leads.email, term),
      ilike(leads.phone, term),
      ilike(leads.handle, term),
      ilike(leads.message, term),
    )
    if (match) clauses.push(match)
  }

  if (filters.courseSlug) clauses.push(eq(leads.courseSlug, filters.courseSlug))
  if (filters.status) clauses.push(eq(leads.status, filters.status))
  if (filters.channel) clauses.push(eq(leads.channel, filters.channel))

  return clauses.length > 0 ? and(...clauses) : undefined
}

export async function listLeads(filters: LeadFilters = {}, limit = 500): Promise<LeadRow[]> {
  return getDb()
    .select()
    .from(leads)
    .where(buildWhere(filters))
    .orderBy(desc(leads.createdAt))
    .limit(limit)
}

export async function countLeads(filters: LeadFilters = {}): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(leads).where(buildWhere(filters))
  return row?.value ?? 0
}

/** Leads received in the last `days` days — powers the dashboard tile. */
export async function countLeadsSince(days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000)
  const [row] = await getDb()
    .select({ value: count() })
    .from(leads)
    .where(gte(leads.createdAt, since))

  return row?.value ?? 0
}

/**
 * How many leads arrived on each channel. Channels with none are still
 * returned as zero — "WhatsApp: 0" is information, and a row that vanishes when
 * empty makes a channel that has silently stopped delivering look like a
 * channel that was never set up.
 */
export async function countLeadsByChannel(): Promise<Record<LeadChannel, number>> {
  const rows = await getDb()
    .select({ channel: leads.channel, value: count() })
    .from(leads)
    .groupBy(leads.channel)

  const totals = Object.fromEntries(LEAD_CHANNELS.map((c) => [c, 0])) as Record<
    LeadChannel,
    number
  >
  for (const row of rows) {
    if (row.channel in totals) totals[row.channel] = row.value
  }
  return totals
}

export async function countLeadsByStatus(): Promise<Record<LeadStatus, number>> {
  const rows = await getDb()
    .select({ status: leads.status, value: count() })
    .from(leads)
    .groupBy(leads.status)

  const totals = { new: 0, contacted: 0, enrolled: 0, closed: 0 }
  for (const row of rows) totals[row.status] = row.value
  return totals
}

export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
  await getDb()
    .update(leads)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(leads.id, id))
}

export async function setLeadNotes(id: string, notes: string): Promise<void> {
  await getDb()
    .update(leads)
    .set({ notes: notes.trim() || null, updatedAt: sql`now()` })
    .where(eq(leads.id, id))
}

export async function deleteLead(id: string): Promise<void> {
  await getDb().delete(leads).where(eq(leads.id, id))
}
