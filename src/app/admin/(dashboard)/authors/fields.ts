import type { SimpleField } from '@/components/admin/simple-form'
import type { AuthorFormValues } from '@/lib/admin/schemas'

/** Instructors double as blog authors, so one record feeds both. */
export const authorFields: SimpleField<AuthorFormValues>[] = [
  {
    name: 'slug',
    label: 'Slug',
    required: true,
    placeholder: 'usman-rafiq',
    hint: 'Used by /blog/author/<slug> and by each course’s instructor field.',
  },
  { name: 'name', label: 'Full name', required: true, placeholder: 'Usman Rafiq' },
  { name: 'role', label: 'Role', required: true, placeholder: 'Founder & Lead AI Instructor' },
  {
    name: 'credentials',
    label: 'Credentials',
    required: true,
    placeholder: 'AI Automation Consultant, ex-Product Engineer',
  },
  {
    name: 'avatar',
    label: 'Avatar path',
    required: true,
    placeholder: '/images/generated/authors/usman-rafiq.webp',
  },
  { name: 'yearsExperience', label: 'Years of experience', type: 'number', required: true, min: 0 },
  {
    name: 'bio',
    label: 'Short bio',
    type: 'textarea',
    rows: 3,
    required: true,
    hint: 'One or two sentences, shown on cards and in Person schema.',
  },
  {
    name: 'longBio',
    label: 'Long bio',
    type: 'textarea',
    rows: 8,
    required: true,
    hint: 'One paragraph per line.',
  },
  {
    name: 'expertise',
    label: 'Areas of expertise',
    type: 'textarea',
    rows: 5,
    required: true,
    hint: 'One per line.',
  },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'url', placeholder: 'https://linkedin.com/in/…' },
  { name: 'twitter', label: 'X / Twitter URL', type: 'url', placeholder: 'https://x.com/…' },
  { name: 'github', label: 'GitHub URL', type: 'url', placeholder: 'https://github.com/…' },
  { name: 'email', label: 'Public email', type: 'email', placeholder: 'name@globifytech.com' },
]
