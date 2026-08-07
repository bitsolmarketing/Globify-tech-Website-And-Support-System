'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { faqs } from '@/db/schema'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { faqFormSchema, type FaqFormValues } from '@/lib/admin/schemas'
import { revalidateFaqs } from '@/lib/data/revalidate'

export async function createFaq(values: FaqFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = faqFormSchema.parse(values)

    const db = getDb()
    const [last] = await db.select({ max: sql<number | null>`max(${faqs.sortOrder})` }).from(faqs)

    await db.insert(faqs).values({
      id: randomUUID(),
      sortOrder: (last?.max ?? 0) + 1,
      ...parsed,
    })

    revalidateFaqs()
  })
}

export async function updateFaq(id: string, values: FaqFormValues): Promise<ActionResult> {
  return runAction(async () => {
    await getDb()
      .update(faqs)
      .set({ ...faqFormSchema.parse(values), updatedAt: new Date() })
      .where(eq(faqs.id, id))

    revalidateFaqs()
  })
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getDb().delete(faqs).where(eq(faqs.id, id))
    revalidateFaqs()
  })
}
