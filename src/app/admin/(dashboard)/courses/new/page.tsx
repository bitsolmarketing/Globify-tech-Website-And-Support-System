import type { Metadata } from 'next'

import { CourseForm } from '@/components/admin/course-form'
import { AdminPageHeader } from '@/components/admin/page-header'
import { getAuthors } from '@/lib/data/authors'
import { emptyCourseFormValues } from '@/lib/admin/schemas'

import { createCourse } from '../actions'

export const metadata: Metadata = { title: 'New course' }

export default async function NewCoursePage() {
  const authors = await getAuthors()

  const instructors = authors.map((author) => ({
    value: author.slug,
    label: `${author.name} — ${author.role}`,
  }))

  return (
    <>
      <AdminPageHeader
        title="New course"
        description="Everything here is required. The course goes live on the public catalogue as soon as you save."
        backHref="/admin/courses"
        backLabel="All courses"
      />

      <CourseForm
        defaultValues={{
          ...emptyCourseFormValues,
          instructorSlug: instructors[0]?.value ?? '',
        }}
        instructors={instructors}
        onSubmitAction={createCourse}
        submitLabel="Create course"
        successMessage="Course created"
      />
    </>
  )
}
