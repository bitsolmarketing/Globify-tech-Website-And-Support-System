import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Award } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { ActionButton } from '@/components/portal/action-button'
import { PortalEmpty, SectionHeading, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  getBatchRoster,
  listInstructorBatches,
  listInstructorCertificates,
  revokeCertificate,
} from '@/lib/data/instructor'
import {
  MIN_ATTENDANCE_FOR_CERTIFICATE,
  MIN_SCORE_FOR_CERTIFICATE,
} from '@/lib/portal/grading'
import { runPortalAction, type PortalActionResult } from '@/lib/portal/guard'
import { requireInstructorAccount } from '@/lib/portal/session'

import { issueCertificateAction } from '../batches/[batchId]/actions'

export const metadata: Metadata = { title: 'Certificates' }

export default async function InstructorCertificatesPage() {
  const { id } = await requireInstructorAccount()

  const [batches, issued] = await Promise.all([
    listInstructorBatches(id),
    listInstructorCertificates(id),
  ])

  /* Only cohorts that have finished or are finishing are worth scanning for
     candidates — an upcoming batch has nobody who could qualify. */
  const rosters = await Promise.all(
    batches
      .filter((row) => row.batch.status === 'active' || row.batch.status === 'completed')
      .map((row) => getBatchRoster(id, row.batch.id)),
  )

  const ready = rosters.flatMap(({ batch, entries }) =>
    entries
      .filter((entry) => !entry.certificate && entry.eligibility.eligible)
      .map((entry) => ({ batch, entry })),
  )

  const blocked = rosters.flatMap(({ batch, entries }) =>
    entries
      .filter((entry) => !entry.certificate && !entry.eligibility.eligible)
      .map((entry) => ({ batch, entry })),
  )

  async function revoke(certificateId: string): Promise<PortalActionResult> {
    'use server'

    return runPortalAction('instructor', async (user) => {
      await revokeCertificate(user.id, certificateId)
      revalidatePath('/instructor/certificates')
    })
  }

  return (
    <>
      <PageHeader
        title="Certificates"
        description={`A student qualifies once the curriculum is complete, every submission is marked, and they hold at least ${MIN_SCORE_FOR_CERTIFICATE}% overall with ${MIN_ATTENDANCE_FOR_CERTIFICATE}% attendance.`}
      />

      {/* -------------------------------------------------------- Ready now */}
      <section>
        <SectionHeading title={`Ready to issue (${ready.length})`} />

        {ready.length === 0 ? (
          <PortalEmpty
            title="Nobody is ready yet"
            description="Students appear here the moment they meet every requirement."
          />
        ) : (
          <DataTable>
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th className="hidden sm:table-cell">Batch</Th>
                <Th>Score</Th>
                <Th className="hidden md:table-cell">Attendance</Th>
                <Th className="text-right">Issue</Th>
              </Tr>
            </Thead>
            <Tbody>
              {ready.map(({ batch, entry }) => (
                <Tr key={entry.student.id}>
                  <Td>
                    <span className="font-semibold text-ink-900">{entry.student.studentName}</span>
                    <span className="block truncate font-sans text-xs text-ink-400">
                      {entry.student.studentEmail}
                    </span>
                  </Td>
                  <Td className="hidden sm:table-cell font-sans text-xs text-ink-500">
                    {batch.name}
                  </Td>
                  <Td>
                    <Badge variant="success" size="sm">
                      {entry.grade.score}% · {entry.grade.letter}
                    </Badge>
                  </Td>
                  <Td className="hidden md:table-cell font-sans text-xs text-ink-600">
                    {entry.attendance.rate}%
                  </Td>
                  <Td className="text-right">
                    <ActionButton
                      action={async () => {
                        'use server'
                        return issueCertificateAction(batch.id, entry.student.studentId)
                      }}
                      confirmLabel="Confirm issue"
                      variant="primary"
                      size="sm"
                      icon={<Award aria-hidden />}
                    >
                      Issue
                    </ActionButton>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
        )}
      </section>

      {/* ---------------------------------------------------------- Blocked */}
      {blocked.length > 0 && (
        <section className="mt-10">
          <SectionHeading title={`Not yet eligible (${blocked.length})`} />
          <div className="grid gap-3">
            {blocked.map(({ batch, entry }) => (
              <Card key={entry.student.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-bold text-ink-900">
                      {entry.student.studentName}
                    </p>
                    <p className="font-sans text-xs text-ink-400">{batch.name}</p>
                  </div>

                  <ul className="flex flex-wrap justify-end gap-1.5">
                    {!entry.eligibility.eligible &&
                      entry.eligibility.reasons.map((reason) => (
                        <li key={reason}>
                          <Badge variant="outline" size="sm">
                            {reason}
                          </Badge>
                        </li>
                      ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- Issued */}
      <section className="mt-10">
        <SectionHeading title={`Issued (${issued.length})`} />

        {issued.length === 0 ? (
          <PortalEmpty
            title="None issued yet"
            description="Certificates you issue are listed here with their serial numbers."
          />
        ) : (
          <DataTable>
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th className="hidden sm:table-cell">Course</Th>
                <Th>Serial</Th>
                <Th className="hidden md:table-cell">Issued</Th>
                <Th className="text-right">Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {issued.map((certificate) => (
                <Tr key={certificate.id}>
                  <Td>
                    <span className="font-semibold text-ink-900">{certificate.studentName}</span>
                    <span className="block font-sans text-xs text-ink-400">
                      {certificate.batchName}
                    </span>
                  </Td>
                  <Td className="hidden sm:table-cell font-sans text-xs text-ink-500">
                    {certificate.courseTitle}
                  </Td>
                  <Td>
                    <Link
                      href={`/verify/${certificate.serial}`}
                      target="_blank"
                      className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                    >
                      {certificate.serial}
                    </Link>
                    <span className="block font-sans text-xs text-ink-400">
                      {certificate.grade} · {certificate.finalScore}%
                    </span>
                  </Td>
                  <Td className="hidden md:table-cell whitespace-nowrap font-sans text-xs text-ink-600">
                    {formatDateTime(certificate.issuedAt)}
                  </Td>
                  <Td className="text-right">
                    {certificate.revokedAt ? (
                      <Badge variant="outline" size="sm">
                        Withdrawn
                      </Badge>
                    ) : (
                      <ActionButton
                        action={async () => {
                          'use server'
                          return revoke(certificate.id)
                        }}
                        confirmLabel="Confirm withdrawal"
                        variant="ghost"
                        size="sm"
                        successMessage="Certificate withdrawn"
                      >
                        Withdraw
                      </ActionButton>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
        )}
      </section>
    </>
  )
}
