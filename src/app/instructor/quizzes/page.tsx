import type { Metadata } from 'next'
import Link from 'next/link'
import { ListPlus } from 'lucide-react'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { GradePill, PortalEmpty, ProgressBar, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listInstructorBatches, listInstructorQuizzes } from '@/lib/data/instructor'
import { percent } from '@/lib/portal/grading'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Quizzes' }

export default async function InstructorQuizzesPage() {
  const { id } = await requireInstructorAccount()

  const [quizzes, batches] = await Promise.all([
    listInstructorQuizzes(id),
    listInstructorBatches(id),
  ])

  const firstBatch = batches[0]?.batch.id

  return (
    <>
      <PageHeader
        title="Quizzes"
        description="Auto-marked multiple choice. Open one to see how each question performed."
        actions={
          firstBatch && (
            <Button asChild variant="primary" size="md">
              <Link href={`/instructor/quizzes/new?batchId=${firstBatch}`}>
                <ListPlus aria-hidden />
                New quiz
              </Link>
            </Button>
          )
        }
      />

      {quizzes.length === 0 ? (
        <PortalEmpty
          title="No quizzes yet"
          description={
            batches.length === 0
              ? 'Once a batch is assigned to you, you can set quizzes for it.'
              : 'A quiz is marked the moment a student submits it, so results are immediate for both of you.'
          }
          action={
            firstBatch && (
              <Button asChild variant="primary" size="md">
                <Link href={`/instructor/quizzes/new?batchId=${firstBatch}`}>Create a quiz</Link>
              </Button>
            )
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Quiz</Th>
              <Th className="hidden lg:table-cell">Batch</Th>
              <Th className="hidden sm:table-cell">Closes</Th>
              <Th>Attempted</Th>
              <Th className="text-right">Average</Th>
            </Tr>
          </Thead>
          <Tbody>
            {quizzes.map(({ quiz, batch, attempted, cohortSize, averageScore }) => (
              <Tr key={quiz.id}>
                <Td>
                  <Link
                    href={`/instructor/quizzes/${quiz.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {quiz.title}
                  </Link>
                  {!quiz.publishedAt && (
                    <Badge variant="outline" size="sm" className="ml-2">
                      Draft
                    </Badge>
                  )}
                  <span className="block font-sans text-xs text-ink-400">
                    {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} · pass{' '}
                    {quiz.passScore}%
                  </span>
                </Td>

                <Td className="hidden lg:table-cell">
                  <span className="font-sans text-xs text-ink-500">{batch.name}</span>
                </Td>

                <Td className="hidden sm:table-cell whitespace-nowrap font-sans text-xs text-ink-600">
                  {quiz.dueAt ? formatDateTime(quiz.dueAt) : 'No closing date'}
                </Td>

                <Td>
                  <div className="w-28">
                    <ProgressBar
                      value={percent(attempted, cohortSize)}
                      label={`${quiz.title} attempts`}
                    />
                    <span className="mt-1 block font-sans text-xs text-ink-500">
                      {attempted} of {cohortSize}
                    </span>
                  </div>
                </Td>

                <Td className="text-right">
                  <GradePill score={averageScore} size="sm" />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
