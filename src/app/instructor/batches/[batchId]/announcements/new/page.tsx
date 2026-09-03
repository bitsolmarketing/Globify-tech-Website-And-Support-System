import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { SimpleForm } from '@/components/admin/simple-form'
import type { ActionResult } from '@/lib/admin/guard'
import { createAnnouncement, listInstructorBatches } from '@/lib/data/instructor'
import { orNotFound, runPortalAction } from '@/lib/portal/guard'
import { announcementSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'
import { getBatchForInstructor } from '@/lib/data/portal'

export const metadata: Metadata = { title: 'Post an announcement' }

type AnnouncementValues = {
  batchId: string
  title: string
  body: string
  pinned: boolean
}

export default async function NewAnnouncementPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const { id, account } = await requireInstructorAccount()

  const batch = await orNotFound(getBatchForInstructor(batchId, id))
  const batches = await listInstructorBatches(id)

  async function save(values: AnnouncementValues): Promise<ActionResult> {
    'use server'

    const result = await runPortalAction('instructor', async (user) => {
      const parsed = announcementSchema.safeParse(values)
      if (!parsed.success) throw new Error(parsed.error.issues[0].message)

      /* An empty batch id is the "everyone" option, which `createAnnouncement`
         stores as a null `batch_id` — a notice every enrolled student sees,
         whichever cohort they are on. */
      await createAnnouncement(
        { id: user.id, name: account.name },
        {
          batchId: parsed.data.batchId || null,
          title: parsed.data.title,
          body: parsed.data.body,
          pinned: parsed.data.pinned,
        },
      )

      revalidatePath('/instructor/announcements')
      revalidatePath(`/instructor/batches/${batchId}`)
      revalidatePath('/student')
    })

    if (result.ok) redirect('/instructor/announcements')
    return result
  }

  return (
    <>
      <PageHeader
        backHref={`/instructor/batches/${batchId}`}
        backLabel={batch.name}
        title="Post an announcement"
        description="Appears on the dashboard of everyone it is addressed to, newest first. Pin the ones that must not scroll away."
      />

      <SimpleForm<AnnouncementValues>
        schema={announcementSchema as never}
        defaultValues={{ batchId, title: '', body: '', pinned: false }}
        fields={[
          {
            name: 'batchId',
            label: 'Who sees this',
            type: 'select',
            required: true,
            options: [
              ...batches.map((row) => ({
                value: row.batch.id,
                label: `${row.batch.name} — ${row.batch.courseTitle}`,
              })),
              { value: '', label: 'Everyone I teach' },
            ],
          },
          { name: 'title', label: 'Title', required: true, placeholder: 'Class moved to Thursday' },
          {
            name: 'body',
            label: 'Announcement',
            type: 'textarea',
            rows: 8,
            required: true,
          },
          {
            name: 'pinned',
            label: 'Pin to the top',
            type: 'checkbox',
            hint: 'Pinned announcements stay above the rest until you unpin them.',
          },
        ]}
        sectionTitle="Announcement"
        onSubmitAction={save}
        cancelHref={`/instructor/batches/${batchId}`}
        submitLabel="Post announcement"
        successMessage="Announcement posted"
        successDescription="Your students can see it now."
      />
    </>
  )
}
