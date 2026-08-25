import type { SimpleField } from '@/components/admin/simple-form'
import type { TestimonialFormValues } from '@/lib/admin/schemas'

import { uploadTestimonialAvatar } from './actions'

/** Shared by the create and edit screens so the two cannot drift apart. */
export const testimonialFields: SimpleField<TestimonialFormValues>[] = [
  { name: 'name', label: 'Student name', required: true, placeholder: 'Muhammad Hamza' },
  { name: 'role', label: 'Current role', required: true, placeholder: 'Freelance Web Developer' },
  { name: 'course', label: 'Course taken', required: true, placeholder: 'Full-Stack Web Development' },
  {
    name: 'courseSlug',
    label: 'Course slug',
    required: true,
    placeholder: 'web-development',
    hint: 'Links the quote to the course page.',
  },
  { name: 'city', label: 'City', required: true, placeholder: 'Faisalabad' },
  {
    name: 'avatar',
    label: 'Avatar',
    type: 'image',
    required: true,
    uploadAction: uploadTestimonialAvatar,
    hint: 'Upload a photo, or paste an existing path.',
  },
  { name: 'rating', label: 'Rating (1–5)', type: 'number', required: true, min: 1, max: 5 },
  { name: 'outcome', label: 'Outcome', required: true, placeholder: 'Earning $1,800+/month' },
  { name: 'quote', label: 'Quote', type: 'textarea', rows: 4, required: true },
  {
    name: 'story',
    label: 'Long-form story',
    type: 'textarea',
    rows: 6,
    hint: 'Optional. Only testimonials with a story appear on the Success Stories page.',
  },
  { name: 'featured', label: 'Feature on the homepage', type: 'checkbox', full: true },
]
