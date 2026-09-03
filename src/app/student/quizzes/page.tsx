import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { GradePill, PortalEmpty, formatDateTime, relativeDays } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { listStudentQuizzes } from '@/lib/data/student'
import { percent } from '@/lib/portal/grading'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Quizzes' }

export default async function StudentQuizzesPage() {
  const { id } = await requireStudentAccount()
  const quizzes = await listStudentQuizzes(id)

  const now = new Date()

  return (
    <>
      <PageHeader
        title="Quizzes"
        description="Short assessments set by your instructors. Your best attempt is the one that counts."
      />

      {quizzes.length === 0 ? (
        <PortalEmpty
          title="No quizzes yet"
          description="When your instructor publishes a quiz it appears here."
        />
      ) : (
        <div className="grid gap-4">
          {quizzes.map((row) => {
            const closed = row.quiz.dueAt !== null && row.quiz.dueAt < now
            const canAttempt = row.attemptsLeft > 0 && !closed
            const bestPercent = row.best ? percent(row.best.score, row.best.maxScore) : null

            return (
              <Card key={row.quiz.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-sans text-base font-bold text-ink-900">
                        {row.quiz.title}
                      </h2>
                      {row.best && (
                        <Badge variant={row.passed ? 'success' : 'outline'} size="sm">
                          {row.passed ? 'Passed' : 'Not passed'}
                        </Badge>
                      )}
                      {closed && !row.best && (
                        <Badge variant="outline" size="sm">
                          Closed
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 font-sans text-xs text-ink-500">
                      {row.batch.courseTitle} · {row.quiz.questions.length} question
                      {row.quiz.questions.length === 1 ? '' : 's'}
                      {row.quiz.timeLimitMinutes > 0 && ` · ${row.quiz.timeLimitMinutes} min limit`}
                      {` · pass mark ${row.quiz.passScore}%`}
                    </p>

                    {row.quiz.description && (
                      <p className="mt-2 max-w-2xl text-[0.875rem] leading-relaxed text-ink-600">
                        {row.quiz.description}
                      </p>
                    )}

                    <p className="mt-2 font-sans text-xs text-ink-500">
                      {row.quiz.dueAt
                        ? `Closes ${formatDateTime(row.quiz.dueAt)} · ${relativeDays(row.quiz.dueAt)}`
                        : 'No closing date'}
                      {' · '}
                      {row.attemptsLeft > 0
                        ? `${row.attemptsLeft} of ${row.quiz.maxAttempts} attempts left`
                        : 'No attempts left'}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <GradePill score={bestPercent} />
                    <Button
                      asChild={canAttempt}
                      variant={canAttempt ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={!canAttempt}
                    >
                      {canAttempt ? (
                        <Link href={`/student/quizzes/${row.quiz.id}`}>
                          {row.attempts.length === 0 ? 'Start quiz' : 'Try again'}
                          <ArrowRight aria-hidden />
                        </Link>
                      ) : (
                        <span>{row.best ? 'Completed' : 'Unavailable'}</span>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
