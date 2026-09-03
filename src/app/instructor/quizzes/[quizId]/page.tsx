import type { Metadata } from 'next'
import { CheckCircle2, ListChecks, Users } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import {
  GradePill,
  PortalEmpty,
  ProgressBar,
  SectionHeading,
  StatTile,
  formatDateTime,
  toneForRate,
} from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { getQuizResults } from '@/lib/data/instructor'
import { percent } from '@/lib/portal/grading'
import { orNotFound } from '@/lib/portal/guard'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Quiz results' }

export default async function QuizResultsPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  const { quizId } = await params
  const { id } = await requireInstructorAccount()

  const { quiz, batch, rows, questionStats } = await orNotFound(getQuizResults(id, quizId))

  const attempted = rows.filter((row) => row.best).length
  const passed = rows.filter(
    (row) => row.best && percent(row.best.score, row.best.maxScore) >= quiz.passScore,
  ).length
  const average =
    attempted === 0
      ? null
      : Math.round(
          rows
            .filter((row) => row.best)
            .reduce((sum, row) => sum + percent(row.best!.score, row.best!.maxScore), 0) /
            attempted,
        )

  return (
    <>
      <PageHeader
        backHref="/instructor/quizzes"
        backLabel="All quizzes"
        title={quiz.title}
        description={`${batch.courseTitle} · ${batch.name} · ${quiz.questions.length} question${
          quiz.questions.length === 1 ? '' : 's'
        } · pass mark ${quiz.passScore}%${quiz.dueAt ? ` · closes ${formatDateTime(quiz.dueAt)}` : ''}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {quiz.publishedAt ? (
          <Badge variant="success" size="sm">
            Published
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            Draft — students cannot see this
          </Badge>
        )}
        <Badge variant="neutral" size="sm">
          {quiz.maxAttempts} attempt{quiz.maxAttempts === 1 ? '' : 's'} · weight {quiz.weight}
        </Badge>
        {quiz.timeLimitMinutes > 0 && (
          <Badge variant="neutral" size="sm">
            {quiz.timeLimitMinutes} minute limit
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Attempted"
          value={`${attempted} / ${rows.length}`}
          hint={`${rows.length - attempted} have not sat it`}
          icon={Users}
        />
        <StatTile
          label="Passed"
          value={passed}
          hint={attempted === 0 ? 'Nobody has sat it yet' : `Of ${attempted} who sat it`}
          icon={CheckCircle2}
          tone={attempted > 0 && passed === attempted ? 'positive' : 'brand'}
        />
        <StatTile
          label="Average score"
          value={average === null ? '—' : `${average}%`}
          hint="Best attempt per student"
          icon={ListChecks}
          tone={average !== null && average >= quiz.passScore ? 'positive' : 'warn'}
        />
      </div>

      {/* ------------------------------------------------- Question analysis */}
      <section className="mt-10">
        <SectionHeading title="How each question performed" />

        {attempted === 0 ? (
          <PortalEmpty
            title="No attempts yet"
            description="Once students start submitting, this shows which questions are tripping them up."
          />
        ) : (
          <div className="grid gap-3">
            {questionStats.map((stat, index) => {
              const rate = percent(stat.correct, stat.answered)

              return (
                <Card key={stat.question.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[0.9375rem] font-semibold text-ink-900">
                        <span className="text-ink-400">{index + 1}.</span> {stat.question.prompt}
                      </p>
                      <p className="mt-1 font-sans text-xs text-ink-500">
                        Answer:{' '}
                        <span className="font-semibold text-emerald-700">
                          {stat.question.options[stat.question.correctIndex]}
                        </span>
                      </p>
                    </div>

                    <div className="w-32 shrink-0">
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="font-sans text-xs text-ink-500">correct</span>
                        <span className="font-sans text-xs font-bold text-ink-900">{rate}%</span>
                      </div>
                      <ProgressBar
                        value={rate}
                        label={`Question ${index + 1} correct rate`}
                        tone={toneForRate(rate)}
                      />
                      <p className="mt-1 font-sans text-xs text-ink-400">
                        {stat.correct} of {stat.answered} answered
                      </p>
                    </div>
                  </div>

                  {rate < 40 && stat.answered > 0 && (
                    <p className="mt-3 border-t border-hairline pt-3 font-sans text-xs text-amber-700">
                      Fewer than half got this right — worth checking the wording, or reteaching the
                      topic.
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ Results */}
      <section className="mt-10">
        <SectionHeading title="Results by student" />

        <DataTable>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th className="hidden sm:table-cell">Attempts</Th>
              <Th className="hidden md:table-cell">Submitted</Th>
              <Th>Outcome</Th>
              <Th className="text-right">Best</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map(({ student, best, attempts }) => {
              const score = best ? percent(best.score, best.maxScore) : null

              return (
                <Tr key={student.id}>
                  <Td>
                    <span className="font-semibold text-ink-900">{student.studentName}</span>
                    <span className="block truncate font-sans text-xs text-ink-400">
                      {student.studentEmail}
                    </span>
                  </Td>
                  <Td className="hidden sm:table-cell font-sans text-xs text-ink-500">
                    {attempts} of {quiz.maxAttempts}
                  </Td>
                  <Td className="hidden md:table-cell whitespace-nowrap font-sans text-xs text-ink-600">
                    {best?.submittedAt ? formatDateTime(best.submittedAt) : '—'}
                  </Td>
                  <Td>
                    {score === null ? (
                      <Badge variant="outline" size="sm">
                        Not sat
                      </Badge>
                    ) : score >= quiz.passScore ? (
                      <Badge variant="success" size="sm">
                        Passed
                      </Badge>
                    ) : (
                      <Badge variant="gold" size="sm">
                        Not passed
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <GradePill score={score} size="sm" />
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </DataTable>
      </section>
    </>
  )
}
