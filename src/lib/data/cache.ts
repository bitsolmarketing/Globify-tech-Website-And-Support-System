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

/* ---------------------------------------------------------------------------
 * Circuit breaker
 *
 * `unstable_cache` only stores successes, so without this every request that
 * touches a dead database repeats the whole doomed connect — once per cache
 * key. With nine keys and a multi-second connect timeout that is the difference
 * between a page that renders instantly from seed data and one that hangs long
 * enough for the reverse proxy to give up with a 504.
 *
 * So the first connection failure trips the breaker and every read short-
 * circuits to its fallback for the next 30 seconds. One probe per window
 * decides whether to close it again, which is also what keeps a recovered
 * database from waiting out the full cooldown.
 * ------------------------------------------------------------------------ */

const BREAKER_COOLDOWN_MS = 30_000

const breaker = { openUntil: 0, lastLoggedAt: 0 }

/**
 * The breaker is a latency guard, and latency is only a problem when a user is
 * waiting. `next build` has no user waiting and only one chance to bake the
 * real content into 80 static pages, so there it stays disabled: one transient
 * blip must not silently freeze a whole build onto seed data for 30 seconds.
 */
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Connection-level faults only. A malformed query is a bug in one read and must
 * not disable the other eight, whereas "the server is unreachable" is a fact
 * about every read at once.
 */
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EPIPE',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_ACCESS_DENIED_ERROR',
  'ER_CON_COUNT_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_DBACCESS_DENIED_ERROR',
])

/**
 * Drizzle rethrows driver failures as its own `Failed query: …` error and hangs
 * the original underneath as `cause`, so the mysql2 code is never on the object
 * actually caught here — it is one or more links down the chain. Walking it is
 * what makes the difference between recognising an outage and mistaking it for
 * a one-off bad query.
 */
function isConnectionError(error: unknown): boolean {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    if (typeof current !== 'object') return false

    const code = (current as { code?: unknown }).code
    if (typeof code === 'string' && CONNECTION_ERROR_CODES.has(code)) return true

    current = (current as { cause?: unknown }).cause
  }

  return false
}

/**
 * Collapses the log to one line per cooldown window. Without the throttle a
 * dead database writes nine stack traces per request, which on a shared host
 * fills the log faster than anything useful can be read out of it.
 */
function reportOutage(key: string, error: unknown): void {
  const now = Date.now()
  if (now - breaker.lastLoggedAt < BREAKER_COOLDOWN_MS) return
  breaker.lastLoggedAt = now
  console.error(
    `[data] database unreachable (first seen on "${key}") — serving seed content ` +
      `and pausing reads for ${BREAKER_COOLDOWN_MS / 1000}s:`,
    error instanceof Error ? error.message : error,
  )
}

/**
 * Reads through the Next data cache, then degrades to the seed data that is
 * still checked into the repo.
 *
 * Three situations hit the fallback:
 *   1. No `DATABASE_URL` — a fresh clone builds and runs with zero setup.
 *   2. The database is unreachable — a statically rendered page keeps serving
 *      known-good content instead of failing the build or returning a 500.
 *   3. The breaker is open from a recent failure, in which case the fallback is
 *      returned immediately without touching the network at all.
 *
 * All of them log, because silently serving stale content would otherwise hide
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

    /* Open breaker: skip the network entirely. This is the path that turns a
       15s-per-read stall back into a sub-millisecond render. */
    if (!isBuild && Date.now() < breaker.openUntil) return options.fallback()

    try {
      const result = await cachedLoad()
      breaker.openUntil = 0
      return result
    } catch (error) {
      if (isConnectionError(error) && !isBuild) {
        breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS
        reportOutage(options.key, error)
      } else {
        console.error(`[data] "${options.key}" fell back to seed content —`, error)
      }

      return options.fallback()
    }
  }
}
