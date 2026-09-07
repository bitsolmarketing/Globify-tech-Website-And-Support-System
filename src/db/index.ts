/**
 * MySQL connection.
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
 * `.env.production.local` ships with a fill-in-the-blanks template. A non-empty
 * placeholder is far worse than a blank: it reads as "configured", so every
 * request tries to reach a host that cannot resolve and blocks for the full
 * connect timeout before falling back.
 *
 * Real hostnames and MySQL users are effectively never SHOUT_CASE, so that
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
    return {
      ok: false,
      reason: `DATABASE_URL must start with mysql:// (got "${parsed.protocol}//")`,
    }
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
  if (!parsed.pathname.replace(/^\//, '')) {
    return { ok: false, reason: 'DATABASE_URL names no database' }
  }

  return { ok: true }
}

/**
 * What the pool is actually built from.
 *
 * Under Supabase this corrected a transaction-pooler port to the session
 * pooler, so the raw variable could name a port the process never opened and
 * `/api/version` had to report the corrected one to stay honest. MySQL is
 * reached directly and nothing is rewritten, but the export is kept: it is the
 * contract `/api/version` reads, and "what this process believes it connects
 * to" remains the question that endpoint exists to answer.
 */
export function effectiveDatabaseUrl(): string {
  return databaseUrl()
}

/* Re-used across HMR reloads and across lambda invocations — creating a new
   pool per request exhausts the connection limit very quickly. */
const globalForDb = globalThis as unknown as {
  __globifyPool?: mysql.Pool
  __globifyDb?: Database
}

/**
 * How long one query may take, counting the wait for a free pool slot.
 *
 * mysql2 bounds the initial connect but not what happens afterwards, so a
 * connection that stops answering mid-exchange would hold its query open
 * indefinitely — and because the pool is small, every later query queues behind
 * it. The admin dashboard issues nine reads at once, so a couple of stuck slots
 * is all it takes for the page to stop responding and for the proxy in front to
 * end the request with a 504.
 *
 * Eight seconds stays well under that proxy's sixty even when the pool is full
 * and the dashboard's reads run in two waves. A healthy query here takes
 * milliseconds, so anything approaching this is a fault, and failing at it is
 * what lets the circuit breaker in `lib/data/cache.ts` open and serve seed
 * content instead of waiting.
 */
const QUERY_TIMEOUT_MS = 8_000

/** Recognised as a connection-class fault by `lib/data/cache.ts`. */
export const QUERY_TIMEOUT = 'QUERY_TIMEOUT'

function timedOut(): Error & { code: string } {
  const error = new Error(
    `No answer within ${QUERY_TIMEOUT_MS}ms — the database connection is not responding`,
  ) as Error & { code: string }
  error.code = QUERY_TIMEOUT
  return error
}

/**
 * Gives every query drizzle issues an upper bound.
 *
 * Drizzle reaches the driver through `query` and `execute`, so wrapping the two
 * covers every read and write in the app without touching a call site. mysql2
 * hands back real promises — unlike postgres-js, whose lazy thenables had to be
 * bounded by swapping their internal resolvers — so a plain race is enough.
 *
 * The losing query is not cancelled. MySQL can only kill a running statement
 * over a second connection, which is a heavier remedy than the fault deserves;
 * the caller is freed, and the connection returns to the pool when the server
 * eventually answers.
 */
function boundQueries(pool: mysql.Pool): mysql.Pool {
  for (const method of ['query', 'execute'] as const) {
    const original = pool[method].bind(pool) as (...args: unknown[]) => Promise<unknown>

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pool as any)[method] = (...args: unknown[]) => {
      let timer: NodeJS.Timeout | undefined
      const bound = new Promise((_, reject) => {
        timer = setTimeout(() => reject(timedOut()), QUERY_TIMEOUT_MS)
        /* Never let a pending bound hold the seed script or a build open. */
        ;(timer as unknown as { unref?: () => void }).unref?.()
      })

      return Promise.race([original(...args), bound]).finally(() => clearTimeout(timer))
    }
  }

  return pool
}

