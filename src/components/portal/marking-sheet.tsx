'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2, Save } from 'lucide-react'

import { SubmissionBadge, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, Input, Label, Textarea } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import type { SubmissionStatus } from '@/db/schema'
import type { PortalActionResult } from '@/lib/portal/guard'

export type MarkingRow = {
  submissionId: string | null
  studentId: string
  studentName: string
  studentEmail: string
  url: string | null
  notes: string | null
  submittedAt: Date | null
  late: boolean
  status: SubmissionStatus | null
  score: number | null
  feedback: string | null
}

/**
 * Marking, one student at a time, on one page.
 *
 * Each card saves independently rather than the whole sheet at once: marking
 * thirty pieces of work is done in sittings, and a single Save at the bottom
 * means a closed laptop loses an hour of feedback. The trade is one request per
 * student, which is the right way round for work that is slow to produce and
 * quick to send.
 */
export function MarkingSheet({
  rows,
  maxScore,
  onGrade,
}: {
  rows: MarkingRow[]
  maxScore: number
  onGrade: (input: {
    submissionId: string
    score: number | null
    feedback: string
    status: 'graded' | 'resubmit'
  }) => Promise<PortalActionResult>
}) {
  return (
    <div className="grid gap-4">
      {rows.map((row) => (
        <MarkingCard key={row.studentId} row={row} maxScore={maxScore} onGrade={onGrade} />
      ))}
    </div>
  )
}

function MarkingCard({
  row,
  maxScore,
  onGrade,
}: {
  row: MarkingRow
  maxScore: number
  onGrade: (input: {
    submissionId: string
    score: number | null
    feedback: string
    status: 'graded' | 'resubmit'
  }) => Promise<PortalActionResult>
}) {
  const router = useRouter()
  const formId = React.useId()
  const [score, setScore] = React.useState(row.score === null ? '' : String(row.score))
  const [feedback, setFeedback] = React.useState(row.feedback ?? '')
  const [pending, setPending] = React.useState<'graded' | 'resubmit' | null>(null)
  const [error, setError] = React.useState<string | undefined>()

  async function save(status: 'graded' | 'resubmit') {
    if (!row.submissionId) return

    if (status === 'graded') {
      const parsed = Number(score)
      if (score.trim() === '' || Number.isNaN(parsed)) {
        setError('Enter a mark.')
        return
      }
      if (parsed < 0 || parsed > maxScore) {
        setError(`The mark must be between 0 and ${maxScore}.`)
        return
      }
    }

    setPending(status)
    setError(undefined)

    const result = await onGrade({
      submissionId: row.submissionId,
      score: status === 'graded' ? Number(score) : null,
      feedback,
      status,
    })

    setPending(null)

    if (!result.ok) {
      setError(result.error)
      return
    }

    toast.success(
      status === 'graded' ? `${row.studentName} marked` : `Sent back to ${row.studentName}`,
    )
    router.refresh()
  }

  /* Nothing handed in — shown, not hidden. The gap is the information an
     instructor is looking for when they open this page. */
  if (!row.submissionId) {
    return (
      <Card className="border-dashed p-5 opacity-80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans text-[0.9375rem] font-bold text-ink-900">{row.studentName}</p>
            <p className="truncate font-sans text-xs text-ink-400">{row.studentEmail}</p>
          </div>
          <SubmissionBadge status={null} />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[0.9375rem] font-bold text-ink-900">{row.studentName}</p>
          <p className="truncate font-sans text-xs text-ink-400">{row.studentEmail}</p>
          <p className="mt-1 font-sans text-xs text-ink-500">
            Submitted {row.submittedAt ? formatDateTime(row.submittedAt) : '—'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {row.late && (
            <Badge variant="gold" size="sm">
              Late
            </Badge>
          )}
          <SubmissionBadge status={row.status} />
        </div>
      </div>

      {/* ------------------------------------------------------ What they sent */}
      <div className="mt-4 rounded-xl bg-ink-50/70 p-4">
        {row.url && (
          <Button asChild variant="link" size="sm" className="-ml-3">
            <a href={row.url} target="_blank" rel="noopener noreferrer">
              {row.url}
              <ExternalLink aria-hidden />
            </a>
          </Button>
        )}
        {row.notes && (
          <p className="mt-1 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink-700">
            {row.notes}
          </p>
        )}
        {!row.url && !row.notes && (
          <p className="font-sans text-[0.875rem] text-ink-500">
            They submitted without a link or a note.
          </p>
        )}
      </div>

      {/* -------------------------------------------------------------- Mark */}
      <div className="mt-4 grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-score`}>Mark (of {maxScore})</Label>
          <Input
            id={`${formId}-score`}
            type="number"
            min={0}
            max={maxScore}
            value={score}
            disabled={pending !== null}
            onChange={(event) => setScore(event.target.value)}
            aria-invalid={error ? true : undefined}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-feedback`}>Feedback</Label>
          <Textarea
            id={`${formId}-feedback`}
            rows={3}
            value={feedback}
            disabled={pending !== null}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="What worked, what to do differently next time."
          />
        </div>
      </div>

      <FieldError>{error}</FieldError>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={pending !== null}
          onClick={() => void save('graded')}
        >
          {pending === 'graded' ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Saving
            </>
          ) : (
            <>
              {row.status === 'graded' ? 'Update mark' : 'Save mark'}
              <Save aria-hidden />
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={pending !== null}
          onClick={() => void save('resubmit')}
        >
          {pending === 'resubmit' ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Sending back
            </>
          ) : (
            'Ask for a resubmission'
          )}
        </Button>
      </div>
    </Card>
  )
}
