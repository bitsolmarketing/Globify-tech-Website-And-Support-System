import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'

import { createGalleryItem } from '../actions'
import { galleryFields } from '../fields'
import { GalleryForm } from '../gallery-form'

export const metadata: Metadata = { title: 'New gallery image' }

export default function NewGalleryItemPage() {
  return (
    <>
      <AdminPageHeader title="New gallery image" backHref="/admin/gallery" backLabel="Gallery" />

      <GalleryForm
        fields={galleryFields}
        sectionTitle="Image"
        sectionDescription="Shown on /gallery and in the homepage preview strip."
        defaultValues={{
          src: '/images/generated/gallery/gallery-01.webp',
          alt: '',
          caption: '',
          category: 'Campus',
          width: 1200,
          height: 900,
        }}
        onSubmitAction={createGalleryItem}
        cancelHref="/admin/gallery"
        submitLabel="Add image"
        successMessage="Gallery image added"
      />
    </>
  )
}
