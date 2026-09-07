'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { plans } from '@/db/schema'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { planFormSchema, toPlanInput, type PlanFormValues } from '@/lib/admin/schemas'
import { revalidatePlans } from '@/lib/data/revalidate'

/**
 * Plan mutations.
 *
 * Same shape as every other admin resource: re-validate with the schema the
 * browser used, write, then drop the cache tag and the pre-rendered /pricing
 * HTML so the public page picks the change up.
 */

export async function createPlan(values: PlanFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const input = toPlanInput(planFormSchema.parse(values))

    const db = getDb()
    const [last] = await db.select({ max: sql<number | null>`max(${plans.sortOrder})` }).from(plans)

    await db.insert(plans).values({
      id: randomUUID(),
      sortOrder: (last?.max ?? 0) + 1,
      ...input,
    })

    revalidatePlans()
  })
}

export async function updatePlan(id: string, values: PlanFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const input = toPlanInput(planFormSchema.parse(values))

    await getDb()
      .update(plans)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(plans.id, id))

    revalidatePlans()
  })
}

/**
 * Deleting a plan does not delete the subscriptions sold under it — those carry
 * their own `planSlug` and `planName` snapshots precisely so they survive this.
 * A student's billing history stays readable after the plan is withdrawn.
 *
 * Prefer unticking "active" all the same: that withdraws it from /pricing while
 * leaving the row for anything that still points at it.
 */
export async function deletePlan(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getDb().delete(plans).where(eq(plans.id, id))
    revalidatePlans()
  })
}

/** Sale on/off, flipped straight from the list screen. */
export async function togglePlanActive(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await getDb().update(plans).set({ active, updatedAt: new Date() }).where(eq(plans.id, id))
    revalidatePlans()
  })
}
