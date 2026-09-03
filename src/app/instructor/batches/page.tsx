import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import {
  BatchStatusBadge,
  PortalEmpty,
  formatDateTime,
  relativeDays,
} from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { listInstructorBatches } from '@/lib/data/instructor'
import { requireInstructorAccount } from '@/lib/portal/session'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Batches' }

export default async function InstructorBatchesPage() {
  const { id } = await requireInstructorAccount()
  const batches = await listInstructorBatches(id)

  return (
    <>
      <PageHeader
        title="Batches"
        description="Every cohort assigned to you, with its roster, timetable and outstanding work."
      />

      {batches.length === 0 ? (
        <PortalEmpty
          title="No batches assigned"
          description="Cohorts are assigned by the office from the admin area. Once one is yours, it appears here."
        />
      ) : (
        <div className="grid gap-5">
          {batches.map((row) => (
            <Card key={row.batch.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-sans text-lg font-bold text-ink-900">
                      {row.batch.courseTitle}
                    </h2>
                    <BatchStatusBadge status={row.batch.status} />
                  </div>
                  <p className="mt-1 font-sans text-[0.875rem] text-ink-500">
                    {row.batch.name} · {row.batch.code} · {row.batch.mode}
                  </p>
                  <p className="mt-0.5 font-sans text-xs text-ink-400">
                    {formatDate(row.batch.startDate)}
                    {row.batch.endDate ? ` – ${formatDate(row.batch.endDate)}` : ''}
                    {row.batch.schedule ? ` · ${row.batch.schedule}` : ''}
                  </p>
                </div>

                <Button asChild variant="secondary" size="sm">
                  <Link href={`/instructor/batches/${row.batch.id}`}>
                    Open batch
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                <Badge variant="neutral" size="sm">
                  {row.studentCount} student{row.studentCount === 1 ? '' : 's'}
                  {row.batch.capacity > 0 && ` of ${row.batch.capacity}`}
                </Badge>

                {row.ungraded > 0 && (
                  <Badge variant="gold" size="sm">
                    {row.ungraded} to mark
                  </Badge>
                )}

                {row.unmarkedSessions > 0 && (
                  <Badge variant="outline" size="sm">
                    {row.unmarkedSessions} register{row.unmarkedSessions === 1 ? '' : 's'} due
                  </Badge>
                )}

                {row.ungraded === 0 && row.unmarkedSessions === 0 && (
                  <Badge variant="success" size="sm">
                    All caught up
                  </Badge>
                )}

                {row.nextSession && (
                  <span className="font-sans text-xs text-ink-500">
                    Next class {relativeDays(row.nextSession.scheduledAt)} —{' '}
                    {formatDateTime(row.nextSession.scheduledAt)}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