function createPool(url: string): mysql.Pool {
  return boundQueries(
    mysql.createPool({
      uri: url,
      /* Shared hosting caps connections aggressively, so a small ceiling costs
         nothing here and keeps one instance from monopolising the account. */
      connectionLimit: 5,
      waitForConnections: true,
      /* Unbounded. A rejected query would bypass the timeout above and reach
         the caller as a driver error the circuit breaker does not recognise. */
      queueLimit: 0,
      /*
       * MySQL has no timezone-aware column type, so `DATETIME` stores whatever
       * the driver sends. Pinning the connection to UTC is what makes the
       * values absolute instants rather than "whatever the server's clock said"
       * — the guarantee Postgres's `timestamptz` gave for free. Every reader
       * must agree on this or the same row reads differently per client.
       */
      timezone: 'Z',
      charset: 'utf8mb4',
      /* Anything approaching this is an outage, not slowness, and waiting
         longer only delays the seed-data fallback in `lib/data/cache.ts`. */
      connectTimeout: 10_000,
      enableKeepAlive: true,
      /* Returned as strings rather than silently losing precision past 2^53.
         Nothing here stores an integer that large, but a silent wrong number is
         a worse failure than a string that fails loudly. */
      supportBigNumbers: true,
      bigNumberStrings: true,
    }),
  )
}

/** Throws when `DATABASE_URL` is missing or unusable — use in admin actions. */
export function getDb(): Database {
  const check = describeDatabaseUrl()

  if (!check.ok) {
    throw new Error(
      `${check.reason}. The admin requires a MySQL database — see README › Admin setup.`,
    )
  }

  if (!globalForDb.__globifyDb) {
    globalForDb.__globifyPool = globalForDb.__globifyPool ?? createPool(databaseUrl())
    globalForDb.__globifyDb = drizzle(globalForDb.__globifyPool, { schema, mode: 'default' })
  }

  return globalForDb.__globifyDb
}

/** Returns null instead of throwing — use on public pages that can fall back. */
export function tryGetDb(): Database | null {
  return isDatabaseConfigured() ? getDb() : null
}

/**
 * The driver error code, however deeply it has been wrapped.
 *
 * Drizzle wraps every query error in a `DrizzleQueryError` and hangs the real
 * one off `cause`, so reading `error.code` directly found nothing and sent
 * every single failure to the default branch below — access denied, missing
 * database, connection refused and timed out all reported as the same
 * uninformative "could not reach the database".
 */
function errorCode(error: unknown): string {
  let current: unknown = error

  // Bounded: `cause` chains can be circular, and no real one is this deep.
  for (let depth = 0; depth < 5; depth++) {
    if (typeof current !== 'object' || current === null) return ''
    const code = (current as { code?: unknown }).code
    if (typeof code === 'string' && code) return code
    current = (current as { cause?: unknown }).cause
  }

  return ''
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
    const code = errorCode(error)
    const host = new URL(databaseUrl()).host

    switch (code) {
      case 'ER_ACCESS_DENIED_ERROR':
      case 'ER_DBACCESS_DENIED_ERROR':
        return { ok: false, reason: `MySQL rejected the credentials in DATABASE_URL (host ${host})` }
      case 'ER_BAD_DB_ERROR':
        return { ok: false, reason: `The database named in DATABASE_URL does not exist on ${host}` }
      case 'ER_CON_COUNT_ERROR':
      case 'ER_TOO_MANY_USER_CONNECTIONS':
      case 'ER_USER_LIMIT_REACHED':
        return { ok: false, reason: `${host} has no connection slots left for this user` }
      case 'ENOTFOUND':
      case 'EAI_AGAIN':
        return { ok: false, reason: `The host in DATABASE_URL does not resolve (${host})` }
      case 'ENETUNREACH':
      case 'EHOSTUNREACH':
        return { ok: false, reason: `No route to ${host}` }
      case 'ECONNREFUSED':
        return { ok: false, reason: `Nothing is listening for MySQL on ${host}` }
      case 'ECONNRESET':
      case 'PROTOCOL_CONNECTION_LOST':
        return { ok: false, reason: `${host} closed the connection mid-exchange` }
      case 'ETIMEDOUT':
      case 'PROTOCOL_SEQUENCE_TIMEOUT':
        return { ok: false, reason: `Timed out connecting to ${host}` }
      case QUERY_TIMEOUT:
        /* Reached, rather than refused. Distinguishing the two is the point:
           "connected but silent" is a connection that stopped answering
           mid-exchange, which no amount of checking the URL will explain. */
        return {
          ok: false,
          reason: `${host} accepted the connection but did not answer within ${
            QUERY_TIMEOUT_MS / 1000
          }s`,
        }
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
