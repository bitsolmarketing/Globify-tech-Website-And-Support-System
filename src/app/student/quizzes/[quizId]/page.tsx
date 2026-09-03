import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { QuizResult, QuizRunner, type PublicQuestion } from '@/components/portal/quiz-runner'
import { formatDateTime } from '@/components/portal/ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { QuizAnswer } from '@/db/schema'
import { getStudentQuiz, submitQuizAttempt } from '@/lib/data/student'
import { percent } from '@/lib/portal/grading'
import { orNotFound, runPortalAction, type PortalActionResult } from '@/lib/portal/guard'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Quiz' }

export default async function StudentQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  const { quizId } = await params
  const { id } = await requireStudentAccount()

  const state = await orNotFound(getStudentQuiz(id, quizId))
  const { quiz, batch, best, attemptsLeft } = state

  const closed = quiz.dueAt !== null && quiz.dueAt < new Date()
  const canAttempt = attemptsLeft > 0 && !closed

  /**
   * The answer key is stripped here, on the server.
   *
   * `quiz.questions` carries `correctIndex`; what crosses into the client
   * component must not, or the marks are available in the page source. The
   * mapping is explicit rather than a spread-and-delete for exactly that
   * reason — a spread would silently start leaking the day a field is added.
   */
  const publicQuestions: PublicQuestion[] = quiz.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    points: question.points,
  }))

  async function submit(answers: QuizAnswer[]): Promise<PortalActionResult> {
    'use server'

    return runPortalAction('student', async (user) => {
      const result = await submitQuizAttempt(user.id, quizId, answers)

      revalidatePath(`/student/quizzes/${quizId}`)
      revalidatePath('/student/quizzes')
      revalidatePath('/student/grades')

      return result.passed
        ? `Passed with ${percent(result.score, result.maxScore)}%`
        : `Scored ${percent(result.score, result.maxScore)}%`
    })
  }

  return (
    <>
      <PageHeader
        backHref="/student/quizzes"
        backLabel="All quizzes"
        title={quiz.title}
        description={`${batch.courseTitle} · ${quiz.questions.length} question${
          quiz.questions.length === 1 ? '' : 's'
        }${quiz.timeLimitMinutes > 0 ? ` · ${quiz.timeLimitMinutes} minute limit` : ''} · pass mark ${quiz.passScore}%`}
      />

      {quiz.description && (
        <Card className="mb-6 p-5">
          <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-700">
            {quiz.description}
          </p>
        </Card>
      )}

      {best && (
        <div className="mb-6">
          <QuizResult
            score={best.score}
            maxScore={best.maxScore}
            passScore={quiz.passScore}
            attemptsLeft={attemptsLeft}
          />
          <p className="mt-2 text-center font-sans text-xs text-ink-500">
            Best of {state.attempts.filter((row) => row.submittedAt).length} attempt
            {state.attempts.filter((row) => row.submittedAt).length === 1 ? '' : 's'}
            {best.submittedAt ? ` · last submitted ${formatDateTime(best.submittedAt)}` : ''}
          </p>
        </div>
      )}

      {canAttempt ? (
        <QuizRunner
          questions={publicQuestions}
          timeLimitMinutes={quiz.timeLimitMinutes}
          onSubmit={submit}
        />
      ) : (
        <Card className="px-6 py-10 text-center">
          <p className="font-sans text-[0.9375rem] text-ink-600">
            {closed
              ? 'This quiz has closed.'
              : 'You have used every attempt for this quiz.'}
          </p>
          <Button asChild variant="secondary" size="md" className="mt-4">
            <Link href="/student/quizzes">Back to quizzes</Link>
          </Button>
        </Card>
      )}
    </>
  )
}
