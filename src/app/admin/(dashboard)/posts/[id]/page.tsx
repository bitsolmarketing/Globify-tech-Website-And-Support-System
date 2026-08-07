import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { PostForm } from '@/components/admin/post-form'
import { DeleteButton } from '@/components/admin/delete-button'
import { Button } from '@/components/ui/button'
import { getAllPostsForAdmin, getPostRowById } from '@/lib/data/admin-posts'
import { getAuthors } from '@/lib/data/authors'
import { fromLines, type PostFormValues } from '@/lib/admin/schemas'

import { deletePost, previewMarkdown, updatePost } from '../actions'

type Params = { id: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPostRowById(id)
  return { title: post?.title ?? 'Post' }
}

export default async function EditPostPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const [post, authors, existing] = await Promise.all([
    getPostRowById(id),
    getAuthors(),
    getAllPostsForAdmin(),
  ])

  if (!post) notFound()

  const categories = Array.from(new Set(existing.map((entry) => entry.category))).sort()
  const tags = Array.from(new Set(existing.flatMap((entry) => entry.tags))).sort()

  async function savePost(values: PostFormValues) {
    'use server'
    return updatePost(id, values)
  }

  return (
    <>
      <AdminPageHeader
        title={post.title}
        description={post.published ? 'Published' : 'Draft — hidden from the public site.'}
        backHref="/admin/posts"
        backLabel="All posts"
        actions={
          <>
            {post.published && (
              <Button asChild variant="secondary" size="md">
                <Link href={`/blog/${post.slug}`} target="_blank" rel="noopener">
                  View live
                  <ExternalLink aria-hidden />
                </Link>
              </Button>
            )}
            <DeleteButton
              label={`Delete ${post.title}`}
              itemName={post.title}
              redirectTo="/admin/posts"
              onDelete={deletePost.bind(null, id)}
            />
          </>
        }
      />

      <PostForm
        defaultValues={{
          slug: post.slug,
          title: post.title,
          description: post.description,
          date: post.date,
          updated: post.updated ?? '',
          author: post.author,
          category: post.category,
          tags: fromLines(post.tags),
          image: post.image,
          imageAlt: post.imageAlt,
          featured: post.featured,
          published: post.published,
          body: post.body,
          faqs: post.faqs.map((faq) => ({ ...faq })),
        }}
        authors={authors.map((author) => ({ value: author.slug, label: author.name }))}
        categories={categories}
        tags={tags}
        onSubmitAction={savePost}
        onPreview={previewMarkdown}
        submitLabel="Save post"
        successMessage="Post updated"
      />
    </>
  )
}
