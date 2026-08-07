import 'server-only'

import { unstable_cache } from 'next/cache'

import { isDatabaseConfigured } from '@/db'

/**
 * Cache tags. Every public read is tagged; every admin write calls the
 * matching helper in `./revalidate.ts`, which is what keeps the statically
 * pre-rendered public pages in step with the database.
 */
export const TAGS = {
  courses: 'courses',
  authors: 'authors',
  posts: 'posts',
  testimonials: 'testimonials',
  faqs: 'faqs',
  gallery: 'gallery',
  campaign: 'campaign',
  siteContent: 'site-content',
} as const

export type CacheTag = (typeof TAGS)[keyof typeof TAGS]

/**
 * Reads through the Next data cache, then degrades to the seed data that is
 * still checked into the repo.
 *
 * Two situations hit the fallback:
 *   1. No `DATABASE_URL` — a fresh clone builds and runs with zero setup.
 *   2. The database is unreachable — a statically rendered page keeps serving
 *      known-good content instead of failing the build or returning a 500.
 *
 * Both log loudly, because silently serving stale content would otherwise hide
 * a broken connection string.
 */
export function dbRead<T>(options: {
  /** Stable cache key — include any arguments the loader depends on. */
  key: string
  tags: CacheTag[]
  load: () => Promise<T>
  fallback: () => T
}): () => Promise<T> {
  const cachedLoad = unstable_cache(options.load, ['globify', options.key], { tags: options.tags })

  return async () => {
    if (!isDatabaseConfigured()) return options.fallback()

    try {
      return await cachedLoad()
    } catch (error) {
      console.error(`[data] "${options.key}" fell back to seed content —`, error)
      return options.fallback()
    }
  }
}
