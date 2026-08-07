import 'server-only'

import { asc, desc, eq } from 'drizzle-orm'

import { getDb } from '@/db'
import { posts, type PostRow } from '@/db/schema'

/**
 * Admin-side post reads. Unlike `@/lib/blog` these are uncached and include
 * drafts, because the editor must always see exactly what is in the row it is
 * about to overwrite.
 */
export async function getAllPostsForAdmin(): Promise<PostRow[]> {
  return getDb().select().from(posts).orderBy(desc(posts.date), asc(posts.title))
}

export async function getPostRowById(id: string): Promise<PostRow | undefined> {
  const [row] = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1)
  return row
}
