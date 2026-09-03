'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import type { PortalActionResult } from '@/lib/portal/guard'
import { cn } from '@/lib/utils'

/**
 * A question as the student sees it — no `correctIndex`.
 *
 * The omission is the security boundary, and it is expressed in the type so it
 * cannot be undone by a careless spread: the server builds these from
 * `quizzes.questions` and the answer key never enters the payload React
 * serialises into the page. Marking happens server-side in
 * `submitQuizAttempt`.
 */
export type PublicQuestion = {
  id: string
  prompt: string
  options: string[]
  points: number
}

type Answers = Record<string, number | null>

export function QuizRunner({
  questions,
  timeLimitMinutes,
  onSubmit,
}: {
  questions: PublicQuestion[]
  timeLimitMinutes: number
  onSubmit: (
    answers: { questionId: string; selectedIndex: number | null }[],
  ) => Promise<PortalActionResult>
}) {
  const router = useRouter()
  const [answers, setAnswers] = React.useState<Answers>({})
  const [pending, setPending] = React.useState(false)
  const [secondsLeft, setSecondsLeft] = React.useState(timeLimitMinutes * 60)

  const answered = questions.filter((question) => answers[question.id] != null).length

  const submit = React.useCallback(
    async (auto: boolean) => {
      setPending(true)

      const result = await onSubmit(
        questions.map((question) => ({
          questionId: question.id,
          selectedIndex: answers[question.id] ?? null,
        })),
      )

      setPending(false)

      if (!result.ok) {
        toast.error('Could not submit your attempt', { description: result.error })
        return
      }

      toast.success(auto ? 'Time is up — your answers were submitted' : 'Attempt submitted')
      router.refresh()
    },
    [answers, onSubmit, questions, router],
  )

  /**
   * The countdown is a courtesy, not the rule.
   *
   * It submits what the student has when it reaches zero so a timed quiz does
   * not silently lose their work, but a browser clock is trivially changed and
   * a closed tab never fires this at all. The deadline that actually binds is
   * `dueAt`, checked on the server when the attempt arrives.
   */
  React.useEffect(() => {
    if (timeLimitMinutes <= 0 || pending) return

    if (secondsLeft <= 0) {
      void submit(true)
      return
    }

    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, timeLimitMinutes, pending, submit])

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60)
  const seconds = Math.max(0, secondsLeft) % 60
  const runningLow = timeLimitMinutes > 0 && secondsLeft <= 60

  return (
    <div className="grid gap-5">
      <Card className="sticky top-4 z-10 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="font-sans text-sm font-semibold text-ink-700">
          {answered} of {questions.length} answered
        </p>

        {timeLimitMinutes > 0 && (
          <p
            className={cn(
              'inline-flex items-center gap-1.5 font-sans text-sm font-bold tabular-nums',
              runningLow ? 'text-red-600' : 'text-ink-700',
            )}
          >
            <Clock aria-hidden className="size-4" />
            {minutes}:{String(seconds).padStart(2, '0')}
          </p>
        )}
      </Card>

      <ol className="grid gap-4">
        {questions.map((question, index) => (
          <li key={question.id}>
            <Card className="p-5">
              <fieldset>
                <legend className="font-sans text-[0.9375rem] font-bold text-ink-900">
                  <span className="text-ink-400">{index + 1}.</span> {question.prompt}
                  <span className="ml-2 font-sans text-xs font-semibold text-ink-400">
                    {question.points} {question.points === 1 ? 'point' : 'points'}
                  </span>
                </legend>

                <div className="mt-4 grid gap-2">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex
                    const inputId = `${question.id}-${optionIndex}`

                    return (
                      <label
                        key={inputId}
                        htmlFor={inputId}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors',
                          selected
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-ink-200 bg-white hover:border-ink-300',
                        )}
                      >
                        <input
                          id={inputId}
                          type="radio"
                          name={question.id}
                          value={optionIndex}
                          checked={selected}
                          disabled={pending}
                          onChange={() =>
                            setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                          }
                          className="mt-1 size-4 shrink-0 accent-brand-700"
                        />
                        <span className="font-sans text-[0.9375rem] text-ink-800">{option}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="font-sans text-[0.875rem] text-ink-600">
          {answered < questions.length
            ? `${questions.length - answered} unanswered — those score zero.`
            : 'Every question answered.'}
        </p>

        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={pending}
          onClick={() => void submit(false)}
        >
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Submitting
            </>
          ) : (
            <>
              Submit attempt
              <Send aria-hidden />
            </>
          )}
        </Button>
      </Card>
    </div>
  )
}

/** Shown once an attempt has been marked. */
export function QuizResult({
  score,
  maxScore,
  passScore,
  attemptsLeft,
}: {
  score: number
  maxScore: number
  passScore: number
  attemptsLeft: number
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const passed = pct >= passScore

  return (
    <Card
      className={cn(
        'p-6 text-center',
        passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-gold-300 bg-gold-50/50',
      )}
    >
      <span
        className={cn(
          'mx-auto grid size-12 place-items-center rounded-2xl',
          passed ? 'bg-emerald-100 text-emerald-700' : 'bg-gold-100 text-gold-800',
        )}
      >
        <CheckCircle2 aria-hidden className="size-6" />
      </span>

      <p className="mt-4 font-sans text-3xl font-extrabold tracking-tight text-ink-900">{pct}%</p>
      <p className="mt-1 font-sans text-sm font-semibold text-ink-700">
        {score} out of {maxScore} · pass mark {passScore}%
      </p>
      <p className="mt-2 font-sans text-[0.875rem] text-ink-600">
        {passed ? 'You passed this quiz.' : 'You did not reach the pass mark on this attempt.'}
        {attemptsLeft > 0 && ` You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`}
      </p>
    </Card>
  )
}
