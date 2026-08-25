'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { testimonials } from '@/db/schema'
import { requireAdmin, runAction, type ActionResult } from '@/lib/admin/guard'
import { saveUploadedImage, type UploadResult } from '@/lib/admin/image-upload'
import { testimonialFormSchema, type TestimonialFormValues } from '@/lib/admin/schemas'
import { revalidateTestimonials } from '@/lib/data/revalidate'

export async function uploadTestimonialAvatar(formData: FormData): Promise<UploadResult> {
  try {
    await requireAdmin()

    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'No file was received.' }

    return await saveUploadedImage(file, 'testimonials', { width: 400, height: 400 })
  } catch (error) {
    console.error('[admin] testimonial avatar upload failed', error)
    const message =
      error instanceof Error ? error.message : 'Could not process that image. Try a different file.'
    return { ok: false, error: message }
  }
}

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
