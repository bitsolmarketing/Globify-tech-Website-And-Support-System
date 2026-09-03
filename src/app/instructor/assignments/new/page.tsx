import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { SimpleForm } from '@/components/admin/simple-form'
import type { ActionResult } from '@/lib/admin/guard'
import { createAssignment, listInstructorBatches } from '@/lib/data/instructor'
import { runPortalAction } from '@/lib/portal/guard'
import { assignmentWithBatchSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'New assignment' }

type AssignmentValues = {
  title: string
  brief: string
  attachmentUrl?: string
  dueAt: string
  maxScore: number
  weight: number
  allowLate: boolean
  publish: boolean
  batchId: string
}

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>
}) {
  const { batchId } = await searchParams
  const { id } = await requireInstructorAccount()

  const batches = await listInstructorBatches(id)
  if (batches.length === 0) notFound()

  /* The batch comes in as a query parameter, so it is checked against what
     this instructor actually teaches before it becomes a form default. */
  const selected = batches.find((row) => row.batch.id === batchId)?.batch ?? batches[0].batch

  async function save(values: AssignmentValues): Promise<ActionResult> {
    'use server'

    const result = await runPortalAction('instructor', async (user) => {
      const parsed = assignmentWithBatchSchema.safeParse(values)
      if (!parsed.success) throw new Error(parsed.error.issues[0].message)

      const dueAt = new Date(parsed.data.dueAt)
      if (Number.isNaN(dueAt.getTime())) throw new Error('That is not a valid deadline.')

      /* `createAssignment` re-checks ownership of this batch id — the select
         is a convenience, not the authorisation. */
      await createAssignment(user.id, parsed.data.batchId, {
        title: parsed.data.title,
        brief: parsed.data.brief,
        attachmentUrl: parsed.data.attachmentUrl || null,
        dueAt,
        maxScore: parsed.data.maxScore,
        weight: parsed.data.weight,
        allowLate: parsed.data.allowLate,
        publish: parsed.data.publish,
      })

      revalidatePath('/instructor/assignments')
      revalidatePath(`/instructor/batches/${parsed.data.batchId}`)
      revalidatePath('/instructor')
    })

    if (result.ok) redirect('/instructor/assignments')
    return result
  }

  return (
    <>
      <PageHeader
        backHref="/instructor/assignments"
        backLabel="All assignments"
        title="New assignment"
        description="Students see published assignments immediately. Leave it unpublished to keep working on the brief."
      />

      <SimpleForm<AssignmentValues>
        schema={assignmentWithBatchSchema as never}
        defaultValues={{
          title: '',
          brief: '',
          attachmentUrl: '',
          dueAt: '',
          maxScore: 100,
          weight: 1,
          allowLate: true,
          publish: true,
          batchId: selected.id,
        }}
        fields={[
          {
            name: 'batchId',
            label: 'Batch',
            type: 'select',
            required: true,
            options: batches.map((row) => ({
              value: row.batch.id,
              label: `${row.batch.name} — ${row.batch.courseTitle}`,
            })),
          },
          { name: 'title', label: 'Title', required: true, placeholder: 'Project 2 — REST API' },
          { name: 'dueAt', label: 'Deadline', type: 'datetime-local', required: true },
          {
            name: 'maxScore',
            label: 'Marks available',
            type: 'number',
            min: 1,
            max: 1000,
            required: true,
          },
          {
            name: 'weight',
            label: 'Weight',
            type: 'number',
            min: 0,
            max: 20,
            hint: 'Relative importance in the assignment average. 0 excludes it from the grade.',
          },
          {
            name: 'attachmentUrl',
            label: 'Reference material',
            type: 'url',
            full: true,
            hint: 'Optional — a starter repository, a spec, a dataset.',
          },
          {
            name: 'brief',
            label: 'The brief',
            type: 'textarea',
            rows: 10,
            required: true,
            hint: 'What you want them to build, how it will be judged, and what to hand in.',
          },
          {
            name: 'allowLate',
            label: 'Accept work after the deadline',
            type: 'checkbox',
            hint: 'Late submissions are still flagged as late.',
          },
          {
            name: 'publish',
            label: 'Publish now',
            type: 'checkbox',
            hint: 'Unpublished assignments are invisible to students.',
          },
        ]}
        sectionTitle="Assignment"
        onSubmitAction={save}
        cancelHref="/instructor/assignments"
        submitLabel="Create assignment"
        successMessage="Assignment created"
        successDescription="Published assignments appear on student dashboards straight away."
      />
    </>
  )
}
