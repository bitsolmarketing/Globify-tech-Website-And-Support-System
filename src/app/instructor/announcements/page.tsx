import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Megaphone, Pin, Plus, Trash2 } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { ActionButton } from '@/components/portal/action-button'
import { PortalEmpty, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  deleteAnnouncement,
  listInstructorAnnouncements,
  listInstructorBatches,
} from '@/lib/data/instructor'
import { runPortalAction, type PortalActionResult } from '@/lib/portal/guard'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Announcements' }

export default async function InstructorAnnouncementsPage() {
  const { id } = await requireInstructorAccount()

  const [announcements, batches] = await Promise.all([
    listInstructorAnnouncements(id),
    listInstructorBatches(id),
  ])

  const firstBatch = batches[0]?.batch.id

  async function remove(announcementId: string): Promise<PortalActionResult> {
    'use server'

    return runPortalAction('instructor', async (user) => {
      await deleteAnnouncement(user.id, announcementId)
      revalidatePath('/instructor/announcements')
    })
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Notices you have posted. Students see them on their dashboard and on the course page."
        actions={
          firstBatch && (
            <Button asChild variant="primary" size="md">
              <Link href={`/instructor/batches/${firstBatch}/announcements/new`}>
                <Plus aria-hidden />
                Post an announcement
              </Link>
            </Button>
          )
        }
      />

      {announcements.length === 0 ? (
        <PortalEmpty
          title="Nothing posted yet"
          description={
            batches.length === 0
              ? 'Once a batch is assigned to you, you can post notices to it.'
              : 'Use an announcement for a change of room, a deadline extension, or anything the whole cohort needs.'
          }
          action={
            firstBatch && (
              <Button asChild variant="primary" size="md">
                <Link href={`/instructor/batches/${firstBatch}/announcements/new`}>
                  Post your first announcement
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4">
          {announcements.map((item) => (
            <Card key={item.id} className={item.pinned ? 'border-gold-300 bg-gold-50/40 p-5' : 'p-5'}>
              <div className="flex items-start gap-3">
                <span
                  className={
                    item.pinned
                      ? 'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-800'
                      : 'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800'
                  }
                >
                  {item.pinned ? (
                    <Pin aria-hidden className="size-4" />
                  ) : (
                    <Megaphone aria-hidden className="size-4" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-sans text-base font-bold text-ink-900">{item.title}</h2>
                    <Badge variant={item.batchName ? 'neutral' : 'brand'} size="sm">
                      {item.batchName ?? 'Everyone'}
                    </Badge>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-700">
                    {item.body}
                  </p>

                  <p className="mt-3 font-sans text-xs text-ink-400">
                    Posted {formatDateTime(item.createdAt)}
                  </p>
                </div>

                <ActionButton
                  action={async () => {
                    'use server'
                    return remove(item.id)
                  }}
                  confirmLabel="Confirm delete"
                  variant="ghost"
                  size="sm"
                  successMessage="Announcement deleted"
                  icon={<Trash2 aria-hidden />}
                >
                  <span className="sr-only">Delete announcement</span>
                </ActionButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
