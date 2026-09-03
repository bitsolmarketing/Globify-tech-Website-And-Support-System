import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { SimpleForm } from '@/components/admin/simple-form'
import type { ActionResult } from '@/lib/admin/guard'
import { createSession } from '@/lib/data/instructor'
import { getBatchForInstructor } from '@/lib/data/portal'
import { orNotFound, runPortalAction } from '@/lib/portal/guard'
import { sessionSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Add a class' }

type SessionValues = {
  title: string
  topic?: string
  scheduledAt: string
  durationMinutes: number
  meetingUrl?: string
}

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const { id } = await requireInstructorAccount()
  const batch = await orNotFound(getBatchForInstructor(batchId, id))

  async function save(values: SessionValues): Promise<ActionResult> {
    'use server'

    return runPortalAction('instructor', async (user) => {
      const parsed = sessionSchema.safeParse(values)
      if (!parsed.success) throw new Error(parsed.error.issues[0].message)

      /* `datetime-local` submits a wall-clock string with no zone. `new Date`
         reads it in the server's zone, which is the intended reading: the
         instructor typed the time the class starts where the class happens. */
      const scheduledAt = new Date(parsed.data.scheduledAt)
      if (Number.isNaN(scheduledAt.getTime())) throw new Error('That is not a valid date and time.')

      await createSession(user.id, batchId, {
        title: parsed.data.title,
        topic: parsed.data.topic || null,
        scheduledAt,
        durationMinutes: parsed.data.durationMinutes,
        meetingUrl: parsed.data.meetingUrl || null,
      })

      revalidatePath(`/instructor/batches/${batchId}`)
      revalidatePath('/instructor')
    })
  }

  async function saveAndReturn(values: SessionValues): Promise<ActionResult> {
    'use server'
    const result = await save(values)
    if (result.ok) redirect(`/instructor/batches/${batchId}`)
    return result
  }

  return (
    <>
      <PageHeader
        backHref={`/instructor/batches/${batchId}`}
        backLabel={batch.name}
        title="Add a class"
        description={`Scheduling a class for ${batch.courseTitle}. Students see it on their course page, and it is what you take a register against.`}
      />

      <SimpleForm<SessionValues>
        schema={sessionSchema as never}
        defaultValues={{
          title: '',
          topic: '',
          scheduledAt: '',
          durationMinutes: 120,
          meetingUrl: batch.meetingUrl ?? '',
        }}
        fields={[
          { name: 'title', label: 'Class title', required: true, placeholder: 'Week 3 — React state' },
          {
            name: 'scheduledAt',
            label: 'Date and time',
            type: 'datetime-local',
            required: true,
          },
          {
            name: 'durationMinutes',
            label: 'Duration (minutes)',
            type: 'number',
            min: 15,
            max: 600,
            required: true,
          },
          {
            name: 'meetingUrl',
            label: 'Meeting link',
            type: 'url',
            hint: 'Leave as-is to use the batch link, or override it for this class.',
          },
          {
            name: 'topic',
            label: 'What you are covering',
            type: 'textarea',
            rows: 4,
            hint: 'Optional. Shown to students so they can prepare.',
          },
        ]}
        sectionTitle="Class details"
        onSubmitAction={saveAndReturn}
        cancelHref={`/instructor/batches/${batchId}`}
        submitLabel="Add class"
        successMessage="Class scheduled"
        successDescription="Your students can see it on their course page now."
      />
    </>
  )
}
