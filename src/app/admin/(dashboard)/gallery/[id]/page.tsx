import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { SimpleForm } from '@/components/admin/simple-form'
import { getDb } from '@/db'
import { galleryItems } from '@/db/schema'
import { galleryFormSchema, type GalleryFormValues } from '@/lib/admin/schemas'

import { deleteGalleryItem, updateGalleryItem } from '../actions'
import { galleryFields } from '../fields'

type Params = { id: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const [row] = await getDb()
    .select({ caption: galleryItems.caption })
    .from(galleryItems)
    .where(eq(galleryItems.id, id))
    .limit(1)

  return { title: row?.caption ?? 'Gallery image' }
}

export default async function EditGalleryItemPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const [row] = await getDb()
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.id, id))
    .limit(1)

  if (!row) notFound()

  async function save(values: GalleryFormValues) {
    'use server'
    return updateGalleryItem(id, values)
  }

  return (
    <>
      <AdminPageHeader
        title={row.caption}
        description={row.src}
        backHref="/admin/gallery"
        backLabel="Gallery"
        actions={
          <DeleteButton
            label={`Delete ${row.caption}`}
            itemName={row.caption}
            redirectTo="/admin/gallery"
            onDelete={deleteGalleryItem.bind(null, id)}
          />
        }
      />

      <SimpleForm
        schema={galleryFormSchema}
        fields={galleryFields}
        sectionTitle="Image"
        defaultValues={{
          src: row.src,
          alt: row.alt,
          caption: row.caption,
          category: row.category,
          width: row.width,
          height: row.height,
        }}
        onSubmitAction={save}
        cancelHref="/admin/gallery"
        submitLabel="Save image"
        successMessage="Gallery image updated"
      />
    </>
  )
}
