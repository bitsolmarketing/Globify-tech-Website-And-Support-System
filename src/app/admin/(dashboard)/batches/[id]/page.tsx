import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminPageHeader } from '@/components/admin/page-header'
import { EnrolStudent } from '@/components/admin/enrol-student'
import { SimpleForm } from '@/components/admin/simple-form'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { ActionButton } from '@/components/portal/action-button'
import { BatchStatusBadge, EnrollmentBadge, formatDateTime } from '@/components/portal/ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ActionResult } from '@/lib/admin/guard'
import {
  getBatch,
  listBatchStudents,
  listCourseOptions,
  listPortalUsers,
} from '@/lib/data/portal'
import { batchSchema, type BatchValues } from '@/lib/portal/schemas'

import {
  enrollStudentAction,
  setEnrollmentStatusAction,
  updateBatchAction,
} from '../actions'
import { batchFields } from '../batch-fields'

export const metadata: Metadata = { title: 'Batch' }

export default async function AdminBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const batch = await getBatch(id)
  if (!batch) notFound()

  const [courses, instructors, enrolled, allStudents] = await Promise.all([
    listCourseOptions(),
    listPortalUsers('instructor'),
    listBatchStudents(id, true),
    listPortalUsers('student'),
  ])

  const enrolledIds = new Set(enrolled.map((row) => row.studentId))
  const available = allStudents.filter((student) => !enrolledIds.has(student.id))

  async function save(values: BatchValues): Promise<ActionResult> {
    'use server'
    return updateBatchAction(id, values)
  }

  return (
    <>
      <AdminPageHeader
        backHref="/admin/batches"
        backLabel="Batches"
        title={batch.name}
        description={`${batch.code} · ${batch.courseTitle}`}
        actions={
          <Button asChild variant="secondary" size="md">
            <Link href={`/instructor/batches/${batch.id}`}>View as instructor</Link>
          </Button>
        }
      />

      <div className="mb-6">
        <BatchStatusBadge status={batch.status} />
      </div>

      <div className="grid gap-8">
        <SimpleForm<BatchValues>
          schema={batchSchema as never}
          defaultValues={{
            courseId: batch.courseId,
            code: batch.code,
            name: batch.name,
            instructorId: batch.instructorId,
            startDate: batch.startDate,
            endDate: batch.endDate ?? '',
            schedule: batch.schedule ?? '',
            mode: batch.mode,
            capacity: batch.capacity,
            meetingUrl: batch.meetingUrl ?? '',
            status: batch.status,
            notes: batch.notes ?? '',
          }}
          fields={batchFields(courses, instructors)}
          sectionTitle="Batch"
          onSubmitAction={save}
          cancelHref="/admin/batches"
          submitLabel="Save batch"
          successMessage="Batch updated"
          successDescription="The instructor and enrolled students see the change immediately."
        />

        {/* ------------------------------------------------------- Enrolments */}
        <Card className="p-6">
          <h2 className="font-sans text-base font-bold text-ink-900">
            Enrolments ({enrolled.filter((row) => row.status !== 'dropped').length}
            {batch.capacity > 0 ? ` of ${batch.capacity}` : ''})
          </h2>
          <p className="mt-1 text-[0.9375rem] text-ink-500">
            Who is on this batch. Enrolling someone gives them the course on their dashboard
            immediately.
          </p>

          <div className="mt-5">
            <EnrolStudent
              students={available.map((student) => ({
                id: student.id,
                label: `${student.name} — ${student.email}`,
              }))}
              action={async (studentId: string) => {
                'use server'
                return enrollStudentAction(id, studentId)
              }}
            />
          </div>

          {enrolled.length > 0 && (
            <div className="mt-6">
              <DataTable>
                <Thead>
                  <Tr>
                    <Th>Student</Th>
                    <Th className="hidden sm:table-cell">Enrolled</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Change</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {enrolled.map((row) => (
                    <Tr key={row.id}>
                      <Td>
                        <Link
                          href={`/admin/portal-users/${row.studentId}`}
                          className="font-semibold text-ink-900 hover:text-brand-800"
                        >
                          {row.studentName}
                        </Link>
                        <span className="block truncate font-sans text-xs text-ink-400">
                          {row.studentEmail}
                        </span>
                      </Td>

                      <Td className="hidden sm:table-cell whitespace-nowrap font-sans text-xs text-ink-500">
                        {formatDateTime(row.enrolledAt)}
                      </Td>

                      <Td>
                        <EnrollmentBadge status={row.status} />
                      </Td>

                      <Td>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {row.status !== 'dropped' ? (
                            <ActionButton
                              action={async () => {
                                'use server'
                                const result = await setEnrollmentStatusAction(
                                  id,
                                  row.id,
                                  'dropped',
                                )
                                return result.ok
                                  ? { ok: true }
                                  : { ok: false, error: result.error }
                              }}
                              confirmLabel="Confirm drop"
                              variant="ghost"
                              size="sm"
                              successMessage="Enrolment dropped"
                            >
                              Drop
                            </ActionButton>
                          ) : (
                            <ActionButton
                              action={async () => {
                                'use server'
                                const result = await setEnrollmentStatusAction(id, row.id, 'active')
                                return result.ok
                                  ? { ok: true }
                                  : { ok: false, error: result.error }
                              }}
                              variant="secondary"
                              size="sm"
                              successMessage="Enrolment restored"
                            >
                              Restore
                            </ActionButton>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </DataTable>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
