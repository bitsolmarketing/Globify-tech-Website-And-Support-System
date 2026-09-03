import type { Metadata } from 'next'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import {
  AttendanceBadge,
  PortalEmpty,
  ProgressBar,
  StatTile,
  formatDateTime,
  toneForRate,
} from '@/components/portal/ui'
import { Card } from '@/components/ui/card'
import { CalendarCheck, CalendarClock, CalendarX, ShieldCheck } from 'lucide-react'
import { getStudentAttendance } from '@/lib/data/student'
import { MIN_ATTENDANCE_FOR_CERTIFICATE } from '@/lib/portal/grading'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Attendance' }

export default async function StudentAttendancePage() {
  const { id } = await requireStudentAccount()
  const { rows, tally } = await getStudentAttendance(id)

  const short = tally.rate < MIN_ATTENDANCE_FOR_CERTIFICATE && tally.marked > 0

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Every class that has been held and registered, across all your courses."
      />

      {rows.length === 0 ? (
        <PortalEmpty
          title="No classes marked yet"
          description="Your attendance appears here once your instructor takes the register for a class."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Attendance rate"
              value={`${tally.rate}%`}
              hint={`${tally.present + tally.late} of ${tally.present + tally.late + tally.absent} counted classes`}
              icon={CalendarCheck}
              tone={tally.rate >= MIN_ATTENDANCE_FOR_CERTIFICATE ? 'positive' : 'warn'}
            />
            <StatTile label="Present" value={tally.present} icon={CalendarCheck} tone="positive" />
            <StatTile label="Late" value={tally.late} icon={CalendarClock} tone="gold" />
            <StatTile label="Absent" value={tally.absent} icon={CalendarX} tone="warn" />
          </div>

          <Card className="mt-4 p-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-sans text-sm font-semibold text-ink-700">
                Certificate threshold is {MIN_ATTENDANCE_FOR_CERTIFICATE}%
              </p>
              <p className="font-sans text-sm font-bold text-ink-900">{tally.rate}%</p>
            </div>
            <ProgressBar value={tally.rate} label="Attendance" tone={toneForRate(tally.rate)} />
            {short ? (
              <p className="mt-2 font-sans text-[0.8125rem] text-amber-700">
                You are below the threshold. Attendance is one of the requirements for a course
                certificate — speak to your instructor if something is getting in the way.
              </p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-emerald-700">
                <ShieldCheck aria-hidden className="size-3.5" />
                You are meeting the attendance requirement.
              </p>
            )}
            {tally.excused > 0 && (
              <p className="mt-1.5 font-sans text-xs text-ink-500">
                {tally.excused} excused absence{tally.excused === 1 ? '' : 's'} — these do not count
                against your rate.
              </p>
            )}
          </Card>

          <section className="mt-8">
            <h2 className="mb-3 font-sans text-lg font-bold text-ink-900">Class by class</h2>
            <DataTable>
              <Thead>
                <Tr>
                  <Th>Class</Th>
                  <Th className="hidden md:table-cell">Course</Th>
                  <Th>When</Th>
                  <Th className="text-right">Attendance</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map(({ session, batch, record }) => (
                  <Tr key={session.id}>
                    <Td>
                      <span className="font-semibold text-ink-900">{session.title}</span>
                      {record?.note && (
                        <span className="block font-sans text-xs text-ink-500">{record.note}</span>
                      )}
                    </Td>
                    <Td className="hidden md:table-cell">
                      <span className="font-sans text-xs text-ink-500">{batch.courseTitle}</span>
                    </Td>
                    <Td className="whitespace-nowrap font-sans text-xs text-ink-600">
                      {formatDateTime(session.scheduledAt)}
                    </Td>
                    <Td className="text-right">
                      <AttendanceBadge status={record?.status ?? null} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </DataTable>
          </section>
        </>
      )}
    </>
  )
}
