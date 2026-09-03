import type { Metadata } from 'next'
import Link from 'next/link'
import { ClipboardCheck } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { PortalEmpty, SectionHeading, formatDateTime, relativeDays } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listInstructorBatches, listSessions } from '@/lib/data/instructor'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Attendance' }

export default async function InstructorAttendancePage() {
  const { id } = await requireInstructorAccount()
  const batches = await listInstructorBatches(id)

  /* One query per batch, and an instructor has a handful — the alternative is
     a cross-batch session query that would need its own ownership filter. */
  const perBatch = await Promise.all(
    batches.map(async (row) => ({
      batch: row.batch,
      sessions: await listSessions(id, row.batch.id),
    })),
  )

  const now = new Date()
  const outstanding = perBatch.flatMap(({ batch, sessions }) =>
    sessions
      .filter(
        (session) =>
          session.scheduledAt <= now &&
          !session.attendanceMarkedAt &&
          session.status === 'scheduled',
      )
      .map((session) => ({ batch, session })),
  )

  const recent = perBatch
    .flatMap(({ batch, sessions }) =>
      sessions.filter((session) => session.attendanceMarkedAt).map((session) => ({ batch, session })),
    )
    .sort((a, b) => b.session.scheduledAt.getTime() - a.session.scheduledAt.getTime())
    .slice(0, 15)

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Registers waiting to be taken, and the ones you have already saved."
      />

      {batches.length === 0 ? (
        <PortalEmpty
          title="No batches assigned"
          description="Once a cohort is assigned to you, its classes and registers appear here."
        />
      ) : (
        <>
          <section>
            <SectionHeading title={`Registers to take (${outstanding.length})`} />

            {outstanding.length === 0 ? (
              <PortalEmpty
                title="Every register is taken"
                description="No class has been held without attendance being saved."
              />
            ) : (
              <DataTable>
                <Thead>
                  <Tr>
                    <Th>Class</Th>
                    <Th className="hidden sm:table-cell">Batch</Th>
                    <Th>Held</Th>
                    <Th className="text-right">Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {outstanding.map(({ batch, session }) => (
                    <Tr key={session.id}>
                      <Td>
                        <span className="font-semibold text-ink-900">{session.title}</span>
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <span className="font-sans text-xs text-ink-500">{batch.name}</span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="font-sans text-xs text-ink-600">
                          {formatDateTime(session.scheduledAt)}
                        </span>
                        <span className="block font-sans text-xs text-amber-700">
                          {relativeDays(session.scheduledAt)}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <Button asChild variant="primary" size="sm">
                          <Link href={`/instructor/sessions/${session.id}/attendance`}>
                            <ClipboardCheck aria-hidden />
                            Take register
                          </Link>
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </DataTable>
            )}
          </section>

          {recent.length > 0 && (
            <section className="mt-10">
              <SectionHeading title="Recently taken" />
              <DataTable>
                <Thead>
                  <Tr>
                    <Th>Class</Th>
                    <Th className="hidden sm:table-cell">Batch</Th>
                    <Th>Held</Th>
                    <Th className="text-right">Register</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recent.map(({ batch, session }) => (
                    <Tr key={session.id}>
                      <Td>
                        <Link
                          href={`/instructor/sessions/${session.id}/attendance`}
                          className="font-semibold text-ink-900 hover:text-brand-800"
                        >
                          {session.title}
                        </Link>
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <span className="font-sans text-xs text-ink-500">{batch.name}</span>
                      </Td>
                      <Td className="whitespace-nowrap font-sans text-xs text-ink-600">
                        {formatDateTime(session.scheduledAt)}
                      </Td>
                      <Td className="text-right">
                        <Badge variant="success" size="sm">
                          Saved
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </DataTable>
            </section>
          )}
        </>
      )}
    </>
  )
}
