import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'

import { createTestimonial } from '../actions'
import { testimonialFields } from '../fields'
import { TestimonialForm } from '../testimonial-form'

export const metadata: Metadata = { title: 'New testimonial' }

export default function NewTestimonialPage() {
  return (
    <>
      <AdminPageHeader
        title="New testimonial"
        backHref="/admin/testimonials"
        backLabel="All testimonials"
      />

      <TestimonialForm
        fields={testimonialFields}
        sectionTitle="Student quote"
        sectionDescription="Quotes appear on the homepage and the Success Stories page."
        defaultValues={{
          name: '',
          role: '',
          course: '',
          courseSlug: '',
          city: 'Faisalabad',
          avatar: '/images/generated/students/student-01.webp',
          rating: 5,
          quote: '',
          story: '',
          outcome: '',
          featured: false,
        }}
        onSubmitAction={createTestimonial}
        cancelHref="/admin/testimonials"
        submitLabel="Create testimonial"
        successMessage="Testimonial created"
      />
    </>
  )
}
