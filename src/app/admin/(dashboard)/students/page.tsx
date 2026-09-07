import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { isDatabaseConfigured } from '@/db'
import { listStudents } from '@/lib/data/enrollments'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Students' }

type SearchParams = Promise<{ search?: string }>

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Students" />
        <EmptyState
          title="No database configured"
          description="Student accounts are stored in Postgres. Set DATABASE_URL and run the migration before anyone can register."
        />
      </>
    )
  }

  const { search } = await searchParams
  const rows = await listStudents(search)

  return (
    <>
      <AdminPageHeader
        title="Students"
        description={`${rows.length} registered ${rows.length === 1 ? 'account' : 'accounts'}${search ? ` matching “${search}”` : ''}.`}
      />

      {/* A plain GET form — the query lands in the URL, so a filtered view can
          be bookmarked and shared, and the page stays a server component. */}
      <form method="get" className="mb-6 flex max-w-lg gap-2">
        <Input
          name="search"
          type="search"
          defaultValue={search ?? ''}
          placeholder="Search by name, email or phone"
          aria-label="Search students"
          className="h-11"
        />
        <Button type="submit" variant="secondary" size="md">
          <Search aria-hidden />
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={search ? 'No students match that search' : 'No students yet'}
          description={
            search
              ? 'Try part of a name, an email address or a phone number.'
              : 'Accounts appear here as soon as someone registers on the public site.'
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th className="hidden sm:table-cell">Phone</Th>
              <Th className="hidden lg:table-cell">City</Th>
              <Th className="text-right">Enrollments</Th>
              <Th className="hidden md:table-cell">Status</Th>
              <Th className="hidden lg:table-cell">Joined</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map(({ student, activeEnrollments, totalEnrollments }) => (
              <Tr key={student.id}>
                <Td>
                  <span className="block font-semibold text-ink-900">{student.name}</span>
                  <a
                    href={`mailto:${student.email}`}
                    className="block font-sans text-xs text-ink-400 hover:text-brand-800"
                  >
                    {student.email}
                  </a>
                </Td>

                <Td className="hidden whitespace-nowrap sm:table-cell">
                  {student.phone ? (
                    <a href={`tel:${student.phone}`} className="hover:text-brand-800">
                      {student.phone}
                    </a>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </Td>

                <Td className="hidden lg:table-cell text-ink-600">
                  {student.city ?? <span className="text-ink-400">—</span>}
                </Td>

                <Td className="text-right whitespace-nowrap tabular-nums">
                  {totalEnrollments === 0 ? (
                    <span className="text-ink-400">—</span>
                  ) : (
                    <>
                      <span className="font-semibold text-ink-900">{activeEnrollments}</span>
                      <span className="text-ink-400"> / {totalEnrollments}</span>
                    </>
                  )}
                </Td>

                <Td className="hidden md:table-cell">
                  {student.status === 'active' ? (
                    <Badge variant="success" size="md">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="md">
                      Suspended
                    </Badge>
                  )}
                </Td>

                <Td className="hidden whitespace-nowrap lg:table-cell">
                  {formatDate(student.createdAt)}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      )}

      <p className="mt-6 font-sans text-xs text-ink-400">
        Enrollments are shown as active / total.{' '}
        <Link href="/admin/enrollments" className="underline underline-offset-4 hover:text-ink-600">
          Review payments and change enrollment status
        </Link>
        .
      </p>
    </>
  )
}
