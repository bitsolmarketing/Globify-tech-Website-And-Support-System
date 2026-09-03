import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { ExternalLink } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { SubmissionForm } from '@/components/portal/submission-form'
import { GradePill, SubmissionBadge, formatDateTime, relativeDays } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getStudentAssignment, submitAssignment } from '@/lib/data/student'
import { orNotFound, runPortalAction, type PortalActionResult } from '@/lib/portal/guard'
import { submitAssignmentSchema } from '@/lib/portal/schemas'
import { requireStudentAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Assignment' }

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
  const { id } = await requireStudentAccount()

  const { assignment, batch, submission, state } = await orNotFound(
    getStudentAssignment(id, assignmentId),
  )

  const now = new Date()
  const overdue = assignment.dueAt <= now
  const closed = overdue && !assignment.allowLate && !submission

  async function submit(input: { url: string; notes: string }): Promise<PortalActionResult> {
    'use server'

    return runPortalAction('student', async (user) => {
      const parsed = submitAssignmentSchema.safeParse(input)
      if (!parsed.success) throw new Error(parsed.error.issues[0].message)

      await submitAssignment(user.id, assignmentId, {
        url: parsed.data.url || null,
        notes: parsed.data.notes || null,
      })

      revalidatePath(`/student/assignments/${assignmentId}`)
      revalidatePath('/student/assignments')
      revalidatePath('/student')
    })
  }

  return (
    <>
      <PageHeader
        backHref="/student/assignments"
        backLabel="All assignments"
        title={assignment.title}
        description={`${batch.courseTitle} · ${batch.name}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid gap-6">
          {/* ------------------------------------------------------------ Brief */}
          <Card className="p-5 sm:p-6">
            <h2 className="font-sans text-base font-bold text-ink-900">The brief</h2>
            <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-700">
              {assignment.brief}
            </p>

            {assignment.attachmentUrl && (
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <a href={assignment.attachmentUrl} target="_blank" rel="noopener noreferrer">
                  Open the reference material
                  <ExternalLink aria-hidden />
                </a>
              </Button>
            )}
          </Card>

          {/* ------------------------------------------------------- Feedback */}
          {submission?.status === 'graded' && (
            <Card className="border-emerald-200 bg-emerald-50/40 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-sans text-base font-bold text-ink-900">Your mark</h2>
                <GradePill
                  score={Math.round(((submission.score ?? 0) / assignment.maxScore) * 100)}
                  size="lg"
                />
              </div>
              <p className="mt-2 font-sans text-sm font-semibold text-ink-700">
                {submission.score} out of {assignment.maxScore}
              </p>
              {submission.feedback && (
                <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-700">
                  {submission.feedback}
                </p>
              )}
              <p className="mt-3 font-sans text-xs text-ink-500">
                Marked {submission.gradedAt ? formatDateTime(submission.gradedAt) : '—'}
              </p>
            </Card>
          )}

          {submission?.status === 'resubmit' && (
            <Card className="border-gold-300 bg-gold-50/50 p-5 sm:p-6">
              <h2 className="font-sans text-base font-bold text-ink-900">
                Your instructor asked for a resubmission
              </h2>
              {submission.feedback && (
                <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-700">
                  {submission.feedback}
                </p>
              )}
            </Card>
          )}

          {/* ------------------------------------------------------- Hand in */}
          <SubmissionForm
            onSubmit={submit}
            defaultUrl={submission?.url}
            defaultNotes={submission?.notes}
            hasMark={submission?.status === 'graded'}
            closed={closed}
            closedReason="The deadline has passed and this assignment does not accept late work. Speak to your instructor if you need an extension."
          />
        </div>

        {/* --------------------------------------------------------- Sidebar */}
        <aside className="grid gap-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <dl className="grid gap-4">
              <div>
                <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                  Status
                </dt>
                <dd className="mt-1.5">
                  <SubmissionBadge status={submission?.status ?? null} />
                </dd>
              </div>

              <div>
                <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                  Deadline
                </dt>
                <dd className="mt-1 font-sans text-sm font-semibold text-ink-900">
                  {formatDateTime(assignment.dueAt)}
                </dd>
                <dd
                  className={
                    overdue && state !== 'graded' && state !== 'submitted'
                      ? 'font-sans text-xs font-semibold text-amber-700'
                      : 'font-sans text-xs text-ink-500'
                  }
                >
                  {relativeDays(assignment.dueAt)}
                </dd>
              </div>

              <div>
                <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                  Worth
                </dt>
                <dd className="mt-1 font-sans text-sm font-semibold text-ink-900">
                  {assignment.maxScore} marks
                </dd>
                <dd className="font-sans text-xs text-ink-500">
                  {assignment.weight === 0
                    ? 'Not counted toward your grade'
                    : `Weight ${assignment.weight} in your assignment average`}
                </dd>
              </div>

              <div>
                <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                  Late work
                </dt>
                <dd className="mt-1.5">
                  <Badge variant={assignment.allowLate ? 'neutral' : 'outline'} size="sm">
                    {assignment.allowLate ? 'Accepted' : 'Not accepted'}
                  </Badge>
                </dd>
              </div>

              {submission && (
                <div>
                  <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                    Submitted
                  </dt>
                  <dd className="mt-1 font-sans text-sm text-ink-900">
                    {formatDateTime(submission.submittedAt)}
                  </dd>
                  {submission.late && (
                    <dd className="font-sans text-xs font-semibold text-amber-700">
                      After the deadline
                    </dd>
                  )}
                </div>
              )}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  )
}
