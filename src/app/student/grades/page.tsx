import type { Metadata } from 'next'
import Link from 'next/link'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { GradePill, PortalEmpty, ProgressBar, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { listStudentAssignments, listStudentBatches, listStudentQuizzes } from '@/lib/data/student'
import { GRADE_WEIGHTS, percent } from '@/lib/portal/grading'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Grades' }

export default async function StudentGradesPage() {
  const { id } = await requireStudentAccount()

  const [batches, assignments, quizzes] = await Promise.all([
    listStudentBatches(id),
    listStudentAssignments(id),
    listStudentQuizzes(id),
  ])

  return (
    <>
      <PageHeader
        title="Grades"
        description={`Assignments count for ${Math.round(GRADE_WEIGHTS.assignments * 100)}% of your mark and quizzes for ${Math.round(GRADE_WEIGHTS.quizzes * 100)}%. Attendance is reported separately and is not blended into the score.`}
      />

      {batches.length === 0 ? (
        <PortalEmpty
          title="No grades yet"
          description="Once you are enrolled and your first piece of work is marked, your grades appear here."
        />
      ) : (
        <div className="grid gap-10">
          {batches.map((batch) => {
            const batchAssignments = assignments.filter(
              (row) => row.batch.id === batch.batch.id,
            )
            const batchQuizzes = quizzes.filter((row) => row.batch.id === batch.batch.id)

            return (
              <section key={batch.batch.id}>
                {/* --------------------------------------------------- Header */}
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-sans text-lg font-bold text-ink-900">
                        {batch.batch.courseTitle}
                      </h2>
                      <p className="mt-0.5 font-sans text-xs text-ink-500">
                        {batch.batch.name} · {batch.instructorName}
                      </p>
                    </div>
                    <GradePill score={batch.grade.score} letter={batch.grade.letter} size="lg" />
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="font-sans text-xs font-semibold text-ink-600">
                          Assignments
                        </span>
                        <span className="font-sans text-xs font-bold text-ink-900">
                          {batch.grade.assignments === null ? '—' : `${batch.grade.assignments}%`}
                        </span>
                      </div>
                      <ProgressBar
                        value={batch.grade.assignments ?? 0}
                        label="Assignment average"
                      />
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="font-sans text-xs font-semibold text-ink-600">
                          Quizzes
                        </span>
                        <span className="font-sans text-xs font-bold text-ink-900">
                          {batch.grade.quizzes === null ? '—' : `${batch.grade.quizzes}%`}
                        </span>
                      </div>
                      <ProgressBar value={batch.grade.quizzes ?? 0} label="Quiz average" />
                    </div>
                  </div>
                </Card>

                {/* ---------------------------------------------- Assignments */}
                {batchAssignments.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                      Assignments
                    </h3>
                    <DataTable>
                      <Thead>
                        <Tr>
                          <Th>Assignment</Th>
                          <Th className="hidden sm:table-cell">Marked</Th>
                          <Th className="text-right">Raw</Th>
                          <Th className="text-right">Percent</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {batchAssignments.map(({ assignment, submission }) => (
                          <Tr key={assignment.id}>
                            <Td>
                              <Link
                                href={`/student/assignments/${assignment.id}`}
                                className="font-semibold text-ink-900 hover:text-brand-800"
                              >
                                {assignment.title}
                              </Link>
                              {assignment.weight === 0 && (
                                <Badge variant="neutral" size="sm" className="ml-2">
                                  Not counted
                                </Badge>
                              )}
                            </Td>
                            <Td className="hidden sm:table-cell font-sans text-xs text-ink-500">
                              {submission?.gradedAt ? formatDateTime(submission.gradedAt) : '—'}
                            </Td>
                            <Td className="text-right font-sans text-xs text-ink-600">
                              {submission?.score !== null && submission?.score !== undefined
                                ? `${submission.score} / ${assignment.maxScore}`
                                : '—'}
                            </Td>
                            <Td className="text-right">
                              <GradePill
                                score={
                                  submission?.score !== null && submission?.score !== undefined
                                    ? percent(submission.score, assignment.maxScore)
                                    : null
                                }
                                size="sm"
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </DataTable>
                  </div>
                )}

                {/* --------------------------------------------------- Quizzes */}
                {batchQuizzes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                      Quizzes
                    </h3>
                    <DataTable>
                      <Thead>
                        <Tr>
                          <Th>Quiz</Th>
                          <Th className="hidden sm:table-cell">Attempts</Th>
                          <Th className="text-right">Best</Th>
                          <Th className="text-right">Percent</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {batchQuizzes.map((row) => (
                          <Tr key={row.quiz.id}>
                            <Td>
                              <Link
                                href={`/student/quizzes/${row.quiz.id}`}
                                className="font-semibold text-ink-900 hover:text-brand-800"
                              >
                                {row.quiz.title}
                              </Link>
                              {row.best && (
                                <Badge
                                  variant={row.passed ? 'success' : 'outline'}
                                  size="sm"
                                  className="ml-2"
                                >
                                  {row.passed ? 'Passed' : 'Not passed'}
                                </Badge>
                              )}
                            </Td>
                            <Td className="hidden sm:table-cell font-sans text-xs text-ink-500">
                              {row.attempts.filter((a) => a.submittedAt).length} of{' '}
                              {row.quiz.maxAttempts}
                            </Td>
                            <Td className="text-right font-sans text-xs text-ink-600">
                              {row.best ? `${row.best.score} / ${row.best.maxScore}` : '—'}
                            </Td>
                            <Td className="text-right">
                              <GradePill
                                score={row.best ? percent(row.best.score, row.best.maxScore) : null}
                                size="sm"
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </DataTable>
                  </div>
                )}

                {batchAssignments.length === 0 && batchQuizzes.length === 0 && (
                  <Card className="mt-4 px-5 py-8 text-center">
                    <p className="font-sans text-[0.875rem] text-ink-500">
                      Nothing has been set on this course yet.
                    </p>
                  </Card>
                )}
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}
