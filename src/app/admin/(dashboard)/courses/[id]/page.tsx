import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { eq } from 'drizzle-orm'

import { CourseForm } from '@/components/admin/course-form'
import { DeleteButton } from '@/components/admin/delete-button'
import { AdminPageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { getDb } from '@/db'
import { courses } from '@/db/schema'
import { courseToFormValues, type CourseFormValues } from '@/lib/admin/schemas'
import { getAuthors } from '@/lib/data/authors'
import { toCourse } from '@/lib/data/courses'

import { deleteCourse, updateCourse } from '../actions'

type Params = { id: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const [row] = await getDb()
    .select({ title: courses.title })
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1)

  return { title: row?.title ?? 'Course' }
}

export default async function EditCoursePage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const [[row], authors] = await Promise.all([
    getDb().select().from(courses).where(eq(courses.id, id)).limit(1),
    getAuthors(),
  ])

  if (!row) notFound()

  const instructors = authors.map((author) => ({
    value: author.slug,
    label: `${author.name} — ${author.role}`,
  }))

  /* If the assigned instructor was deleted, keep the value selectable so
     saving an unrelated edit does not silently reassign the course. */
  if (!instructors.some((option) => option.value === row.instructorSlug)) {
    instructors.unshift({
      value: row.instructorSlug,
      label: `${row.instructorSlug} (missing author)`,
    })
  }

  async function saveCourse(values: CourseFormValues) {
    'use server'
    return updateCourse(id, values)
  }

  return (
    <>
      <AdminPageHeader
        title={row.title}
        description={`Last updated ${row.updatedAt.toISOString().slice(0, 10)}.`}
        backHref="/admin/courses"
        backLabel="All courses"
        actions={
          <>
            <Button asChild variant="secondary" size="md">
              <Link href={`/courses/${row.slug}`} target="_blank" rel="noopener">
                View live
                <ExternalLink aria-hidden />
              </Link>
            </Button>
            <DeleteButton
              label={`Delete ${row.title}`}
              itemName={row.title}
              redirectTo="/admin/courses"
              onDelete={deleteCourse.bind(null, id)}
            />
          </>
        }
      />

      <CourseForm
        defaultValues={courseToFormValues(toCourse(row))}
        instructors={instructors}
        onSubmitAction={saveCourse}
        submitLabel="Save course"
        successMessage="Course updated"
      />
    </>
  )
}
