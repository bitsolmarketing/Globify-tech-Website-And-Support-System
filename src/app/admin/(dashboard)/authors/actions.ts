'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { authors, courses } from '@/db/schema'
import { requireAdmin, runAction, type ActionResult } from '@/lib/admin/guard'
import { saveUploadedImage, type UploadResult } from '@/lib/admin/image-upload'
import { authorFormSchema, toAuthorInput, type AuthorFormValues } from '@/lib/admin/schemas'
import { revalidateAuthors } from '@/lib/data/revalidate'

export async function uploadAuthorAvatar(formData: FormData): Promise<UploadResult> {
  try {
    await requireAdmin()

    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'No file was received.' }

    return await saveUploadedImage(file, 'authors', { width: 400, height: 400 })
  } catch (error) {
    console.error('[admin] author avatar upload failed', error)
    const message =
      error instanceof Error ? error.message : 'Could not process that image. Try a different file.'
    return { ok: false, error: message }
  }
}

export async function createAuthor(values: AuthorFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const input = toAuthorInput(authorFormSchema.parse(values))

    const db = getDb()
    const [last] = await db
      .select({ max: sql<number | null>`max(${authors.sortOrder})` })
      .from(authors)

    await db.insert(authors).values({
      id: randomUUID(),
      sortOrder: (last?.max ?? 0) + 1,
      ...input,
    })

    revalidateAuthors()
  })
}

export async function updateAuthor(id: string, values: AuthorFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const input = toAuthorInput(authorFormSchema.parse(values))

    await getDb()
      .update(authors)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(authors.id, id))

    revalidateAuthors()
  })
}

export async function deleteAuthor(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const db = getDb()

    const [author] = await db
      .select({ slug: authors.slug })
      .from(authors)
      .where(eq(authors.id, id))
      .limit(1)

    if (!author) throw new Error('That author no longer exists.')

    /* Courses reference an instructor by slug rather than by a foreign key, so
       the orphan check has to happen here — deleting a teaching instructor
       would otherwise leave course pages with no instructor block. */
    const assigned = await db
      .select({ title: courses.title })
      .from(courses)
      .where(eq(courses.instructorSlug, author.slug))

    if (assigned.length > 0) {
      throw new Error(
        `${author.slug} still teaches ${assigned.length} course${assigned.length === 1 ? '' : 's'} (${assigned
          .map((course) => course.title)
          .join(', ')}). Reassign them first.`,
      )
    }

    await db.delete(authors).where(eq(authors.id, id))
    revalidateAuthors()
  })
}
