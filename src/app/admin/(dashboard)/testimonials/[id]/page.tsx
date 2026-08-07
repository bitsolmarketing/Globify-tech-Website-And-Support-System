import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { SimpleForm } from '@/components/admin/simple-form'
import { getDb } from '@/db'
import { testimonials } from '@/db/schema'
import { testimonialFormSchema, type TestimonialFormValues } from '@/lib/admin/schemas'

import { deleteTestimonial, updateTestimonial } from '../actions'
import { testimonialFields } from '../fields'

type Params = { id: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const [row] = await getDb()
    .select({ name: testimonials.name })
    .from(testimonials)
    .where(eq(testimonials.id, id))
    .limit(1)

  return { title: row?.name ?? 'Testimonial' }
}

export default async function EditTestimonialPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const [row] = await getDb()
    .select()
    .from(testimonials)
    .where(eq(testimonials.id, id))
    .limit(1)

  if (!row) notFound()

  async function save(values: TestimonialFormValues) {
    'use server'
    return updateTestimonial(id, values)
  }

  return (
    <>
      <AdminPageHeader
        title={row.name}
        description={`${row.role} · ${row.course}`}
        backHref="/admin/testimonials"
        backLabel="All testimonials"
        actions={
          <DeleteButton
            label={`Delete testimonial from ${row.name}`}
            itemName={`Testimonial from ${row.name}`}
            redirectTo="/admin/testimonials"
            onDelete={deleteTestimonial.bind(null, id)}
          />
        }
      />

      <SimpleForm
        schema={testimonialFormSchema}
        fields={testimonialFields}
        sectionTitle="Student quote"
        defaultValues={{
          name: row.name,
          role: row.role,
          course: row.course,
          courseSlug: row.courseSlug,
          city: row.city,
          avatar: row.avatar,
          rating: row.rating,
          quote: row.quote,
          story: row.story ?? '',
          outcome: row.outcome,
          featured: row.featured,
        }}
        onSubmitAction={save}
        cancelHref="/admin/testimonials"
        submitLabel="Save testimonial"
        successMessage="Testimonial updated"
      />
    </>
  )
}
