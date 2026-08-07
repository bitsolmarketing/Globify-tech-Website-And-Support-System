'use server'

import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'

import { getDb } from '@/db'
import { posts } from '@/db/schema'
import { requireAdmin, runAction, type ActionResult } from '@/lib/admin/guard'
import { postFormSchema, toPostInput, type PostFormValues } from '@/lib/admin/schemas'
import { renderMarkdown } from '@/lib/blog'
import { revalidatePosts } from '@/lib/data/revalidate'

export async function createPost(values: PostFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const input = toPostInput(postFormSchema.parse(values))

    await getDb()
      .insert(posts)
      .values({ id: randomUUID(), ...input })

    revalidatePosts()
  })
}

export async function updatePost(id: string, values: PostFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const input = toPostInput(postFormSchema.parse(values))

    await getDb()
      .update(posts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(posts.id, id))

    revalidatePosts()
  })
}

export async function deletePost(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await getDb().delete(posts).where(eq(posts.id, id))
    revalidatePosts()
  })
}

/**
 * Renders the editor's markdown through the very same remark/rehype pipeline
 * the published article uses, so the preview cannot drift from the real page.
 * Runs on the server because that pipeline is a server-only dependency.
 */
export async function previewMarkdown(markdown: string): Promise<string> {
  await requireAdmin()
  return renderMarkdown(markdown)
}
