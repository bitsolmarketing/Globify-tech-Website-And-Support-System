import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/table'
import { isDatabaseConfigured } from '@/db'
import { getCourses } from '@/lib/data/courses'
import { canSendWhatsApp } from '@/lib/whatsapp/send'
import { listTemplates } from '@/lib/whatsapp/templates'

import { ComposeForm } from '../compose-form'

export const metadata: Metadata = { title: 'New broadcast' }

export default async function NewBroadcastPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="New broadcast" backHref="/admin/broadcasts" />
        <EmptyState
          title="No database configured"
          description="Broadcasts are stored in the database. Set DATABASE_URL and run the migration first."
        />
      </>
    )
  }

  const [templateResult, courses] = await Promise.all([listTemplates(), getCourses()])

  return (
    <>
      <AdminPageHeader
        title="New broadcast"
        description="Pick the message, pick who gets it, send. Nothing goes out until the send button is pressed twice."
        backHref="/admin/broadcasts"
        backLabel="All broadcasts"
      />

      <ComposeForm
        templates={templateResult.ok ? templateResult.templates : []}
        templatesError={templateResult.ok ? undefined : templateResult.error}
        courseOptions={courses.map((course) => ({ value: course.slug, label: course.title }))}
        canSend={canSendWhatsApp()}
      />
    </>
  )
}
