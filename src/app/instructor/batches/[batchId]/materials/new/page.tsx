import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { SimpleForm } from '@/components/admin/simple-form'
import type { MaterialType } from '@/db/schema'
import type { ActionResult } from '@/lib/admin/guard'
import { createMaterial } from '@/lib/data/instructor'
import { getBatchCurriculum, getBatchForInstructor } from '@/lib/data/portal'
import { orNotFound, runPortalAction } from '@/lib/portal/guard'
import { materialSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Add material' }

type MaterialValues = {
  title: string
  description?: string
  type: MaterialType
  url?: string
  body?: string
  moduleIndex?: number
}

export default async function NewMaterialPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const { id } = await requireInstructorAccount()

  const batch = await orNotFound(getBatchForInstructor(batchId, id))
  const curriculum = await getBatchCurriculum(batch)

  async function save(values: MaterialValues): Promise<ActionResult> {
    'use server'

    const result = await runPortalAction('instructor', async (user) => {
      const parsed = materialSchema.safeParse(values)
      if (!parsed.success) throw new Error(parsed.error.issues[0].message)

      await createMaterial(user.id, batchId, {
        title: parsed.data.title,
        description: parsed.data.description || null,
        type: parsed.data.type,
        url: parsed.data.url || null,
        body: parsed.data.body || null,
        /* The select submits '' for "not tied to a module", which coerces to 0
           — a real module index. Normalising to null here is what keeps an
           unclassified handout off the first module. */
        moduleIndex:
          values.moduleIndex === undefined || Number.isNaN(values.moduleIndex)
            ? null
            : parsed.data.moduleIndex ?? null,
      })

      revalidatePath(`/instructor/batches/${batchId}`)
    })

    if (result.ok) redirect(`/instructor/batches/${batchId}`)
    return result
  }

  return (
    <>
      <PageHeader
        backHref={`/instructor/batches/${batchId}`}
        backLabel={batch.name}
        title="Add material"
        description={`Anything your students on ${batch.courseTitle} should have — slides, a repository, a recording, or a note you type here.`}
      />

      <SimpleForm<MaterialValues>
        schema={materialSchema as never}
        defaultValues={{
          title: '',
          description: '',
          type: 'link',
          url: '',
          body: '',
        }}
        fields={[
          { name: 'title', label: 'Title', required: true, placeholder: 'Week 3 slides' },
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            required: true,
            options: [
              { value: 'link', label: 'Link' },
              { value: 'file', label: 'File' },
              { value: 'video', label: 'Video / recording' },
              { value: 'note', label: 'Note (typed here)' },
            ],
          },
          {
            name: 'url',
            label: 'URL',
            type: 'url',
            full: true,
            hint: 'Required for a link, file or video. Leave blank for a note.',
          },
          {
            name: 'moduleIndex',
            label: 'Curriculum module',
            type: 'select',
            hint: 'Optional — groups this material against part of the syllabus.',
            options: [
              { value: '', label: 'Not tied to a module' },
              ...curriculum.map((module, index) => ({
                value: String(index),
                label: `${index + 1}. ${module.module}`,
              })),
            ],
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            rows: 3,
            hint: 'Optional. A line about what this is and why it matters.',
          },
          {
            name: 'body',
            label: 'Note text',
            type: 'textarea',
            rows: 8,
            hint: 'Only used when the type is "Note".',
          },
        ]}
        sectionTitle="Material"
        onSubmitAction={save}
        cancelHref={`/instructor/batches/${batchId}`}
        submitLabel="Add material"
        successMessage="Material added"
        successDescription="It is on your students' course page now."
      />
    </>
  )
}
