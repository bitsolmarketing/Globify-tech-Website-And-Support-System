import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { QuizBuilder, type QuizDraft } from '@/components/portal/quiz-builder'
import { createQuiz, listInstructorBatches } from '@/lib/data/instructor'
import { runPortalAction, type PortalActionResult } from '@/lib/portal/guard'
import { quizWithBatchSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'New quiz' }

export default async function NewQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>
}) {
  const { batchId } = await searchParams
  const { id } = await requireInstructorAccount()

  const batches = await listInstructorBatches(id)
  if (batches.length === 0) notFound()

  const selected = batches.find((row) => row.batch.id === batchId)?.batch ?? batches[0].batch

  async function save(draft: QuizDraft): Promise<PortalActionResult> {
    'use server'

    const result = await runPortalAction('instructor', async (user) => {
      const parsed = quizWithBatchSchema.safeParse(draft)
      if (!parsed.success) {
        /* The builder shows one message at a time, so name the question the
           problem is in — "Give at least two options" is unactionable when
           there are nine questions on screen. */
        const issue = parsed.error.issues[0]
        const questionIndex = issue.path[0] === 'questions' ? Number(issue.path[1]) : null
        throw new Error(
          questionIndex !== null && !Number.isNaN(questionIndex)
            ? `Question ${questionIndex + 1}: ${issue.message}`
            : issue.message,
        )
      }

      await createQuiz(user.id, parsed.data.batchId, {
        title: parsed.data.title,
        description: parsed.data.description || null,
        questions: parsed.data.questions,
        timeLimitMinutes: parsed.data.timeLimitMinutes,
        maxAttempts: parsed.data.maxAttempts,
        passScore: parsed.data.passScore,
        weight: parsed.data.weight,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        publish: parsed.data.publish,
      })

      revalidatePath('/instructor/quizzes')
      revalidatePath(`/instructor/batches/${parsed.data.batchId}`)
    })

    if (result.ok) redirect('/instructor/quizzes')
    return result
  }

  return (
    <>
      <PageHeader
        backHref="/instructor/quizzes"
        backLabel="All quizzes"
        title="New quiz"
        description="Multiple choice, marked automatically. Students never receive the answer key — marking happens on the server."
      />

      <QuizBuilder
        batches={batches.map((row) => ({
          value: row.batch.id,
          label: `${row.batch.name} — ${row.batch.courseTitle}`,
        }))}
        initial={{
          batchId: selected.id,
          title: '',
          description: '',
          timeLimitMinutes: 0,
          maxAttempts: 1,
          passScore: 60,
          weight: 1,
          dueAt: '',
          publish: true,
          questions: [],
        }}
        onSave={save}
        submitLabel="Create quiz"
      />
    </>
  )
}
