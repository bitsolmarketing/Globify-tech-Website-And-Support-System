import type { Metadata } from 'next'
import Link from 'next/link'
import { Home, Pencil, Plus } from 'lucide-react'
import { asc } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { DeleteButton } from '@/components/admin/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDb, isDatabaseConfigured } from '@/db'
import { faqs } from '@/db/schema'
import { truncate } from '@/lib/utils'

import { deleteFaq } from './actions'

export const metadata: Metadata = { title: 'FAQs' }

export default async function AdminFaqsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="FAQs" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed before editing FAQs."
        />
      </>
    )
  }

  const rows = await getDb().select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.question))
  const categories = new Set(rows.map((row) => row.category))

  return (
    <>
      <AdminPageHeader
        title="FAQs"
        description={`${rows.length} answers across ${categories.size} categories · ${rows.filter((row) => row.showOnHomepage).length} shown on the homepage.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/faqs/new">
              <Plus aria-hidden />
              New FAQ
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No FAQs yet"
          description="Run `npm run db:seed` to import the originals, or add one now."
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Question</Th>
              <Th className="hidden md:table-cell">Category</Th>
              <Th className="hidden sm:table-cell">Homepage</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link
                    href={`/admin/faqs/${row.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {row.question}
                  </Link>
                  <span className="mt-0.5 block max-w-xl font-sans text-xs text-ink-400">
                    {truncate(row.answer, 120)}
                  </span>
                </Td>
                <Td className="hidden md:table-cell">
                  <Badge variant="neutral" size="md">
                    {row.category}
                  </Badge>
                </Td>
                <Td className="hidden sm:table-cell">
                  {row.showOnHomepage ? (
                    <Badge variant="success" size="md">
                      <Home aria-hidden />
                      Shown
                    </Badge>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Edit FAQ">
                      <Link href={`/admin/faqs/${row.id}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <DeleteButton
                      label={`Delete FAQ: ${row.question}`}
                      itemName="FAQ"
                      onDelete={deleteFaq.bind(null, row.id)}
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
