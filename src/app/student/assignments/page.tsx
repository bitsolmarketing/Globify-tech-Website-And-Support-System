import type { Metadata } from 'next'
import Link from 'next/link'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { GradePill, PortalEmpty, formatDateTime, relativeDays } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { listStudentAssignments, type StudentAssignment } from '@/lib/data/student'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Assignments' }

const STATE: Record<
  StudentAssignment['state'],
  { label: string; variant: 'brand' | 'success' | 'gold' | 'outline' | 'neutral' }
> = {
  'not-submitted': { label: 'To do', variant: 'brand' },
  overdue: { label: 'Overdue', variant: 'gold' },
  submitted: { label: 'Awaiting mark', variant: 'neutral' },
  graded: { label: 'Marked', variant: 'success' },
  resubmit: { label: 'Resubmit', variant: 'gold' },
}

export default async function StudentAssignmentsPage() {
  const { id } = await requireStudentAccount()
  const rows = await listStudentAssignments(id)

  /* Outstanding work first, then everything else. Sorting purely by deadline
     buries a piece of overdue work under next month's reading. */
  const outstanding = rows.filter((row) =>
    ['not-submitted', 'overdue', 'resubmit'].includes(row.state),
  )
  const finished = rows.filter((row) => ['submitted', 'graded'].includes(row.state))

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Everything your instructors have set, across all your courses."
      />

      {rows.length === 0 ? (
        <PortalEmpty
          title="No assignments yet"
          description="Once your instructor publishes an assignment it appears here with its deadline."
        />
      ) : (
        <div className="grid gap-8">
          {outstanding.length > 0 && (
            <AssignmentTable title="Outstanding" rows={outstanding} showDue />
          )}
          {finished.length > 0 && <AssignmentTable title="Handed in" rows={finished} />}
        </div>
      )}
    </>
  )
}

function AssignmentTable({
  title,
  rows,
  showDue = false,
}: {
  title: string
  rows: StudentAssignment[]
  showDue?: boolean
}) {
  return (
    <section>
      <h2 className="mb-3 font-sans text-lg font-bold text-ink-900">{title}</h2>
      <DataTable>
        <Thead>
          <Tr>
            <Th>Assignment</Th>
            <Th className="hidden md:table-cell">Course</Th>
            <Th>Due</Th>
            <Th>Status</Th>
            <Th className="text-right">Mark</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map(({ assignment, batch, submission, state }) => (
            <Tr key={assignment.id}>
              <Td>
                <Link
                  href={`/student/assignments/${assignment.id}`}
                  className="font-semibold text-ink-900 hover:text-brand-800"
                >
                  {assignment.title}
                </Link>
                {submission?.late && (
                  <span className="ml-2 font-sans text-xs text-amber-700">handed in late</span>
                )}
              </Td>
              <Td className="hidden md:table-cell">
                <span className="truncate font-sans text-xs text-ink-500">{batch.courseTitle}</span>
              </Td>
              <Td className="whitespace-nowrap">
                <span className="font-sans text-xs text-ink-600">
                  {formatDateTime(assignment.dueAt)}
                </span>
                {showDue && (
                  <span className="block font-sans text-xs text-ink-400">
                    {relativeDays(assignment.dueAt)}
                  </span>
                )}
              </Td>
              <Td>
                <Badge variant={STATE[state].variant} size="sm">
                  {STATE[state].label}
                </Badge>
              </Td>
              <Td className="text-right">
                <GradePill
                  score={
                    submission?.score !== null && submission?.score !== undefined
                      ? Math.round((submission.score / assignment.maxScore) * 100)
                      : null
                  }
                  size="sm"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </DataTable>
    </section>
  )
}
