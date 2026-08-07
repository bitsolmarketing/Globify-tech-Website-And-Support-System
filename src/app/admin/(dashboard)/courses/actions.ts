'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { courses } from '@/db/schema'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { courseFormSchema, toCourseInput, type CourseFormValues } from '@/lib/admin/schemas'
import { revalidateCourses } from '@/lib/data/revalidate'

/**
 * Course mutations.
 *
 * Each one re-validates with the same zod schema the browser used — the client
 * check is a convenience, this is the one that counts — then revalidates the
 * cache tag and the pre-rendered pages so the public site picks the edit up.
 */

export async function createCourse(values: CourseFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = courseFormSchema.parse(values)
    const input = toCourseInput(parsed)

    const db = getDb()

    /* New courses go to the end of the catalogue ordering. */
    const [last] = await db
      .select({ max: sql<number | null>`max(${courses.sortOrder})` })
      .from(courses)

    await db.insert(courses).values({
      id: randomUUID(),
      sortOrder: (last?.max ?? 0) + 1,
      ...input,
    })

    revalidateCourses()
  })
}

export async function updateCourse(id: string, values: CourseFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = courseFormSchema.parse(values)
    const input = toCourseInput(parsed)

    await getDb()
      .update(courses)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(courses.id, id))

    revalidateCourses()
  })
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getDb().delete(courses).where(eq(courses.id, id))
    revalidateCourses()
  })
}

/** Homepage feature toggle, flipped straight from the list screen. */
export async function toggleCourseFeatured(id: string, featured: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await getDb()
      .update(courses)
      .set({ featured, updatedAt: new Date() })
      .where(eq(courses.id, id))

    revalidateCourses()
  })
}
