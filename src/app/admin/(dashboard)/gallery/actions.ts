'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { galleryItems } from '@/db/schema'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { galleryFormSchema, type GalleryFormValues } from '@/lib/admin/schemas'
import { revalidateGallery } from '@/lib/data/revalidate'

export async function createGalleryItem(values: GalleryFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = galleryFormSchema.parse(values)

    const db = getDb()
    const [last] = await db
      .select({ max: sql<number | null>`max(${galleryItems.sortOrder})` })
      .from(galleryItems)

    await db.insert(galleryItems).values({
      id: randomUUID(),
      sortOrder: (last?.max ?? 0) + 1,
      ...parsed,
    })

    revalidateGallery()
  })
}

export async function updateGalleryItem(
  id: string,
  values: GalleryFormValues,
): Promise<ActionResult> {
  return runAction(async () => {
    await getDb()
      .update(galleryItems)
      .set({ ...galleryFormSchema.parse(values), updatedAt: new Date() })
      .where(eq(galleryItems.id, id))

    revalidateGallery()
  })
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getDb().delete(galleryItems).where(eq(galleryItems.id, id))
    revalidateGallery()
  })
}
