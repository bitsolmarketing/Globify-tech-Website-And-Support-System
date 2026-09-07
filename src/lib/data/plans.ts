import 'server-only'

import { cache } from 'react'
import { asc, eq } from 'drizzle-orm'

import { getDb } from '@/db'
import { plans as plansTable, type PlanRow } from '@/db/schema'
import { plans as seedPlans, type Plan } from '@/lib/plans'

import { dbRead, TAGS } from './cache'

/**
 * Two or three rows. Same arrangement as `./courses`: load the table whole,
 * derive in memory, and fall back to the seed array so /pricing renders on a
 * fresh clone with no database.
 */
export function toPlan(row: PlanRow): Plan {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compareAtPrice ?? undefined,
    interval: row.interval,
    features: row.features,
    badge: row.badge ?? undefined,
    featured: row.featured,
    active: row.active,
  }
}

const load = dbRead({
  key: 'plans:all',
  tags: [TAGS.plans],
  load: async () =>
    getDb().select().from(plansTable).orderBy(asc(plansTable.sortOrder), asc(plansTable.price)),
  fallback: (): PlanRow[] => [],
})

/** Every plan, including inactive ones — the admin list screen wants those. */
export const getAllPlans = cache(async (): Promise<Plan[]> => {
  const rows = await load()
  return rows.length > 0 ? rows.map(toPlan) : seedPlans
})

/** What /pricing renders. An inactive plan is not for sale and is not shown. */
export const getPlans = cache(async (): Promise<Plan[]> => {
  return (await getAllPlans()).filter((plan) => plan.active)
})

export const getPlanBySlug = cache(async (slug: string): Promise<Plan | undefined> => {
  return (await getAllPlans()).find((plan) => plan.slug === slug)
})

/**
 * The row itself, read straight past the cache.
 *
 * Checkout needs the `id` to hang a subscription off, and `Plan` deliberately
 * does not carry one — it is the shape the public site renders, and the seed
 * fallback has no ids to give. Anything that writes must go through this and
 * accept that it fails without a database, which is correct: there is nothing
 * to sell a subscription against when the catalogue is a hardcoded array.
 */
export async function getPlanRowBySlug(slug: string): Promise<PlanRow | undefined> {
  const [row] = await getDb().select().from(plansTable).where(eq(plansTable.slug, slug)).limit(1)
  return row
}

/**
 * Every plan row, for the admin.
 *
 * Past the cache on purpose: the admin edits these, and reading them through
 * the same tagged cache the public page uses means a save is followed by a list
 * that may still show the old values until the tag sweep lands.
 */
export async function listPlanRows(): Promise<PlanRow[]> {
  return getDb()
    .select()
    .from(plansTable)
    .orderBy(asc(plansTable.sortOrder), asc(plansTable.price))
}

export async function getPlanRowById(id: string): Promise<PlanRow | undefined> {
  const [row] = await getDb().select().from(plansTable).where(eq(plansTable.id, id)).limit(1)
  return row
}
