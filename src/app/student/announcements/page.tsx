import type { Metadata } from 'next'
import { Megaphone, Pin } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { PortalEmpty, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { listStudentAnnouncements } from '@/lib/data/student'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Announcements' }

export default async function StudentAnnouncementsPage() {
  const { id } = await requireStudentAccount()
  const announcements = await listStudentAnnouncements(id, 50)

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Notices from your instructors and from the institute."
      />

      {announcements.length === 0 ? (
        <PortalEmpty
          title="Nothing announced yet"
          description="Messages from your instructors will appear here."
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
                    {item.authorName} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
