import type { Metadata } from 'next'
import Link from 'next/link'
import { Pencil, Plus, Star } from 'lucide-react'
import { asc } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { DeleteButton } from '@/components/admin/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDb, isDatabaseConfigured } from '@/db'
import { testimonials } from '@/db/schema'

import { deleteTestimonial } from './actions'

export const metadata: Metadata = { title: 'Testimonials' }

export default async function AdminTestimonialsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Testimonials" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed before editing testimonials."
        />
      </>
    )
  }

  const rows = await getDb()
    .select()
    .from(testimonials)
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.name))

  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        description={`${rows.length} student quotes · ${rows.filter((row) => row.featured).length} featured.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/testimonials/new">
              <Plus aria-hidden />
              New testimonial
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No testimonials yet"
          description="Run `npm run db:seed` to import the originals, or add one now."
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Student</Th>
              <Th className="hidden md:table-cell">Course</Th>
              <Th className="hidden lg:table-cell">Outcome</Th>
              <Th>Rating</Th>
              <Th className="hidden sm:table-cell">Featured</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link
                    href={`/admin/testimonials/${row.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {row.name}
                  </Link>
                  <span className="block font-sans text-xs text-ink-400">
                    {row.role} · {row.city}
                  </span>
                </Td>
                <Td className="hidden md:table-cell">
                  <Badge variant="neutral" size="md">
                    {row.course}
                  </Badge>
                </Td>
                <Td className="hidden lg:table-cell">{row.outcome}</Td>
                <Td className="whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <Star aria-hidden className="size-3.5 fill-gold-500 text-gold-500" />
                    {row.rating}
                  </span>
                </Td>
                <Td className="hidden sm:table-cell">
                  {row.featured ? (
                    <Badge variant="success" size="md">
                      Featured
                    </Badge>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Edit testimonial">
                      <Link href={`/admin/testimonials/${row.id}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <DeleteButton
                      label={`Delete testimonial from ${row.name}`}
                      itemName={`Testimonial from ${row.name}`}
                      onDelete={deleteTestimonial.bind(null, row.id)}
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
