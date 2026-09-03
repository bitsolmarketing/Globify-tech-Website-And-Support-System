import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarClock,
  ExternalLink,
  FileText,
  Link2,
  Megaphone,
  NotebookPen,
  Video,
} from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { ModuleChecklist } from '@/components/portal/module-checklist'
import {
  AttendanceBadge,
  GradePill,
  PortalEmpty,
  ProgressBar,
  SectionHeading,
  formatDateTime,
  relativeDays,
  toneForRate,
} from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { MaterialType } from '@/db/schema'
import { getStudentAttendance, getStudentBatch } from '@/lib/data/student'
import { orNotFound } from '@/lib/portal/guard'
import { requireStudentAccount } from '@/lib/portal/session'
import { formatDate } from '@/lib/utils'

import { toggleModuleAction } from './actions'

export const metadata: Metadata = { title: 'Course' }

const MATERIAL_ICON: Record<MaterialType, typeof Link2> = {
  link: Link2,
  file: FileText,
  video: Video,
  note: NotebookPen,
}

export default async function StudentBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const { id } = await requireStudentAccount()

  /* `orNotFound` is what makes another student's batch id answer exactly as an
     invented one does. */
  const detail = await orNotFound(getStudentBatch(id, batchId))
  const { rows: attendanceRows } = await getStudentAttendance(id, batchId)

  const now = new Date()
  const upcoming = detail.sessions.filter(
    (session) => session.scheduledAt > now && session.status === 'scheduled',
  )
  const past = detail.sessions.filter(
    (session) => session.scheduledAt <= now || session.status !== 'scheduled',
  )
  const attendanceBySession = new Map(attendanceRows.map((row) => [row.session.id, row.record]))

  return (
    <>
      <PageHeader
        backHref="/student/courses"
        backLabel="All courses"
        title={detail.batch.courseTitle}
        description={`${detail.batch.name} · ${detail.batch.code} · taught by ${detail.instructorName}${
          detail.batch.schedule ? ` · ${detail.batch.schedule}` : ''
        }`}
        actions={
          detail.batch.meetingUrl && (
            <Button asChild variant="primary" size="md">
              <a href={detail.batch.meetingUrl} target="_blank" rel="noopener noreferrer">
                Join class
                <ExternalLink aria-hidden />
              </a>
            </Button>
          )
        }
      />

      {/* ------------------------------------------------------------- Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
            Progress
          </p>
          <p className="mt-2 font-sans text-3xl font-extrabold tracking-tight text-ink-900">
            {detail.progress}%
          </p>
          <ProgressBar className="mt-3" value={detail.progress} label="Course progress" />
          <p className="mt-1.5 font-sans text-xs text-ink-500">
            {detail.modulesCompleted} of {detail.modulesTotal} modules ticked off
          </p>
        </Card>

        <Card className="p-5">
          <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
            Attendance
          </p>
          <p className="mt-2 font-sans text-3xl font-extrabold tracking-tight text-ink-900">
            {detail.attendance.rate}%
          </p>
          <ProgressBar
            className="mt-3"
            value={detail.attendance.rate}
            label="Attendance"
            tone={toneForRate(detail.attendance.rate)}
          />
          <p className="mt-1.5 font-sans text-xs text-ink-500">
            {detail.attendance.present} present · {detail.attendance.late} late ·{' '}
            {detail.attendance.absent} absent
          </p>
        </Card>

        <Card className="p-5">
          <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
            Current mark
          </p>
          <div className="mt-3">
            <GradePill score={detail.grade.score} letter={detail.grade.letter} size="lg" />
          </div>
          <p className="mt-3 font-sans text-xs text-ink-500">
            {detail.grade.score === null
              ? 'Nothing has been marked yet.'
              : `Assignments ${detail.grade.assignments ?? '—'}% · quizzes ${detail.grade.quizzes ?? '—'}%`}
          </p>
          <Button asChild variant="link" size="sm" className="mt-2 -ml-3">
            <Link href="/student/grades">See full breakdown</Link>
          </Button>
        </Card>
      </div>

      {/* ---------------------------------------------------------- Curriculum */}
      <section className="mt-10">
        <SectionHeading
          title="Curriculum"
          action={
            <span className="font-sans text-xs text-ink-500">
              Tick a module once you are comfortable with it
            </span>
          }
        />
        <ModuleChecklist
          modules={detail.curriculum}
          completedIndexes={detail.completedModuleIndexes}
          onToggle={async (moduleIndex, moduleTitle, completed) => {
            'use server'
            return toggleModuleAction(batchId, moduleIndex, moduleTitle, completed)
          }}
        />
      </section>

      {/* ------------------------------------------------------------ Classes */}
      <section className="mt-10">
        <SectionHeading title="Classes" />

        {detail.sessions.length === 0 ? (
          <PortalEmpty
            title="No classes scheduled yet"
            description="Your instructor has not added the timetable for this batch."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                Coming up
              </p>
              {upcoming.length === 0 ? (
                <Card className="px-5 py-8 text-center">
                  <p className="font-sans text-[0.875rem] text-ink-500">Nothing scheduled.</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {upcoming.map((session) => (
                    <Card key={session.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-sans text-sm font-bold text-ink-900">
                            {session.title}
                          </p>
                          <p className="mt-0.5 inline-flex items-center gap-1.5 font-sans text-xs text-ink-500">
                            <CalendarClock aria-hidden className="size-3.5" />
                            {formatDateTime(session.scheduledAt)} ·{' '}
                            {relativeDays(session.scheduledAt)}
                          </p>
                          {session.topic && (
                            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-600">
                              {session.topic}
                            </p>
                          )}
                        </div>

                        {(session.meetingUrl ?? detail.batch.meetingUrl) && (
                          <Button asChild variant="secondary" size="sm">
                            <a
                              href={session.meetingUrl ?? detail.batch.meetingUrl ?? '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join
                              <ExternalLink aria-hidden />
                            </a>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                Past classes
              </p>
              {past.length === 0 ? (
                <Card className="px-5 py-8 text-center">
                  <p className="font-sans text-[0.875rem] text-ink-500">Nothing yet.</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {past.slice(0, 8).map((session) => (
                    <Card key={session.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-sans text-sm font-bold text-ink-900">
                            {session.title}
                          </p>
                          <p className="font-sans text-xs text-ink-500">
                            {formatDateTime(session.scheduledAt)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {session.status === 'cancelled' ? (
                            <Badge variant="outline" size="sm">
                              Cancelled
                            </Badge>
                          ) : (
                            <AttendanceBadge
                              status={attendanceBySession.get(session.id)?.status ?? null}
                            />
                          )}
                          {session.recordingUrl && (
                            <Button asChild variant="link" size="sm">
                              <a
                                href={session.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Recording
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------- Materials */}
      <section className="mt-10">
        <SectionHeading title="Course materials" />

        {detail.materials.length === 0 ? (
          <PortalEmpty
            title="No materials yet"
            description="Slides, notes and links your instructor shares will appear here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {detail.materials.map((material) => {
              const Icon = MATERIAL_ICON[material.type]

              return (
                <Card key={material.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800">
                      <Icon aria-hidden className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm font-bold text-ink-900">{material.title}</p>
                      {material.description && (
                        <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-600">
                          {material.description}
                        </p>
                      )}
                      {material.type === 'note' && material.body && (
                        <p className="mt-2 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink-700">
                          {material.body}
                        </p>
                      )}
                      {material.url && (
                        <Button asChild variant="link" size="sm" className="mt-1 -ml-3">
                          <a href={material.url} target="_blank" rel="noopener noreferrer">
                            Open
                            <ExternalLink aria-hidden />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ Announcements */}
      {detail.announcements.length > 0 && (
        <section className="mt-10">
          <SectionHeading title="Announcements" />
          <div className="grid gap-3">
            {detail.announcements.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-800">
                    <Megaphone aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-sans text-sm font-bold text-ink-900">{item.title}</p>
                      {item.pinned && (
                        <Badge variant="gold" size="sm">
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink-600">
                      {item.body}
                    </p>
                    <p className="mt-1.5 font-sans text-xs text-ink-400">
                      {item.authorName} · {formatDate(item.createdAt)}
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
