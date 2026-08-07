import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { PostForm } from '@/components/admin/post-form'
import { getAuthors } from '@/lib/data/authors'
import { getAllPostsForAdmin } from '@/lib/data/admin-posts'

import { createPost, previewMarkdown } from '../actions'

export const metadata: Metadata = { title: 'New post' }

export default async function NewPostPage() {
  const [authors, existing] = await Promise.all([getAuthors(), getAllPostsForAdmin()])

  const categories = Array.from(new Set(existing.map((post) => post.category))).sort()
  const tags = Array.from(new Set(existing.flatMap((post) => post.tags))).sort()

  /* Local date, not UTC — an admin in Faisalabad publishing at 2am should not
     see yesterday's date pre-filled. */
  const today = new Date()
  const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <>
      <AdminPageHeader
        title="New post"
        description="Write in markdown, preview with the real renderer, publish when it is ready."
        backHref="/admin/posts"
        backLabel="All posts"
      />

      <PostForm
        defaultValues={{
          slug: '',
          title: '',
          description: '',
          date: isoDate,
          updated: '',
          author: authors[0]?.slug ?? '',
          category: categories[0] ?? '',
          tags: '',
          image: '/images/generated/blog/placeholder.webp',
          imageAlt: '',
          featured: false,
          published: false,
          body: '',
          faqs: [],
        }}
        authors={authors.map((author) => ({ value: author.slug, label: author.name }))}
        categories={categories}
        tags={tags}
        onSubmitAction={createPost}
        onPreview={previewMarkdown}
        submitLabel="Create post"
        successMessage="Post created"
      />
    </>
  )
}
