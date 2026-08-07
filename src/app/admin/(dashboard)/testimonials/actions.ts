'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { testimonials } from '@/db/schema'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { testimonialFormSchema, type TestimonialFormValues } from '@/lib/admin/schemas'
import { revalidateTestimonials } from '@/lib/data/revalidate'

function toInput(values: TestimonialFormValues) {
  const parsed = testimonialFormSchema.parse(values)
  return {
    ...parsed,
    rating: parsed.rating as 1 | 2 | 3 | 4 | 5,
    story: parsed.story.trim() === '' ? null : parsed.story,
  }
}

export async function createTestimonial(values: TestimonialFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const db = getDb()
    const [last] = await db
      .select({ max: sql<number | null>`max(${testimonials.sortOrder})` })
      .from(testimonials)

    await db.insert(testimonials).values({
      id: randomUUID(),
      sortOrder: (last?.max ?? 0) + 1,
      ...toInput(values),
    })

    revalidateTestimonials()
  })
}

export async function updateTestimonial(
  id: string,
  values: TestimonialFormValues,
): Promise<ActionResult> {
  return runAction(async () => {
    await getDb()
      .update(testimonials)
      .set({ ...toInput(values), updatedAt: new Date() })
      .where(eq(testimonials.id, id))

    revalidateTestimonials()
  })
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getDb().delete(testimonials).where(eq(testimonials.id, id))
    revalidateTestimonials()
  })
}
