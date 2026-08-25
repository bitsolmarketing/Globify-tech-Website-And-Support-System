'use server'

import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { galleryItems } from '@/db/schema'
import { requireAdmin, runAction, type ActionResult } from '@/lib/admin/guard'
import { saveUploadedImage, type UploadResult } from '@/lib/admin/image-upload'
import { galleryFormSchema, type GalleryFormValues } from '@/lib/admin/schemas'
import { revalidateGallery } from '@/lib/data/revalidate'

export async function uploadGalleryImage(formData: FormData): Promise<UploadResult> {
  try {
    await requireAdmin()

    const file = formData.get('file')
    if (!(file instanceof File)) return { ok: false, error: 'No file was received.' }

    return await saveUploadedImage(file, 'gallery')
  } catch (error) {
    console.error('[admin] gallery image upload failed', error)
    const message =
      error instanceof Error ? error.message : 'Could not process that image. Try a different file.'
    return { ok: false, error: message }
  }
}

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
