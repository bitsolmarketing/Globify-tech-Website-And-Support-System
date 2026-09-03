import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Megaphone,
} from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import {
  GradePill,
  PortalEmpty,
  ProgressBar,
  SectionHeading,
  StatTile,
  formatDateTime,
  relativeDays,
} from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { listStudentAnnouncements, listStudentAssignments, listStudentBatches } from '@/lib/data/student'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function StudentDashboardPage() {
  const { id, account } = await requireStudentAccount()

  const [batches, assignments, announcements] = await Promise.all([
    listStudentBatches(id),
    listStudentAssignments(id),
    listStudentAnnouncements(id, 4),
  ])

  const firstName = account.name.split(' ')[0]

  /* Only work that is actually outstanding, soonest first — a dashboard that
     lists everything is a list nobody reads. */
  const due = assignments
    .filter((row) => row.state === 'not-submitted' || row.state === 'overdue' || row.state === 'resubmit')
    .slice(0, 5)

  const overallProgress =
    batches.length === 0
      ? 0
      : Math.round(batches.reduce((sum, row) => sum + row.progress, 0) / batches.length)

  const attendanceRate =
    batches.length === 0
      ? 0
      : Math.round(batches.reduce((sum, row) => sum + row.attendance.rate, 0) / batches.length)

  const nextClass = batches
    .map((row) => row.nextSession)
    .filter((session): session is NonNullable<typeof session> => session !== null)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0]

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          batches.length === 0
            ? 'Your account is ready. Once the office puts you on a batch, your course will appear here.'
            : `You are on ${batches.length} ${batches.length === 1 ? 'course' : 'courses'}.`
        }
        actions={
          batches.length > 0 && (
            <Button asChild variant="secondary" size="md">
              <Link href="/student/courses">
                My courses
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )
        }
      />

      {batches.length === 0 ? (
        <PortalEmpty
          title="No courses yet"
          description="You are signed in, but you have not been enrolled on a batch. If you have already paid or spoken to the office, this usually appears within a day."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/courses">Browse courses</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Course progress"
              value={`${overallProgress}%`}
              hint="Modules you have completed"
              icon={BookOpen}
              href="/student/courses"
            />
            <StatTile
              label="Attendance"
              value={`${attendanceRate}%`}
              hint="Across every class marked"
              icon={CalendarClock}
              href="/student/attendance"
              tone={attendanceRate >= 75 ? 'positive' : 'warn'}
            />
            <StatTile
              label="Work outstanding"
              value={due.length}
              hint={
                assignments.filter((row) => row.state === 'overdue').length > 0
                  ? `${assignments.filter((row) => row.state === 'overdue').length} past the deadline`
                  : 'Nothing overdue'
              }
              icon={ClipboardList}
              href="/student/assignments"
              tone={assignments.some((row) => row.state === 'overdue') ? 'warn' : 'brand'}
            />
            <StatTile
              label="Next class"
              value={nextClass ? relativeDays(nextClass.scheduledAt) : '—'}
              hint={nextClass ? formatDateTime(nextClass.scheduledAt) : 'Nothing scheduled'}
              icon={GraduationCap}
            />
          </div>

          {/* --------------------------------------------------------- Courses */}
          <section className="mt-10">
            <SectionHeading
              title="Your courses"
              action={
                <Button asChild variant="link" size="sm">
                  <Link href="/student/courses">
                    View all
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              {batches.map((row) => (
                <Card key={row.batch.id} className="p-5">
                  <Link href={`/student/courses/${row.batch.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-base font-bold text-ink-900">
                          {row.batch.courseTitle}
                        </p>
                        <p className="mt-0.5 truncate font-sans text-xs text-ink-500">
                          {row.batch.name} · {row.instructorName}
                        </p>
                      </div>
                      <GradePill score={row.grade.score} letter={row.grade.letter} size="sm" />
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="font-sans text-xs font-semibold text-ink-600">
                          {row.modulesCompleted} of {row.modulesTotal} modules
                        </span>
                        <span className="font-sans text-xs font-bold text-ink-900">
                          {row.progress}%
                        </span>
                      </div>
                      <ProgressBar value={row.progress} label={`${row.batch.courseTitle} progress`} />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={row.attendance.rate >= 75 ? 'success' : 'gold'}
                        size="sm"
                      >
                        {row.attendance.rate}% attendance
                      </Badge>
                      {row.overdueAssignments > 0 && (
                        <Badge variant="outline" size="sm">
                          {row.overdueAssignments} overdue
                        </Badge>
                      )}
                      {row.nextSession && (
                        <span className="font-sans text-xs text-ink-500">
                          Next class {relativeDays(row.nextSession.scheduledAt)}
                        </span>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------------- Due */}
          <section className="mt-10">
            <SectionHeading
              title="Due next"
              action={
                <Button asChild variant="link" size="sm">
                  <Link href="/student/assignments">
                    All assignments
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            />

            {due.length === 0 ? (
              <PortalEmpty
                title="Nothing outstanding"
                description="Every assignment released so far has been handed in."
              />
            ) : (
              <div className="grid gap-3">
                {due.map(({ assignment, batch, state }) => (
                  <Card key={assignment.id} className="p-4">
                    <Link
                      href={`/student/assignments/${assignment.id}`}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-bold text-ink-900">
                          {assignment.title}
                        </p>
                        <p className="truncate font-sans text-xs text-ink-500">
                          {batch.courseTitle}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {state === 'overdue' && (
                          <Badge variant="outline" size="sm">
                            Overdue
                          </Badge>
                        )}
                        {state === 'resubmit' && (
                          <Badge variant="gold" size="sm">
                            Resubmit
                          </Badge>
                        )}
                        <span className="font-sans text-xs font-semibold text-ink-600">
                          Due {relativeDays(assignment.dueAt)}
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

      {/* ----------------------------------------------------- Announcements */}
      {announcements.length > 0 && (
        <section className="mt-10">
          <SectionHeading
            title="Announcements"
            action={
              <Button asChild variant="link" size="sm">
                <Link href="/student/announcements">
                  View all
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            }
          />

          <div className="grid gap-3">
            {announcements.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-800">
                    <Megaphone aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-bold text-ink-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-[0.875rem] leading-relaxed text-ink-600">
                      {item.body}
                    </p>
                    <p className="mt-1.5 font-sans text-xs text-ink-400">
                      {item.authorName}
                      {item.batchName ? ` · ${item.batchName}` : ' · Everyone'} ·{' '}
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
