import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { ExternalLink } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { MarkingSheet } from '@/components/portal/marking-sheet'
import { StatTile, formatDateTime, relativeDays } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getMarkingSheet, gradeSubmission } from '@/lib/data/instructor'
import { orNotFound, runPortalAction, type PortalActionResult } from '@/lib/portal/guard'
import { gradeSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'
import { ClipboardCheck, ClipboardList, Clock } from 'lucide-react'

export const metadata: Metadata = { title: 'Marking' }

export default async function MarkAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
  const { id } = await requireInstructorAccount()

  const { assignment, batch, rows } = await orNotFound(getMarkingSheet(id, assignmentId))

  const submitted = rows.filter((row) => row.submission).length
  const graded = rows.filter((row) => row.submission?.status === 'graded').length
  const waiting = rows.filter((row) => row.submission?.status === 'submitted').length

  async function grade(input: {
    submissionId: string
    score: number | null
    feedback: string
    status: 'graded' | 'resubmit'
  }): Promise<PortalActionResult> {
    'use server'

    return runPortalAction('instructor', async (user) => {
      const parsed = gradeSchema.safeParse({
        submissionId: input.submissionId,
        status: input.status,
        score: input.score ?? '',
        feedback: input.feedback,
      })
      if (!parsed.success) throw new Error(parsed.error.issues[0].message)

      await gradeSubmission(user.id, input.submissionId, {
        score: typeof parsed.data.score === 'number' ? parsed.data.score : null,
        feedback: parsed.data.feedback || null,
        status: parsed.data.status,
      })

      revalidatePath(`/instructor/assignments/${assignmentId}`)
      revalidatePath('/instructor/assignments')
      revalidatePath(`/instructor/batches/${batch.id}`)
      revalidatePath('/instructor')
    })
  }

  return (
    <>
      <PageHeader
        backHref="/instructor/assignments"
        backLabel="All assignments"
        title={assignment.title}
        description={`${batch.courseTitle} · ${batch.name} · due ${formatDateTime(assignment.dueAt)} (${relativeDays(assignment.dueAt)})`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {assignment.publishedAt ? (
          <Badge variant="success" size="sm">
            Published
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            Draft — students cannot see this
          </Badge>
        )}
        <Badge variant="neutral" size="sm">
          {assignment.maxScore} marks · weight {assignment.weight}
        </Badge>
        <Badge variant={assignment.allowLate ? 'neutral' : 'outline'} size="sm">
          {assignment.allowLate ? 'Late work accepted' : 'No late work'}
        </Badge>
        {assignment.attachmentUrl && (
          <Button asChild variant="link" size="sm">
            <a href={assignment.attachmentUrl} target="_blank" rel="noopener noreferrer">
              Reference material
              <ExternalLink aria-hidden />
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Handed in"
          value={`${submitted} / ${rows.length}`}
          hint={`${rows.length - submitted} still outstanding`}
          icon={ClipboardList}
        />
        <StatTile
          label="Marked"
          value={graded}
          hint={graded === submitted ? 'Everything handed in is marked' : 'Of what has come in'}
          icon={ClipboardCheck}
          tone={graded === submitted ? 'positive' : 'brand'}
        />
        <StatTile
          label="Waiting on you"
          value={waiting}
          hint={waiting === 0 ? 'Nothing in the queue' : 'Submissions to mark'}
          icon={Clock}
          tone={waiting > 0 ? 'warn' : 'positive'}
        />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-sans text-base font-bold text-ink-900">The brief</h2>
        <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink-700">
          {assignment.brief}
        </p>
      </Card>

      <section className="mt-8">
        <h2 className="mb-4 font-sans text-lg font-bold text-ink-900">Submissions</h2>

        <MarkingSheet
          maxScore={assignment.maxScore}
          onGrade={grade}
          rows={rows.map(({ student, submission }) => ({
            submissionId: submission?.id ?? null,
            studentId: student.studentId,
            studentName: student.studentName,
            studentEmail: student.studentEmail,
            url: submission?.url ?? null,
            notes: submission?.notes ?? null,
            submittedAt: submission?.submittedAt ?? null,
            late: submission?.late ?? false,
            status: submission?.status ?? null,
            score: submission?.score ?? null,
            feedback: submission?.feedback ?? null,
          }))}
        />
      </section>
    </>
  )
}
