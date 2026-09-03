import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarClock } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import {
  EnrollmentBadge,
  GradePill,
  PortalEmpty,
  ProgressBar,
  formatDateTime,
  relativeDays,
  toneForRate,
} from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { listStudentBatches } from '@/lib/data/student'
import { requireStudentAccount } from '@/lib/portal/session'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'My courses' }

export default async function StudentCoursesPage() {
  const { id } = await requireStudentAccount()
  const batches = await listStudentBatches(id)

  return (
    <>
      <PageHeader
        title="My courses"
        description="Every batch you are enrolled on, with your progress, attendance and marks."
      />

      {batches.length === 0 ? (
        <PortalEmpty
          title="No courses yet"
          description="You have not been enrolled on a batch. Once the office adds you, your course appears here."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/courses">Browse courses</Link>
            </Button>
          }
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
                    <EnrollmentBadge status={row.enrollment.status} />
                  </div>
                  <p className="mt-1 font-sans text-[0.875rem] text-ink-500">
                    {row.batch.name} · {row.batch.code} · taught by {row.instructorName}
                  </p>
                  {row.batch.schedule && (
                    <p className="mt-0.5 font-sans text-xs text-ink-400">{row.batch.schedule}</p>
                  )}
                </div>

                <Button asChild variant="secondary" size="sm">
                  <Link href={`/student/courses/${row.batch.id}`}>
                    Open course
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="font-sans text-[0.6875rem] font-bold tracking-[0.08em] text-ink-400 uppercase">
                      Progress
                    </span>
                    <span className="font-sans text-xs font-bold text-ink-900">
                      {row.progress}%
                    </span>
                  </div>
                  <ProgressBar value={row.progress} label="Course progress" />
                  <p className="mt-1.5 font-sans text-xs text-ink-500">
                    {row.modulesCompleted} of {row.modulesTotal} modules
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="font-sans text-[0.6875rem] font-bold tracking-[0.08em] text-ink-400 uppercase">
                      Attendance
                    </span>
                    <span className="font-sans text-xs font-bold text-ink-900">
                      {row.attendance.rate}%
                    </span>
                  </div>
                  <ProgressBar
                    value={row.attendance.rate}
                    label="Attendance"
                    tone={toneForRate(row.attendance.rate)}
                  />
                  <p className="mt-1.5 font-sans text-xs text-ink-500">
                    {row.attendance.present + row.attendance.late} of {row.attendance.marked} classes
                  </p>
                </div>

                <div>
                  <span className="font-sans text-[0.6875rem] font-bold tracking-[0.08em] text-ink-400 uppercase">
                    Current mark
                  </span>
                  <div className="mt-2">
                    <GradePill score={row.grade.score} letter={row.grade.letter} />
                  </div>
                  <p className="mt-1.5 font-sans text-xs text-ink-500">
                    {row.grade.score === null
                      ? 'Nothing marked yet'
                      : `Assignments ${row.grade.assignments ?? '—'}% · quizzes ${row.grade.quizzes ?? '—'}%`}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                <Badge variant="neutral" size="sm">
                  Started {formatDate(row.batch.startDate)}
                </Badge>
                {row.overdueAssignments > 0 && (
                  <Badge variant="gold" size="sm">
                    {row.overdueAssignments} overdue
                  </Badge>
                )}
                {row.openAssignments > 0 && (
                  <Badge variant="brand" size="sm">
                    {row.openAssignments} due soon
                  </Badge>
                )}
                {row.nextSession && (
                  <span className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-500">
                    <CalendarClock aria-hidden className="size-3.5" />
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
