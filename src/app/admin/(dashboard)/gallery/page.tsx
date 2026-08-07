import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'
import { asc } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { DeleteButton } from '@/components/admin/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDb, isDatabaseConfigured } from '@/db'
import { galleryItems } from '@/db/schema'

import { deleteGalleryItem } from './actions'

export const metadata: Metadata = { title: 'Gallery' }

export default async function AdminGalleryPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Gallery" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed before editing the gallery."
        />
      </>
    )
  }

  const rows = await getDb()
    .select()
    .from(galleryItems)
    .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.src))

  return (
    <>
      <AdminPageHeader
        title="Gallery"
        description={`${rows.length} images across the campus, classes, events and student categories.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/gallery/new">
              <Plus aria-hidden />
              New image
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No gallery images yet"
          description="Run `npm run db:seed` to import the originals, or add one now."
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Image</Th>
              <Th>Caption</Th>
              <Th className="hidden md:table-cell">Category</Th>
              <Th className="hidden lg:table-cell">Size</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <span className="relative block h-14 w-20 overflow-hidden rounded-lg bg-ink-100">
                    <Image
                      src={row.src}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </span>
                </Td>
                <Td>
                  <Link
                    href={`/admin/gallery/${row.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {row.caption}
                  </Link>
                  <span className="mt-0.5 block font-mono text-xs text-ink-400">{row.src}</span>
                </Td>
                <Td className="hidden md:table-cell">
                  <Badge variant="neutral" size="md">
                    {row.category}
                  </Badge>
                </Td>
                <Td className="hidden whitespace-nowrap lg:table-cell">
                  {row.width} × {row.height}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Edit image">
                      <Link href={`/admin/gallery/${row.id}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <DeleteButton
                      label={`Delete ${row.caption}`}
                      itemName={row.caption}
                      onDelete={deleteGalleryItem.bind(null, row.id)}
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
