import type { Metadata } from 'next'
import Link from 'next/link'
import { FilePlus2 } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { PortalEmpty, ProgressBar, formatDateTime, relativeDays } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listInstructorAssignments, listInstructorBatches } from '@/lib/data/instructor'
import { percent } from '@/lib/portal/grading'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Assignments' }

export default async function InstructorAssignmentsPage() {
  const { id } = await requireInstructorAccount()

  const [assignments, batches] = await Promise.all([
    listInstructorAssignments(id),
    listInstructorBatches(id),
  ])

  const firstBatch = batches[0]?.batch.id

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Everything you have set, across every batch, with how much of it is marked."
        actions={
          firstBatch && (
            <Button asChild variant="primary" size="md">
              <Link href={`/instructor/assignments/new?batchId=${firstBatch}`}>
                <FilePlus2 aria-hidden />
                New assignment
              </Link>
            </Button>
          )
        }
      />

      {assignments.length === 0 ? (
        <PortalEmpty
          title="No assignments yet"
          description={
            batches.length === 0
              ? 'Once a batch is assigned to you, you can set work for it.'
              : 'Set your first piece of work and it appears on every enrolled student’s dashboard.'
          }
          action={
            firstBatch && (
              <Button asChild variant="primary" size="md">
                <Link href={`/instructor/assignments/new?batchId=${firstBatch}`}>
                  Create an assignment
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Assignment</Th>
              <Th className="hidden lg:table-cell">Batch</Th>
              <Th>Due</Th>
              <Th>Handed in</Th>
              <Th className="text-right">Marked</Th>
            </Tr>
          </Thead>
          <Tbody>
            {assignments.map(({ assignment, batch, submitted, graded, cohortSize }) => {
              const outstanding = submitted - graded

              return (
                <Tr key={assignment.id}>
                  <Td>
                    <Link
                      href={`/instructor/assignments/${assignment.id}`}
                      className="font-semibold text-ink-900 hover:text-brand-800"
                    >
                      {assignment.title}
                    </Link>
                    {!assignment.publishedAt && (
                      <Badge variant="outline" size="sm" className="ml-2">
                        Draft
                      </Badge>
                    )}
                    {outstanding > 0 && (
                      <Badge variant="gold" size="sm" className="ml-2">
                        {outstanding} to mark
                      </Badge>
                    )}
                  </Td>

                  <Td className="hidden lg:table-cell">
                    <span className="font-sans text-xs text-ink-500">{batch.name}</span>
                  </Td>

                  <Td className="whitespace-nowrap">
                    <span className="font-sans text-xs text-ink-600">
                      {formatDateTime(assignment.dueAt)}
                    </span>
                    <span className="block font-sans text-xs text-ink-400">
                      {relativeDays(assignment.dueAt)}
                    </span>
                  </Td>

                  <Td>
                    <div className="w-28">
                      <ProgressBar
                        value={percent(submitted, cohortSize)}
                        label={`${assignment.title} submissions`}
                      />
                      <span className="mt-1 block font-sans text-xs text-ink-500">
                        {submitted} of {cohortSize}
                      </span>
                    </div>
                  </Td>

                  <Td className="text-right">
                    <span className="font-sans text-sm font-bold text-ink-900">
                      {graded}
                      <span className="font-normal text-ink-400"> / {submitted}</span>
                    </span>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
