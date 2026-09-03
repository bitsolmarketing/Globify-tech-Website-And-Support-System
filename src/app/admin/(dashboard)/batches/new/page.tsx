import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AdminPageHeader } from '@/components/admin/page-header'
import { SimpleForm } from '@/components/admin/simple-form'
import { EmptyState } from '@/components/admin/table'
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/lib/admin/guard'
import { listCourseOptions, listPortalUsers } from '@/lib/data/portal'
import { batchSchema, type BatchValues } from '@/lib/portal/schemas'

import { createBatchAction } from '../actions'
import { batchFields } from '../batch-fields'

export const metadata: Metadata = { title: 'New batch' }

export default async function NewBatchPage() {
  const [courses, instructors] = await Promise.all([
    listCourseOptions(),
    listPortalUsers('instructor'),
  ])

  /* A batch without an instructor cannot be created — the column is not
     nullable and, more to the point, an unassigned cohort has nobody who can
     take a register for it. Say so rather than rendering an empty select. */
  if (instructors.length === 0) {
    return (
      <>
        <AdminPageHeader
          backHref="/admin/batches"
          backLabel="Batches"
          title="New batch"
        />
        <EmptyState
          title="No instructor accounts yet"
          description="Every batch needs an instructor to lead it. Create one first, then come back."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/admin/portal-users/new">Create an instructor account</Link>
            </Button>
          }
        />
      </>
    )
  }

  async function save(values: BatchValues): Promise<ActionResult> {
    'use server'
    const result = await createBatchAction(values)
    if (result.ok) redirect('/admin/batches')
    return result
  }

  return (
    <>
      <AdminPageHeader
        backHref="/admin/batches"
        backLabel="Batches"
        title="New batch"
        description="One delivery of a course to one group, on one timetable, led by one instructor."
      />

      <SimpleForm<BatchValues>
        schema={batchSchema as never}
        defaultValues={{
          courseId: courses[0]?.id ?? '',
          code: '',
          name: '',
          instructorId: instructors[0].id,
          startDate: '',
          endDate: '',
          schedule: '',
          mode: 'On-campus',
          capacity: 0,
          meetingUrl: '',
          status: 'upcoming',
          notes: '',
        }}
        fields={batchFields(courses, instructors)}
        sectionTitle="Batch"
        onSubmitAction={save}
        cancelHref="/admin/batches"
        submitLabel="Create batch"
        successMessage="Batch created"
        successDescription="Enrol students from the batch page."
      />
    </>
  )
}
