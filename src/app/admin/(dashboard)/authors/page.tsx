import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { asc } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { DeleteButton } from '@/components/admin/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDb, isDatabaseConfigured } from '@/db'
import { authors, courses as coursesTable } from '@/db/schema'

import { deleteAuthor } from './actions'

export const metadata: Metadata = { title: 'Authors' }

export default async function AdminAuthorsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Authors" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed before editing instructors."
        />
      </>
    )
  }

  const db = getDb()
  const [rows, courses] = await Promise.all([
    db.select().from(authors).orderBy(asc(authors.sortOrder), asc(authors.name)),
    db.select({ instructorSlug: coursesTable.instructorSlug }).from(coursesTable),
  ])

  const courseCounts = new Map<string, number>()
  for (const course of courses) {
    courseCounts.set(course.instructorSlug, (courseCounts.get(course.instructorSlug) ?? 0) + 1)
  }

  return (
    <>
      <AdminPageHeader
        title="Authors"
        description={`${rows.length} instructors. Each one doubles as a blog author and appears in Person schema.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/authors/new">
              <Plus aria-hidden />
              New author
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No authors yet"
          description="Run `npm run db:seed` to import the originals, or add one now."
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th className="hidden md:table-cell">Role</Th>
              <Th className="hidden lg:table-cell">Experience</Th>
              <Th>Courses</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => {
              const teaching = courseCounts.get(row.slug) ?? 0

              return (
                <Tr key={row.id}>
                  <Td>
                    <Link
                      href={`/admin/authors/${row.id}`}
                      className="font-semibold text-ink-900 hover:text-brand-800"
                    >
                      {row.name}
                    </Link>
                    <span className="block font-mono text-xs text-ink-400">/{row.slug}</span>
                  </Td>
                  <Td className="hidden md:table-cell">{row.role}</Td>
                  <Td className="hidden whitespace-nowrap lg:table-cell">
                    {row.yearsExperience} years
                  </Td>
                  <Td>
                    <Badge variant={teaching > 0 ? 'brand' : 'neutral'} size="md">
                      {teaching} {teaching === 1 ? 'course' : 'courses'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="View author page">
                        <Link href={`/blog/author/${row.slug}`} target="_blank" rel="noopener">
                          <ExternalLink aria-hidden />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit author">
                        <Link href={`/admin/authors/${row.id}`}>
                          <Pencil aria-hidden />
                        </Link>
                      </Button>
                      <DeleteButton
                        label={`Delete ${row.name}`}
                        itemName={row.name}
                        onDelete={deleteAuthor.bind(null, row.id)}
                      />
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
