'use server'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { eq, sql } from 'drizzle-orm'
import sharp from 'sharp'

import { getDb } from '@/db'
import { courses } from '@/db/schema'
import { requireAdmin, runAction, type ActionResult } from '@/lib/admin/guard'
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

export type UploadResult = { ok: true; path: string } | { ok: false; error: string }

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])

/**
 * Saves an admin-picked file for a course card image.
 *
 * Re-encoded to WebP and capped at 1600px so a phone photo doesn't ship
 * multi-megabyte JPEGs to the catalogue — same treatment the placeholder art
 * in scripts/generate-images.mjs gets. Written under public/images/uploads,
 * which is gitignored (see .gitignore) so the file exists only on the
 * server's disk — deploy.sh refuses to run against an uncommitted change, so
 * this directory must never be tracked.
 */
export async function uploadCourseImage(formData: FormData): Promise<UploadResult> {
  try {
    await requireAdmin()

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return { ok: false, error: 'No file was received.' }
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: 'Choose a JPEG, PNG, WebP, AVIF or GIF image.' }
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, error: 'That image is too large — the limit is 8MB.' }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const webp = await sharp(buffer)
      .rotate()
      .resize(1600, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const dir = path.join(process.cwd(), 'public', 'images', 'uploads', 'courses')
    await mkdir(dir, { recursive: true })

    const filename = `${randomUUID()}.webp`
    await writeFile(path.join(dir, filename), webp)

    return { ok: true, path: `/images/uploads/courses/${filename}` }
  } catch (error) {
    console.error('[admin] course image upload failed', error)
    const message =
      error instanceof Error ? error.message : 'Could not process that image. Try a different file.'
    return { ok: false, error: message }
  }
}
