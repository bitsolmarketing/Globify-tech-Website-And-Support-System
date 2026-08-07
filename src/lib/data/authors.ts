import 'server-only'

import { cache } from 'react'
import { asc } from 'drizzle-orm'

import { getDb } from '@/db'
import { authors as authorsTable, type AuthorRow } from '@/db/schema'
import { authors as seedAuthors, type Author } from '@/lib/authors'

import { dbRead, TAGS } from './cache'

export function toAuthor(row: AuthorRow): Author {
  return {
    slug: row.slug,
    name: row.name,
    role: row.role,
    credentials: row.credentials,
    bio: row.bio,
    longBio: row.longBio,
    avatar: row.avatar,
    expertise: row.expertise,
    yearsExperience: row.yearsExperience,
    social: row.social,
  }
}

const load = dbRead({
  key: 'authors:all',
  tags: [TAGS.authors],
  load: async () =>
    getDb().select().from(authorsTable).orderBy(asc(authorsTable.sortOrder), asc(authorsTable.name)),
  fallback: (): AuthorRow[] => [],
})

export const getAuthors = cache(async (): Promise<Author[]> => {
  const rows = await load()
  return rows.length > 0 ? rows.map(toAuthor) : seedAuthors
})

export const getAuthorBySlug = cache(async (slug: string): Promise<Author | undefined> => {
  return (await getAuthors()).find((author) => author.slug === slug)
})

export const getAuthorSlugs = cache(async (): Promise<string[]> => {
  return (await getAuthors()).map((author) => author.slug)
})

/** Falls back to the founder so a typo in front-matter can never crash a build. */
export const resolveAuthor = cache(async (slug: string): Promise<Author> => {
  const all = await getAuthors()
  return all.find((author) => author.slug === slug) ?? all[0]
})
