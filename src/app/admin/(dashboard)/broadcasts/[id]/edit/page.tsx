import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AdminPageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/table'
import { isDatabaseConfigured } from '@/db'
import { getBroadcast } from '@/lib/data/broadcasts'
import { getCourses } from '@/lib/data/courses'
import { fromLines } from '@/lib/admin/schemas'
import { listTemplates } from '@/lib/whatsapp/templates'

import { saveBroadcast } from '../../actions'
import { BroadcastForm } from '../../broadcast-form'

export const metadata: Metadata = { title: 'Edit broadcast' }

/**
 * `datetime-local` wants wall-clock time with no zone, and `toISOString()`
 * gives UTC. Feeding it the latter shows an admin in Faisalabad a time five
 * hours off the one they set, which is exactly the kind of error nobody spots
 * until the broadcast goes out in the middle of the night.
 */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

export default async function EditBroadcastPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Edit broadcast" backHref="/admin/broadcasts" />
        <EmptyState
          title="No database configured"
          description="Broadcasts are stored in Postgres. Set DATABASE_URL and run the migration first."
        />
      </>
    )
  }

  const broadcast = await getBroadcast(id)
  if (!broadcast) notFound()

  /* Editing something already sending or sent is refused by the action too;
     bouncing here means the form is never even offered for a state it cannot
     save, rather than failing at the end of a filled-in page. */
  if (broadcast.status === 'sending' || broadcast.status === 'completed') {
    redirect(`/admin/broadcasts/${id}`)
  }

  const [templateResult, courses] = await Promise.all([listTemplates(), getCourses()])
  const audience = broadcast.audience

  return (
    <>
      <AdminPageHeader
        title="Edit broadcast"
        description="Saving rebuilds the recipient list from these filters."
        backHref={`/admin/broadcasts/${id}`}
        backLabel="Back to the broadcast"
      />

      <BroadcastForm
        broadcastId={id}
        templates={templateResult.ok ? templateResult.templates : []}
        templatesError={templateResult.ok ? undefined : templateResult.error}
        courseOptions={courses.map((course) => ({ value: course.slug, label: course.title }))}
        onSubmitAction={saveBroadcast}
        submitLabel="Save and rebuild audience"
        defaultValues={{
          name: broadcast.name,
          kind: broadcast.kind,
          templateName: broadcast.templateName ?? '',
          templateLanguage: broadcast.templateLanguage ?? 'en_US',
          templateVariables: fromLines(broadcast.templateVariables ?? []),
          headerParameter: broadcast.headerParameter ?? '',
          headerImageUrl: broadcast.headerImageUrl ?? '',
          body: broadcast.body ?? '',
          source: audience?.source ?? 'leads',
          leadStatus: audience?.leadStatus ?? '',
          courseSlug: audience?.courseSlug ?? '',
          sinceDays: audience?.sinceDays ?? '',
          manual: (audience?.manual ?? []).join('\n'),
          scheduledFor: broadcast.scheduledFor ? toLocalInputValue(broadcast.scheduledFor) : '',
        }}
      />
    </>
  )
}
