/**
 * MariaDB / MySQL connection.
 *
 * Deliberately free of `server-only` so the seed script and drizzle-kit can
 * import it from a plain Node process. The data layer in `src/lib/data/` is
 * what carries the `server-only` guard.
 *
 * `DATABASE_URL` is read lazily rather than at module scope: ES imports are
 * hoisted, so a script that calls `dotenv` in its body would otherwise find
 * this module already initialised with an empty value.
 */
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import * as schema from './schema'

export type Database = MySql2Database<typeof schema>

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
   pool per request exhausts MySQL's connection limit very quickly. Shared
   hosting caps concurrent connections aggressively, so keep `connectionLimit`
   low. */
const globalForDb = globalThis as unknown as {
  __globifyPool?: mysql.Pool
  __globifyDb?: Database
}

function createPool(url: string): mysql.Pool {
  return mysql.createPool({
    uri: url,
    connectionLimit: 5,
    waitForConnections: true,
    // Lets `next build` exit cleanly instead of hanging on an open socket.
    idleTimeout: 20_000,
    connectTimeout: 15_000,
    // DATETIME columns are stored as UTC; returning strings would break the
    // Date-typed schema columns, so let mysql2 hydrate them.
    timezone: 'Z',
    charset: 'utf8mb4_unicode_ci',
    supportBigNumbers: true,
  })
}

/** Throws when `DATABASE_URL` is missing — use inside admin/server actions. */
export function getDb(): Database {
  const url = databaseUrl()

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. The admin requires a MySQL/MariaDB database — see README › Admin setup.',
    )
  }

  if (!globalForDb.__globifyDb) {
    globalForDb.__globifyPool = globalForDb.__globifyPool ?? createPool(url)
    globalForDb.__globifyDb = drizzle(globalForDb.__globifyPool, { schema, mode: 'default' })
  }

  return globalForDb.__globifyDb
}

/** Returns null instead of throwing — use on public pages that can fall back. */
export function tryGetDb(): Database | null {
  return isDatabaseConfigured() ? getDb() : null
}

/** Seed/migration scripts call this so the Node process can exit. */
export async function closeDb(): Promise<void> {
  await globalForDb.__globifyPool?.end()
  globalForDb.__globifyPool = undefined
  globalForDb.__globifyDb = undefined
}

export { schema }
