import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Award,
  CalendarPlus,
  ClipboardCheck,
  ExternalLink,
  FilePlus2,
  Megaphone,
  Trash2,
} from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { ActionButton } from '@/components/portal/action-button'
import {
  BatchStatusBadge,
  GradePill,
  PortalEmpty,
  ProgressBar,
  SectionHeading,
  StatTile,
  formatDateTime,
  relativeDays,
  toneForRate,
} from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getBatchRoster, listMaterials, listSessions } from '@/lib/data/instructor'
import { orNotFound } from '@/lib/portal/guard'
import { requireInstructorAccount } from '@/lib/portal/session'
import { formatDate } from '@/lib/utils'
import { ClipboardList, Users } from 'lucide-react'

import {
  cancelSessionAction,
  deleteMaterialAction,
  deleteSessionAction,
  issueCertificateAction,
} from './actions'

export const metadata: Metadata = { title: 'Batch' }

export default async function InstructorBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  const { batchId } = await params
  const { id } = await requireInstructorAccount()

  const { batch, entries } = await orNotFound(getBatchRoster(id, batchId))
  const [sessions, materials] = await Promise.all([
    listSessions(id, batchId),
    listMaterials(id, batchId),
  ])

  const now = new Date()
  const needsRegister = sessions.filter(
    (session) => session.scheduledAt <= now && !session.attendanceMarkedAt && session.status === 'scheduled',
  )
  const ungraded = entries.reduce((sum, entry) => sum + entry.ungraded, 0)
  const averageAttendance =
    entries.length === 0
      ? 0
      : Math.round(entries.reduce((sum, entry) => sum + entry.attendance.rate, 0) / entries.length)

  return (
    <>
      <PageHeader
        backHref="/instructor/batches"
        backLabel="All batches"
        title={batch.courseTitle}
        description={`${batch.name} · ${batch.code} · ${formatDate(batch.startDate)}${
          batch.endDate ? ` – ${formatDate(batch.endDate)}` : ''
        }${batch.schedule ? ` · ${batch.schedule}` : ''}`}
        actions={
          <>
            <Button asChild variant="secondary" size="md">
              <Link href={`/instructor/batches/${batchId}/sessions/new`}>
                <CalendarPlus aria-hidden />
                Add class
              </Link>
            </Button>
            <Button asChild variant="primary" size="md">
              <Link href={`/instructor/assignments/new?batchId=${batchId}`}>
                <FilePlus2 aria-hidden />
                New assignment
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <BatchStatusBadge status={batch.status} />
        <Badge variant="neutral" size="sm">
          {batch.mode}
        </Badge>
        {batch.meetingUrl && (
          <Button asChild variant="link" size="sm">
            <a href={batch.meetingUrl} target="_blank" rel="noopener noreferrer">
              Class link
              <ExternalLink aria-hidden />
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Students"
          value={entries.length}
          hint={batch.capacity > 0 ? `Capacity ${batch.capacity}` : 'No capacity set'}
          icon={Users}
        />
        <StatTile
          label="Average attendance"
          value={`${averageAttendance}%`}
          hint={`${sessions.filter((s) => s.attendanceMarkedAt).length} registers taken`}
          icon={ClipboardCheck}
          tone={averageAttendance >= 75 ? 'positive' : 'warn'}
        />
        <StatTile
          label="Waiting to be marked"
          value={ungraded}
          hint={ungraded === 0 ? 'Nothing outstanding' : 'Submissions in your queue'}
          icon={ClipboardList}
          href="/instructor/assignments"
          tone={ungraded > 0 ? 'warn' : 'positive'}
        />
        <StatTile
          label="Registers due"
          value={needsRegister.length}
          hint={needsRegister.length === 0 ? 'Every class is marked' : 'Classes held, not marked'}
          icon={CalendarPlus}
          tone={needsRegister.length > 0 ? 'warn' : 'positive'}
        />
      </div>

      {/* ------------------------------------------------------------- Roster */}
      <section className="mt-10">
        <SectionHeading
          title="Roster"
          action={
            <Button asChild variant="link" size="sm">
              <Link href={`/instructor/batches/${batchId}/announcements/new`}>
                <Megaphone aria-hidden />
                Post an announcement
              </Link>
            </Button>
          }
        />

        {entries.length === 0 ? (
          <PortalEmpty
            title="Nobody enrolled yet"
            description="Students are enrolled onto this batch by the office from the admin area."
          />
        ) : (
          <DataTable>
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th className="hidden lg:table-cell">Progress</Th>
                <Th>Attendance</Th>
                <Th className="text-right">Grade</Th>
                <Th className="text-right">Certificate</Th>
              </Tr>
            </Thead>
            <Tbody>
              {entries.map((entry) => (
                <Tr key={entry.student.id}>
                  <Td>
                    <span className="font-semibold text-ink-900">{entry.student.studentName}</span>
                    <span className="block truncate font-sans text-xs text-ink-400">
                      {entry.student.studentEmail}
                    </span>
                    {entry.ungraded > 0 && (
                      <Badge variant="gold" size="sm" className="mt-1">
                        {entry.ungraded} to mark
                      </Badge>
                    )}
                  </Td>

                  <Td className="hidden lg:table-cell">
                    <div className="w-36">
                      <ProgressBar value={entry.progress} label="Curriculum progress" />
                      <span className="mt-1 block font-sans text-xs text-ink-500">
                        {entry.modulesCompleted}/{entry.modulesTotal} modules
                      </span>
                    </div>
                  </Td>

                  <Td>
                    <div className="w-28">
                      <ProgressBar
                        value={entry.attendance.rate}
                        label="Attendance"
                        tone={toneForRate(entry.attendance.rate)}
                      />
                      <span className="mt-1 block font-sans text-xs text-ink-500">
                        {entry.attendance.rate}% · {entry.attendance.absent} absent
                      </span>
                    </div>
                  </Td>

                  <Td className="text-right">
                    <GradePill score={entry.grade.score} letter={entry.grade.letter} size="sm" />
                  </Td>

                  <Td className="text-right">
                    {entry.certificate ? (
                      entry.certificate.revokedAt ? (
                        <Badge variant="outline" size="sm">
                          Withdrawn
                        </Badge>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-emerald-700">
                          {entry.certificate.serial}
                        </span>
                      )
                    ) : entry.eligibility.eligible ? (
                      <ActionButton
                        action={async () => {
                          'use server'
                          return issueCertificateAction(batchId, entry.student.studentId)
                        }}
                        confirmLabel="Confirm issue"
                        variant="secondary"
                        size="sm"
                        icon={<Award aria-hidden />}
                      >
                        Issue
                      </ActionButton>
                    ) : (
                      <span
                        title={entry.eligibility.reasons.join('; ')}
                        className="font-sans text-xs text-ink-400"
                      >
                        {entry.eligibility.reasons.length} blocker
                        {entry.eligibility.reasons.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
        )}
      </section>

      {/* ------------------------------------------------------------ Classes */}
      <section className="mt-10">
        <SectionHeading
          title="Classes"
          action={
            <Button asChild variant="link" size="sm">
              <Link href={`/instructor/batches/${batchId}/sessions/new`}>
                <CalendarPlus aria-hidden />
                Add a class
              </Link>
            </Button>
          }
        />

        {sessions.length === 0 ? (
          <PortalEmpty
            title="No classes scheduled"
            description="Add the timetable so students know when to turn up and you have something to take a register against."
            action={
              <Button asChild variant="primary" size="md">
                <Link href={`/instructor/batches/${batchId}/sessions/new`}>Add the first class</Link>
              </Button>
            }
          />
        ) : (
          <DataTable>
            <Thead>
              <Tr>
                <Th>Class</Th>
                <Th>When</Th>
                <Th>Register</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sessions.map((session) => {
                const held = session.scheduledAt <= now
                const cancelled = session.status === 'cancelled'

                return (
                  <Tr key={session.id}>
                    <Td>
                      <span className="font-semibold text-ink-900">{session.title}</span>
                      {session.topic && (
                        <span className="block truncate font-sans text-xs text-ink-500">
                          {session.topic}
                        </span>
                      )}
                    </Td>

                    <Td className="whitespace-nowrap">
                      <span className="font-sans text-xs text-ink-600">
                        {formatDateTime(session.scheduledAt)}
                      </span>
                      <span className="block font-sans text-xs text-ink-400">
                        {relativeDays(session.scheduledAt)} · {session.durationMinutes} min
                      </span>
                    </Td>

                    <Td>
                      {cancelled ? (
                        <Badge variant="outline" size="sm">
                          Cancelled
                        </Badge>
                      ) : session.attendanceMarkedAt ? (
                        <Badge variant="success" size="sm">
                          Taken
                        </Badge>
                      ) : held ? (
                        <Badge variant="gold" size="sm">
                          Due
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Upcoming
                        </Badge>
                      )}
                    </Td>

                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        {!cancelled && (
                          <Button asChild variant="secondary" size="sm">
                            <Link href={`/instructor/sessions/${session.id}/attendance`}>
                              <ClipboardCheck aria-hidden />
                              {session.attendanceMarkedAt ? 'Edit register' : 'Take register'}
                            </Link>
                          </Button>
                        )}

                        {!cancelled && !session.attendanceMarkedAt && (
                          <ActionButton
                            action={async () => {
                              'use server'
                              return cancelSessionAction(batchId, session.id)
                            }}
                            confirmLabel="Confirm cancel"
                            variant="ghost"
                            size="sm"
                            successMessage="Class cancelled"
                          >
                            Cancel
                          </ActionButton>
                        )}

                        <ActionButton
                          action={async () => {
                            'use server'
                            return deleteSessionAction(batchId, session.id)
                          }}
                          confirmLabel="Delete class and register"
                          variant="ghost"
                          size="sm"
                          successMessage="Class deleted"
                          icon={<Trash2 aria-hidden />}
                        >
                          <span className="sr-only">Delete class</span>
                        </ActionButton>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </DataTable>
        )}
      </section>

      {/* ---------------------------------------------------------- Materials */}
      <section className="mt-10">
        <SectionHeading
          title="Materials"
          action={
            <Button asChild variant="link" size="sm">
              <Link href={`/instructor/batches/${batchId}/materials/new`}>
                <FilePlus2 aria-hidden />
                Add material
              </Link>
            </Button>
          }
        />

        {materials.length === 0 ? (
          <PortalEmpty
            title="No materials shared"
            description="Slides, notes, repositories and reading you add here appear on every student's course page."
            action={
              <Button asChild variant="primary" size="md">
                <Link href={`/instructor/batches/${batchId}/materials/new`}>Add material</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {materials.map((material) => (
              <Card key={material.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-bold text-ink-900">{material.title}</p>
                    <p className="mt-0.5 font-sans text-xs text-ink-400 capitalize">
                      {material.type}
                    </p>
                    {material.description && (
                      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-600">
                        {material.description}
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

                  <ActionButton
                    action={async () => {
                      'use server'
                      return deleteMaterialAction(batchId, material.id)
                    }}
                    confirmLabel="Confirm delete"
                    variant="ghost"
                    size="sm"
                    successMessage="Material removed"
                    icon={<Trash2 aria-hidden />}
                  >
                    <span className="sr-only">Delete material</span>
                  </ActionButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
