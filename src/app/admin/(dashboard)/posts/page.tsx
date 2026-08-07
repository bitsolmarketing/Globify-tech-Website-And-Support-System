import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, Pencil, Plus, Star } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { DeleteButton } from '@/components/admin/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import { getAllPostsForAdmin } from '@/lib/data/admin-posts'
import { formatDate } from '@/lib/utils'

import { deletePost } from './actions'

export const metadata: Metadata = { title: 'Blog posts' }

export default async function AdminPostsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Blog posts" />
        <EmptyState
          title="No database configured"
          description="Posts live in Postgres. Set DATABASE_URL, run the migration and seed to import the MDX files."
        />
      </>
    )
  }

  const posts = await getAllPostsForAdmin()
  const published = posts.filter((post) => post.published).length

  return (
    <>
      <AdminPageHeader
        title="Blog posts"
        description={`${posts.length} posts · ${published} published, ${posts.length - published} draft.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/posts/new">
              <Plus aria-hidden />
              New post
            </Link>
          </Button>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Run `npm run db:seed` to import content/blog/*.mdx, or write one from scratch."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/admin/posts/new">
                <Plus aria-hidden />
                New post
              </Link>
            </Button>
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Title</Th>
              <Th className="hidden md:table-cell">Category</Th>
              <Th className="hidden lg:table-cell">Author</Th>
              <Th>Status</Th>
              <Th className="hidden sm:table-cell">Date</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {posts.map((post) => (
              <Tr key={post.id}>
                <Td>
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {post.title}
                  </Link>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs text-ink-400">/{post.slug}</span>
                    {post.featured && (
                      <Badge variant="gold" size="sm">
                        <Star aria-hidden className="fill-current" />
                        Featured
                      </Badge>
                    )}
                  </span>
                </Td>
                <Td className="hidden md:table-cell">
                  <Badge variant="neutral" size="md">
                    {post.category}
                  </Badge>
                </Td>
                <Td className="hidden lg:table-cell">{post.author}</Td>
                <Td>
                  <Badge variant={post.published ? 'success' : 'neutral'} size="md">
                    {post.published ? 'Published' : 'Draft'}
                  </Badge>
                </Td>
                <Td className="hidden whitespace-nowrap sm:table-cell">{formatDate(post.date)}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    {post.published && (
                      <Button asChild variant="ghost" size="icon-sm" aria-label="View on site">
                        <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener">
                          <ExternalLink aria-hidden />
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Edit post">
                      <Link href={`/admin/posts/${post.id}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <DeleteButton
                      label={`Delete ${post.title}`}
                      itemName={post.title}
                      onDelete={deletePost.bind(null, post.id)}
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
