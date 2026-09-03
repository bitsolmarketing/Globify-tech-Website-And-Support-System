import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/table'
import { isDatabaseConfigured } from '@/db'
import { getCourses } from '@/lib/data/courses'
import { listTemplates } from '@/lib/whatsapp/templates'

import { saveBroadcast } from '../actions'
import { BroadcastForm } from '../broadcast-form'

export const metadata: Metadata = { title: 'New broadcast' }

export default async function NewBroadcastPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="New broadcast" backHref="/admin/broadcasts" />
        <EmptyState
          title="No database configured"
          description="Broadcasts are stored in Postgres. Set DATABASE_URL and run the migration first."
        />
      </>
    )
  }

  const [templateResult, courses] = await Promise.all([listTemplates(), getCourses()])

  return (
    <>
      <AdminPageHeader
        title="New broadcast"
        description="Compose the message, choose who it goes to, then review the recipient list before anything is sent."
        backHref="/admin/broadcasts"
        backLabel="All broadcasts"
      />

      <BroadcastForm
        broadcastId={null}
        templates={templateResult.ok ? templateResult.templates : []}
        templatesError={templateResult.ok ? undefined : templateResult.error}
        courseOptions={courses.map((course) => ({ value: course.slug, label: course.title }))}
        onSubmitAction={saveBroadcast}
        defaultValues={{
          name: '',
          kind: 'template',
          templateName: '',
          templateLanguage: 'en_US',
          templateVariables: '',
          headerParameter: '',
          headerImageUrl: '',
          body: '',
          source: 'leads',
          leadStatus: '',
          courseSlug: '',
          sinceDays: '',
          manual: '',
          scheduledFor: '',
        }}
      />
    </>
  )
}
