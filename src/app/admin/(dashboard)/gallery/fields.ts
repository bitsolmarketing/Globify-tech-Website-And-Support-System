import type { SimpleField } from '@/components/admin/simple-form'
import type { GalleryFormValues } from '@/lib/admin/schemas'

const CATEGORY_OPTIONS = ['Campus', 'Classes', 'Events', 'Students'].map((value) => ({
  value,
  label: value,
}))

export const galleryFields: SimpleField<GalleryFormValues>[] = [
  {
    name: 'src',
    label: 'Image path',
    required: true,
    full: true,
    placeholder: '/images/generated/gallery/gallery-01.webp',
    hint: 'Files live in public/. Run `npm run assets` after adding new source images.',
  },
  {
    name: 'alt',
    label: 'Alt text',
    type: 'textarea',
    rows: 2,
    required: true,
    hint: 'Describe the photo for screen readers and image search.',
  },
  { name: 'caption', label: 'Caption', required: true, placeholder: 'Web development lab in session' },
  { name: 'category', label: 'Category', type: 'select', required: true, options: CATEGORY_OPTIONS },
  {
    name: 'width',
    label: 'Width (px)',
    type: 'number',
    required: true,
    min: 1,
    hint: 'Intrinsic size — prevents layout shift.',
  },
  { name: 'height', label: 'Height (px)', type: 'number', required: true, min: 1 },
]
