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
import { sql } from 'drizzle-orm'
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import * as schema from './schema'

export type Database = MySql2Database<typeof schema>

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? ''
}

/**
 * `.env.production.local` ships with `mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME`
 * as a fill-in-the-blanks template. A non-empty placeholder is far worse than a
 * blank: it reads as "configured", so every request tries to reach a host that
 * cannot resolve and blocks for the full connect timeout before falling back.
 *
 * Real hostnames and MySQL usernames are effectively never SHOUT_CASE, so that
 * shape is a reliable marker for an unsubstituted template variable.
 */
const PLACEHOLDER = /^[A-Z][A-Z0-9_]*$/

/**
 * When false the whole site falls back to the seed data still checked into
 * `src/lib/*.ts` and `content/blog/`, so a fresh clone builds with no database.
 *
 * A malformed or still-templated URL is treated as "not configured" rather than
 * left to fail per request: the outcome is the same seed-data fallback, but it
 * costs nothing instead of a connect timeout every time.
 */
export function isDatabaseConfigured(): boolean {
  return describeDatabaseUrl().ok
}

/** The reason a URL was rejected, for the admin login screen and the logs. */
export function describeDatabaseUrl(): { ok: true } | { ok: false; reason: string } {
  const url = databaseUrl()
  if (!url) return { ok: false, reason: 'DATABASE_URL is not set' }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: 'DATABASE_URL is not a valid connection URL' }
  }

  if (!/^(mysql|mariadb):$/.test(parsed.protocol)) {
    return { ok: false, reason: `DATABASE_URL must start with mysql:// (got "${parsed.protocol}//")` }
  }

  const templated = (
    [
      ['host', parsed.hostname],
      ['user', decodeURIComponent(parsed.username)],
      ['password', decodeURIComponent(parsed.password)],
      ['database', decodeURIComponent(parsed.pathname.replace(/^\//, ''))],
    ] as const
  ).filter(([, value]) => PLACEHOLDER.test(value))

  if (templated.length > 0) {
    return {
      ok: false,
      reason: `DATABASE_URL still contains the template placeholders: ${templated
        .map(([field, value]) => `${field}="${value}"`)
        .join(', ')}`,
    }
  }

  if (!parsed.hostname) return { ok: false, reason: 'DATABASE_URL has no host' }

  return { ok: true }
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
    /*
     * An unbounded queue is what turns a database outage into a 504. Five
     * connections each stuck on a connect attempt means waiters are served in
     * timeout-length batches, so the twentieth queued request only finds out it
     * failed after four full timeouts — by which point the proxy in front of
     * Node has already given up. Bounding the queue makes the overflow fail
     * immediately with ER_CON_COUNT_ERROR, which trips the breaker in
     * `lib/data/cache.ts` and gets everyone onto the seed-data path.
     */
    queueLimit: 10,
    // Lets `next build` exit cleanly instead of hanging on an open socket.
    idleTimeout: 20_000,
    /*
     * The app and MySQL sit on the same Hostinger box, so a healthy connect is
     * single-digit milliseconds. Anything approaching this bound is an outage,
     * not slowness, and waiting longer only delays the fallback.
     */
    connectTimeout: 5_000,
    // Reconnects are the expensive part on shared hosting; keep sockets warm.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    // DATETIME columns are stored as UTC; returning strings would break the
    // Date-typed schema columns, so let mysql2 hydrate them.
    timezone: 'Z',
    charset: 'utf8mb4_unicode_ci',
    supportBigNumbers: true,
  })
}

/** Throws when `DATABASE_URL` is missing or unusable — use in admin actions. */
export function getDb(): Database {
  const check = describeDatabaseUrl()

  if (!check.ok) {
    throw new Error(
      `${check.reason}. The admin requires a MySQL/MariaDB database — see README › Admin setup.`,
    )
  }

  const url = databaseUrl()

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

/**
 * Cheap liveness probe, used to tell "wrong password" apart from "the database
 * is down" on the sign-in screen.
 *
 * Auth.js reports every `authorize` failure as the same opaque
 * `CredentialsSignin`, so without this an unreachable database is indis-
 * tinguishable from a typo — which is exactly the dead end that makes a broken
 * admin look like a forgotten password.
 */
export async function pingDatabase(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const check = describeDatabaseUrl()
  if (!check.ok) return check

  try {
    await getDb().execute(sql`select 1`)
    return { ok: true }
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string'
        ? (error as { code: string }).code
        : ''

    const host = new URL(databaseUrl()).host

    switch (code) {
      case 'ER_ACCESS_DENIED_ERROR':
        return { ok: false, reason: `MySQL rejected the credentials in DATABASE_URL (host ${host})` }
      case 'ER_BAD_DB_ERROR':
        return { ok: false, reason: `The database named in DATABASE_URL does not exist on ${host}` }
      case 'ENOTFOUND':
      case 'EAI_AGAIN':
        return { ok: false, reason: `The host in DATABASE_URL does not resolve (${host})` }
      case 'ECONNREFUSED':
        return { ok: false, reason: `Nothing is listening for MySQL on ${host}` }
      case 'ETIMEDOUT':
        return { ok: false, reason: `Timed out connecting to ${host} — check the firewall / Remote MySQL allow-list` }
      default:
        return {
          ok: false,
          reason: `Could not reach the database at ${host}${code ? ` (${code})` : ''}`,
        }
    }
  }
}

/** Seed/migration scripts call this so the Node process can exit. */
export async function closeDb(): Promise<void> {
  await globalForDb.__globifyPool?.end()
  globalForDb.__globifyPool = undefined
  globalForDb.__globifyDb = undefined
}

export { schema }
