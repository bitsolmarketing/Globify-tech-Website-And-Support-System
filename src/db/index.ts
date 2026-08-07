/**
 * Postgres connection (Neon, Supabase or any standard Postgres).
 *
 * Deliberately free of `server-only` so the seed script and drizzle-kit can
 * import it from a plain Node process. The data layer in `src/lib/data/` is
 * what carries the `server-only` guard.
 *
 * `DATABASE_URL` is read lazily rather than at module scope: ES imports are
 * hoisted, so a script that calls `dotenv` in its body would otherwise find
 * this module already initialised with an empty value.
 */
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? ''
}

/**
 * When false the whole site falls back to the seed data still checked into
 * `src/lib/*.ts` and `content/blog/`, so a fresh clone builds with no database.
 */
export function isDatabaseConfigured(): boolean {
  return databaseUrl().length > 0
}

/* Re-used across HMR reloads and across lambda invocations — creating a new
   pool per request exhausts Postgres connection limits very quickly. */
const globalForDb = globalThis as unknown as {
  __globifySql?: ReturnType<typeof postgres>
  __globifyDb?: Database
}

function createClient(url: string) {
  return postgres(url, {
    // Supabase's pooler and Neon's pgbouncer endpoint both reject the extended
    // protocol's prepared statements in transaction mode.
    prepare: false,
    max: 5,
    // Lets `next build` exit cleanly instead of hanging on an open socket.
    idle_timeout: 20,
    connect_timeout: 15,
  })
}

/** Throws when `DATABASE_URL` is missing — use inside admin/server actions. */
export function getDb(): Database {
  const url = databaseUrl()

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. The admin requires a Postgres database — see README › Admin setup.',
    )
  }

  if (!globalForDb.__globifyDb) {
    globalForDb.__globifySql = globalForDb.__globifySql ?? createClient(url)
    globalForDb.__globifyDb = drizzle(globalForDb.__globifySql, { schema })
  }

  return globalForDb.__globifyDb
}

/** Returns null instead of throwing — use on public pages that can fall back. */
export function tryGetDb(): Database | null {
  return isDatabaseConfigured() ? getDb() : null
}

/** Seed/migration scripts call this so the Node process can exit. */
export async function closeDb(): Promise<void> {
  await globalForDb.__globifySql?.end({ timeout: 5 })
  globalForDb.__globifySql = undefined
  globalForDb.__globifyDb = undefined
}

export { schema }
