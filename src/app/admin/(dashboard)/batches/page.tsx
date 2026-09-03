import type { Metadata } from 'next'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { BatchStatusBadge } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import { listBatches } from '@/lib/data/portal'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Batches' }

export default async function AdminBatchesPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Batches" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed before managing batches."
        />
      </>
    )
  }

  const batches = await listBatches()
  const active = batches.filter((batch) => batch.status === 'active').length
  const students = batches.reduce((sum, batch) => sum + batch.studentCount, 0)

  return (
    <>
      <AdminPageHeader
        title="Batches"
        description={`${batches.length} batches, ${active} running, ${students} active enrolments. A batch is one delivery of a course to one group — the courses themselves are edited under Courses.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/batches/new">
              <Plus aria-hidden />
              New batch
            </Link>
          </Button>
        }
      />

      {batches.length === 0 ? (
        <EmptyState
          title="No batches yet"
          description="Create a batch to open a course for enrolment. Students and instructors only see the portal once a batch exists."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/admin/batches/new">Create the first batch</Link>
            </Button>
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Batch</Th>
              <Th className="hidden lg:table-cell">Instructor</Th>
              <Th>Starts</Th>
              <Th>Students</Th>
              <Th>Status</Th>
              <Th className="text-right">Edit</Th>
            </Tr>
          </Thead>
          <Tbody>
            {batches.map((batch) => (
              <Tr key={batch.id}>
                <Td>
                  <Link
                    href={`/admin/batches/${batch.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {batch.name}
                  </Link>
                  <span className="block truncate font-sans text-xs text-ink-400">
                    {batch.code} · {batch.courseTitle}
                  </span>
                </Td>

                <Td className="hidden lg:table-cell">
                  <span className="font-sans text-xs text-ink-600">{batch.instructorName}</span>
                </Td>

                <Td className="whitespace-nowrap font-sans text-xs text-ink-600">
                  {formatDate(batch.startDate)}
                </Td>

                <Td>
                  <Badge variant="neutral" size="sm">
                    {batch.studentCount}
                    {batch.capacity > 0 && ` / ${batch.capacity}`}
                  </Badge>
                </Td>

                <Td>
                  <BatchStatusBadge status={batch.status} />
                </Td>

                <Td className="text-right">
                  <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${batch.name}`}>
                    <Link href={`/admin/batches/${batch.id}`}>
                      <Pencil aria-hidden />
                    </Link>
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
