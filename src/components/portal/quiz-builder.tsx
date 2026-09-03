'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, FieldError, FieldHint, Input, Label, Select, Textarea } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import type { QuizQuestion } from '@/db/schema'
import type { PortalActionResult } from '@/lib/portal/guard'
import { cn } from '@/lib/utils'

export type QuizDraft = {
  batchId: string
  title: string
  description: string
  timeLimitMinutes: number
  maxAttempts: number
  passScore: number
  weight: number
  dueAt: string
  publish: boolean
  questions: QuizQuestion[]
}

let counter = 0
function newQuestionId(): string {
  counter += 1
  return `q${Date.now().toString(36)}${counter}`
}

function blankQuestion(): QuizQuestion {
  return { id: newQuestionId(), prompt: '', options: ['', ''], correctIndex: 0, points: 1 }
}

/**
 * The quiz editor.
 *
 * Hand-rolled rather than driven by `SimpleForm`, because the shape is
 * genuinely nested — a variable number of questions, each with a variable
 * number of options and one of them marked correct. Flattening that into
 * `name="questions[2].options[1]"` fields would make the server reassemble a
 * structure the browser already holds, so the whole draft is posted as one
 * object and validated by `quizSchema` on arrival.
 *
 * Question ids are generated here and kept stable for the life of the draft.
 * They are what a stored attempt's answers refer to, so reordering or deleting
 * a question must never renumber the others.
 */
