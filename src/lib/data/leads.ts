import 'server-only'

import { randomUUID } from 'node:crypto'

import { and, count, desc, eq, gte, ilike, or, sql, type SQL } from 'drizzle-orm'

import { getDb } from '@/db'
import { leads, type LeadRow, type LeadStatus } from '@/db/schema'

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

export async function createLead(input: NewLead): Promise<LeadRow> {
  const [row] = await getDb()
    .insert(leads)
    .values({ id: randomUUID(), ...input })
    .returning()

  return row
}

export type LeadFilters = {
  /** Matches name, email, phone or message. */
  search?: string
  courseSlug?: string
  status?: LeadStatus
}

function buildWhere(filters: LeadFilters): SQL | undefined {
  const clauses: SQL[] = []

  if (filters.search) {
    const term = `%${filters.search}%`
    const match = or(
      ilike(leads.name, term),
      ilike(leads.email, term),
      ilike(leads.phone, term),
      ilike(leads.message, term),
    )
    if (match) clauses.push(match)
  }

  if (filters.courseSlug) clauses.push(eq(leads.courseSlug, filters.courseSlug))
  if (filters.status) clauses.push(eq(leads.status, filters.status))

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
