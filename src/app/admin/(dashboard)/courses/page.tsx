import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, Pencil, Plus, Star } from 'lucide-react'
import { asc } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { DeleteButton } from '@/components/admin/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDb, isDatabaseConfigured } from '@/db'
import { courses as coursesTable } from '@/db/schema'
import { getCampaign } from '@/lib/data/campaign'
import { discountedFee } from '@/lib/courses'
import { formatPKR } from '@/lib/utils'

import { deleteCourse } from './actions'

export const metadata: Metadata = { title: 'Courses' }

export default async function AdminCoursesPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Courses" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed the catalogue before editing courses. See README › Admin setup."
        />
      </>
    )
  }

  const [rows, campaign] = await Promise.all([
    getDb()
      .select()
      .from(coursesTable)
      .orderBy(asc(coursesTable.sortOrder), asc(coursesTable.title)),
    getCampaign(),
  ])

  return (
    <>
      <AdminPageHeader
        title="Courses"
        description={`${rows.length} programmes. Fees shown include the live ${campaign.discountPercent}% campaign discount.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/courses/new">
              <Plus aria-hidden />
              New course
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Run `npm run db:seed` to import the original catalogue, or create one from scratch."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/admin/courses/new">
                <Plus aria-hidden />
                New course
              </Link>
            </Button>
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Course</Th>
              <Th className="hidden md:table-cell">Category</Th>
              <Th className="hidden lg:table-cell">Modules</Th>
              <Th>Fee</Th>
              <Th className="hidden sm:table-cell">Featured</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((course) => (
              <Tr key={course.id}>
                <Td>
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {course.title}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-400">/{course.slug}</span>
                    {course.badge && (
                      <Badge variant="gold" size="sm">
                        {course.badge}
                      </Badge>
                    )}
                  </span>
                </Td>
                <Td className="hidden md:table-cell">
                  <Badge variant="neutral" size="md">
                    {course.category}
                  </Badge>
                </Td>
                <Td className="hidden whitespace-nowrap lg:table-cell">
                  {course.curriculum.length} modules
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="font-semibold text-brand-900">
                    {formatPKR(discountedFee(course, campaign.discountPercent))}
                  </span>
                  <span className="block text-xs text-ink-400 line-through">
                    {formatPKR(course.originalFee)}
                  </span>
                </Td>
                <Td className="hidden sm:table-cell">
                  {course.featured ? (
                    <Badge variant="success" size="md">
                      <Star aria-hidden className="fill-current" />
                      Featured
                    </Badge>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Preview on site">
                      <Link href={`/courses/${course.slug}`} target="_blank" rel="noopener">
                        <ExternalLink aria-hidden />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Edit course">
                      <Link href={`/admin/courses/${course.id}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <DeleteButton
                      label={`Delete ${course.title}`}
                      itemName={course.title}
                      onDelete={deleteCourse.bind(null, course.id)}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