export function QuizBuilder({
  initial,
  batches,
  onSave,
  submitLabel,
}: {
  initial: QuizDraft
  batches: { value: string; label: string }[]
  onSave: (draft: QuizDraft) => Promise<PortalActionResult>
  submitLabel: string
}) {
  const router = useRouter()
  const formId = React.useId()
  const [draft, setDraft] = React.useState<QuizDraft>(() =>
    initial.questions.length > 0 ? initial : { ...initial, questions: [blankQuestion()] },
  )
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()

  function set<K extends keyof QuizDraft>(key: K, value: QuizDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateQuestion(index: number, patch: Partial<QuizQuestion>) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    }))
  }

  function setOption(questionIndex: number, optionIndex: number, value: string) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.map((option, j) => (j === optionIndex ? value : option)),
            }
          : question,
      ),
    }))
  }

  function addOption(questionIndex: number) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, i) =>
        i === questionIndex ? { ...question, options: [...question.options, ''] } : question,
      ),
    }))
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, i) => {
        if (i !== questionIndex) return question

        const options = question.options.filter((_, j) => j !== optionIndex)
        /* Removing the option that was marked correct, or one before it, would
           otherwise leave `correctIndex` pointing at a different answer. */
        const correctIndex =
          question.correctIndex === optionIndex
            ? 0
            : question.correctIndex > optionIndex
              ? question.correctIndex - 1
              : question.correctIndex

        return { ...question, options, correctIndex }
      }),
    }))
  }

  async function save() {
    setPending(true)
    setError(undefined)

    const result = await onSave(draft)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      toast.error('Could not save the quiz', { description: result.error })
      return
    }

    toast.success(result.message ?? 'Quiz saved')
    router.refresh()
  }

  const totalPoints = draft.questions.reduce((sum, question) => sum + (question.points || 0), 0)

  return (
    <div className="grid max-w-3xl gap-6 pb-24">
      {/* ---------------------------------------------------------- Settings */}
      <Card className="p-6">
        <h2 className="font-sans text-base font-bold text-ink-900">Quiz settings</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={`${formId}-batch`} required>
              Batch
            </Label>
            <Select
              id={`${formId}-batch`}
              options={batches}
              value={draft.batchId}
              onChange={(event) => set('batchId', event.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={`${formId}-title`} required>
              Title
            </Label>
            <Input
              id={`${formId}-title`}
              value={draft.title}
              placeholder="Week 4 — JavaScript fundamentals"
              onChange={(event) => set('title', event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${formId}-limit`}>Time limit (minutes)</Label>
            <Input
              id={`${formId}-limit`}
              type="number"
              min={0}
              max={300}
              value={draft.timeLimitMinutes}
              onChange={(event) => set('timeLimitMinutes', Number(event.target.value))}
            />
            <FieldHint>0 for no limit.</FieldHint>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${formId}-attempts`}>Attempts allowed</Label>
            <Input
              id={`${formId}-attempts`}
              type="number"
              min={1}
              max={10}
              value={draft.maxAttempts}
              onChange={(event) => set('maxAttempts', Number(event.target.value))}
            />
            <FieldHint>The best attempt is the one that counts.</FieldHint>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${formId}-pass`}>Pass mark (%)</Label>
            <Input
              id={`${formId}-pass`}
              type="number"
              min={0}
              max={100}
              value={draft.passScore}
              onChange={(event) => set('passScore', Number(event.target.value))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`${formId}-weight`}>Weight</Label>
            <Input
              id={`${formId}-weight`}
              type="number"
              min={0}
              max={20}
              value={draft.weight}
              onChange={(event) => set('weight', Number(event.target.value))}
            />
            <FieldHint>0 excludes it from the grade.</FieldHint>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={`${formId}-due`}>Closes</Label>
            <Input
              id={`${formId}-due`}
              type="datetime-local"
              value={draft.dueAt}
              onChange={(event) => set('dueAt', event.target.value)}
            />
            <FieldHint>Optional. After this, no further attempts are accepted.</FieldHint>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor={`${formId}-description`}>Description</Label>
            <Textarea
              id={`${formId}-description`}
              rows={3}
              value={draft.description}
              placeholder="What this covers, and anything students should read first."
              onChange={(event) => set('description', event.target.value)}
            />
          </div>

          <label className="flex items-start gap-3 sm:col-span-2">
            <Checkbox
              checked={draft.publish}
              onChange={(event) => set('publish', event.target.checked)}
            />
            <span>
              <span className="font-sans text-sm font-semibold text-ink-800">Publish now</span>
              <span className="block font-sans text-[0.8125rem] text-ink-500">
                Unpublished quizzes are invisible to students.
              </span>
            </span>
          </label>
        </div>
      </Card>

      {/* --------------------------------------------------------- Questions */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 className="font-sans text-lg font-bold text-ink-900">
            Questions{' '}
            <span className="font-sans text-sm font-semibold text-ink-400">
              {draft.questions.length} · {totalPoints} points
            </span>
          </h2>
        </div>

        <div className="grid gap-4">
          {draft.questions.map((question, questionIndex) => (
            <Card key={question.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-sans text-sm font-bold text-ink-900">
                  Question {questionIndex + 1}
                </p>

                {draft.questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove question ${questionIndex + 1}`}
                    className="text-ink-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        questions: current.questions.filter((_, i) => i !== questionIndex),
                      }))
                    }
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </div>

              <div className="mt-3 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`${question.id}-prompt`} required>
                    Question
                  </Label>
                  <Textarea
                    id={`${question.id}-prompt`}
                    rows={2}
                    value={question.prompt}
                    onChange={(event) =>
                      updateQuestion(questionIndex, { prompt: event.target.value })
                    }
                  />
                </div>

                <fieldset>
                  <legend className="font-sans text-sm font-semibold text-ink-800">
                    Options — select the correct one
                  </legend>

                  <div className="mt-2 grid gap-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={`${question.id}-${optionIndex}`}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border-2 px-3 py-2 transition-colors',
                          question.correctIndex === optionIndex
                            ? 'border-emerald-500 bg-emerald-50/60'
                            : 'border-ink-200',
                        )}
                      >
                        <input
                          type="radio"
                          name={`${question.id}-correct`}
                          checked={question.correctIndex === optionIndex}
                          aria-label={`Option ${optionIndex + 1} is correct`}
                          onChange={() =>
                            updateQuestion(questionIndex, { correctIndex: optionIndex })
                          }
                          className="size-4 shrink-0 accent-emerald-600"
                        />

                        <Input
                          className="h-10 border-0 bg-transparent px-0 focus:ring-0"
                          value={option}
                          placeholder={`Option ${optionIndex + 1}`}
                          aria-label={`Option ${optionIndex + 1} text`}
                          onChange={(event) =>
                            setOption(questionIndex, optionIndex, event.target.value)
                          }
                        />

                        {question.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove option ${optionIndex + 1}`}
                            className="shrink-0 text-ink-400 hover:text-red-600"
                            onClick={() => removeOption(questionIndex, optionIndex)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {question.options.length < 8 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => addOption(questionIndex)}
                    >
                      <Plus aria-hidden />
                      Add option
                    </Button>
                  )}
                </fieldset>

                <div className="grid w-32 gap-2">
                  <Label htmlFor={`${question.id}-points`}>Points</Label>
                  <Input
                    id={`${question.id}-points`}
                    type="number"
                    min={1}
                    max={100}
                    value={question.points}
                    onChange={(event) =>
                      updateQuestion(questionIndex, { points: Number(event.target.value) })
                    }
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className="mt-4"
          onClick={() =>
            setDraft((current) => ({ ...current, questions: [...current.questions, blankQuestion()] }))
          }
        >
          <Plus aria-hidden />
          Add question
        </Button>
      </div>

      <FieldError>{error}</FieldError>

      <div className="flex justify-end">
        <Button type="button" variant="primary" size="lg" disabled={pending} onClick={save}>
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Saving
            </>
          ) : (
            <>
              {submitLabel}
              <Save aria-hidden />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
