import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarClock, ClipboardCheck, ClipboardList, Users } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import {
  BatchStatusBadge,
  PortalEmpty,
  SectionHeading,
  StatTile,
  formatDateTime,
  relativeDays,
} from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getInstructorDashboard } from '@/lib/data/instructor'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function InstructorDashboardPage() {
  const { id, account } = await requireInstructorAccount()
  const dashboard = await getInstructorDashboard(id)

  const firstName = account.name.split(' ')[0]

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          dashboard.batches.length === 0
            ? 'You have not been assigned a batch yet. The office assigns cohorts from the admin.'
            : `You are teaching ${dashboard.batches.length} ${dashboard.batches.length === 1 ? 'batch' : 'batches'}.`
        }
        actions={
          dashboard.batches.length > 0 && (
            <Button asChild variant="secondary" size="md">
              <Link href="/instructor/batches">
                My batches
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )
        }
      />

      {dashboard.batches.length === 0 ? (
        <PortalEmpty
          title="No batches assigned"
          description="Once a cohort is assigned to you it appears here, along with its roster, timetable and marking queue."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Active students"
              value={dashboard.activeStudents}
              hint={`Across ${dashboard.batches.length} ${dashboard.batches.length === 1 ? 'batch' : 'batches'}`}
              icon={Users}
              href="/instructor/batches"
            />
            <StatTile
              label="Waiting to be marked"
              value={dashboard.ungradedTotal}
              hint={dashboard.ungradedTotal === 0 ? 'Nothing outstanding' : 'Submissions in your queue'}
              icon={ClipboardList}
              href="/instructor/assignments"
              tone={dashboard.ungradedTotal > 0 ? 'warn' : 'positive'}
            />
            <StatTile
              label="Registers to take"
              value={dashboard.unmarkedTotal}
              hint={
                dashboard.unmarkedTotal === 0
                  ? 'Every class is marked'
                  : 'Classes held with no attendance saved'
              }
              icon={ClipboardCheck}
              href="/instructor/attendance"
              tone={dashboard.unmarkedTotal > 0 ? 'warn' : 'positive'}
            />
            <StatTile
              label="Next class"
              value={dashboard.upcoming[0] ? relativeDays(dashboard.upcoming[0].scheduledAt) : '—'}
              hint={
                dashboard.upcoming[0]
                  ? `${dashboard.upcoming[0].title} · ${dashboard.upcoming[0].batchName}`
                  : 'Nothing scheduled'
              }
              icon={CalendarClock}
            />
          </div>

          {/* --------------------------------------------------------- Batches */}
          <section className="mt-10">
            <SectionHeading
              title="Your batches"
              action={
                <Button asChild variant="link" size="sm">
                  <Link href="/instructor/batches">
                    View all
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              {dashboard.batches.map((row) => (
                <Card key={row.batch.id} className="p-5">
                  <Link href={`/instructor/batches/${row.batch.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-base font-bold text-ink-900">
                          {row.batch.courseTitle}
                        </p>
                        <p className="mt-0.5 truncate font-sans text-xs text-ink-500">
                          {row.batch.name} · {row.batch.code}
                        </p>
                      </div>
                      <BatchStatusBadge status={row.batch.status} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" size="sm">
                        {row.studentCount} student{row.studentCount === 1 ? '' : 's'}
                      </Badge>
                      {row.ungraded > 0 && (
                        <Badge variant="gold" size="sm">
                          {row.ungraded} to mark
                        </Badge>
                      )}
                      {row.unmarkedSessions > 0 && (
                        <Badge variant="outline" size="sm">
                          {row.unmarkedSessions} register
                          {row.unmarkedSessions === 1 ? '' : 's'} due
                        </Badge>
                      )}
                    </div>

                    {row.nextSession && (
                      <p className="mt-3 font-sans text-xs text-ink-500">
                        Next: {row.nextSession.title} · {formatDateTime(row.nextSession.scheduledAt)}
                      </p>
                    )}
                  </Link>
                </Card>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------- Timetable */}
          {dashboard.upcoming.length > 0 && (
            <section className="mt-10">
              <SectionHeading title="Coming up" />
              <div className="grid gap-3">
                {dashboard.upcoming.map((session) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-bold text-ink-900">
                          {session.title}
                        </p>
                        <p className="truncate font-sans text-xs text-ink-500">
                          {session.batchName}
                        </p>
                      </div>
                      <p className="shrink-0 font-sans text-xs font-semibold text-ink-600">
                        {formatDateTime(session.scheduledAt)} · {relativeDays(session.scheduledAt)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ----------------------------------------------------- To be marked */}
          <section className="mt-10">
            <SectionHeading
              title="Waiting to be marked"
              action={
                <Button asChild variant="link" size="sm">
                  <Link href="/instructor/assignments">
                    All assignments
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />

            {dashboard.recentSubmissions.length === 0 ? (
              <PortalEmpty
                title="Nothing waiting"
                description="Every submission handed in so far has been marked."
              />
            ) : (
              <div className="grid gap-3">
                {dashboard.recentSubmissions.map((submission) => (
                  <Card key={submission.id} className="p-4">
                    <Link
                      href={`/instructor/assignments/${submission.assignmentId}`}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-bold text-ink-900">
                          {submission.studentName}
                        </p>
                        <p className="truncate font-sans text-xs text-ink-500">
                          {submission.assignmentTitle}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {submission.late && (
                          <Badge variant="outline" size="sm">
                            Late
                          </Badge>
                        )}
                        <span className="font-sans text-xs text-ink-500">
                          {formatDateTime(submission.submittedAt)}
                        </span>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}
