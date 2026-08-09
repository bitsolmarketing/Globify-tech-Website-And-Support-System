/**
 * PostgreSQL connection — Supabase.
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
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? ''
}

/**
 * `.env.production.local` ships with a fill-in-the-blanks template. A non-empty
 * placeholder is far worse than a blank: it reads as "configured", so every
 * request tries to reach a host that cannot resolve and blocks for the full
 * connect timeout before falling back.
 *
 * Real hostnames and Postgres roles are effectively never SHOUT_CASE, so that
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

  if (!/^(postgres|postgresql):$/.test(parsed.protocol)) {
    return {
      ok: false,
      reason: `DATABASE_URL must start with postgresql:// (got "${parsed.protocol}//")`,
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

  return { ok: true }
}

/* Re-used across HMR reloads and across lambda invocations — creating a new
   pool per request exhausts the connection limit very quickly. */
const globalForDb = globalThis as unknown as {
  __globifyClient?: postgres.Sql
  __globifyDb?: Database
}

/**
 * Supabase's transaction pooler (port 6543) hands a different backend to every
 * statement, so a `PREPARE` issued on one connection is not there when the
 * `EXECUTE` lands on another — the failure surfaces much later as
 * "prepared statement \"s1\" does not exist" under concurrency, not at startup.
 *
 * Session mode (5432) and a direct connection both keep one backend for the
 * life of the connection, so they keep the prepared-statement cache.
 */
function usesTransactionPooler(url: URL): boolean {
  return url.port === '6543'
}

function createClient(url: string): postgres.Sql {
  const parsed = new URL(url)

  return postgres(url, {
    /* Shared hosting and Supabase's free tier both cap connections aggressively,
       and the pooler in front of this multiplexes anyway, so a small ceiling
       here costs nothing and keeps one instance from monopolising the tier. */
    max: 5,
    prepare: !usesTransactionPooler(parsed),
    /* Supabase terminates TLS at the pooler and presents a certificate for
       *.pooler.supabase.com signed by a root Node does not ship, so full
       verification fails against a connection that is nonetheless encrypted.
       `require` is the same guarantee libpq's sslmode=require gives. */
    ssl: 'require',
    // Lets `next build` and the seed script exit instead of hanging on a socket.
    idle_timeout: 20,
    /*
     * Anything approaching this bound is an outage, not slowness, and waiting
     * longer only delays the seed-data fallback in `lib/data/cache.ts`.
     */
    connect_timeout: 10,
    /* The pooler emits notices on connect that carry no information the app can
       act on; left unhandled they print on every cold start. */
    onnotice: () => {},
  })
}

/** Throws when `DATABASE_URL` is missing or unusable — use in admin actions. */
export function getDb(): Database {
  const check = describeDatabaseUrl()

  if (!check.ok) {
    throw new Error(`${check.reason}. The admin requires a Postgres database — see README › Admin setup.`)
  }

  const url = databaseUrl()

  if (!globalForDb.__globifyDb) {
    globalForDb.__globifyClient = globalForDb.__globifyClient ?? createClient(url)
    globalForDb.__globifyDb = drizzle(globalForDb.__globifyClient, { schema })
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
 * uninformative "could not reach the database". That is the exact conflation
 * this function was written to remove, reintroduced one level down.
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

/** The driver error message, for the cases where the code alone is ambiguous. */
function errorMessage(error: unknown): string {
  let current: unknown = error

  for (let depth = 0; depth < 5; depth++) {
    if (typeof current !== 'object' || current === null) return ''
    const message = (current as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
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
      // 28P01 invalid_password, 28000 invalid_authorization_specification.
      case '28P01':
      case '28000':
        return { ok: false, reason: `Postgres rejected the credentials in DATABASE_URL (host ${host})` }
      // 3D000 invalid_catalog_name.
      case '3D000':
        return { ok: false, reason: `The database named in DATABASE_URL does not exist on ${host}` }
      // 53300 too_many_connections.
      case '53300':
        return { ok: false, reason: `${host} has no connection slots left — use the transaction pooler (port 6543)` }
      case 'ENOTFOUND':
      case 'EAI_AGAIN':
        return { ok: false, reason: `The host in DATABASE_URL does not resolve (${host})` }
      case 'ENETUNREACH':
        /* Supabase's direct host (db.<ref>.supabase.co) is IPv6-only. On an
           IPv4-only network it resolves and then cannot be reached, which looks
           nothing like a transport problem unless it is named. */
        return {
          ok: false,
          reason: `No route to ${host} — if this is db.*.supabase.co it is IPv6-only; use the pooler host instead`,
        }
      case 'ECONNREFUSED':
        return { ok: false, reason: `Nothing is listening for Postgres on ${host}` }
      case 'ETIMEDOUT':
      case 'CONNECT_TIMEOUT':
        return { ok: false, reason: `Timed out connecting to ${host}` }
      default: {
        /* Supavisor reports an unknown tenant as a generic XX000, so the
           username is the only thing that distinguishes "this project does not
           exist here" from a genuine internal error. The pooler expects
           `postgres.<project-ref>`; a bare `postgres` lands here every time. */
        if (/tenant or user not found/i.test(errorMessage(error))) {
          return {
            ok: false,
            reason: `${host} does not know this project — the pooler username must be "postgres.<project-ref>", and the host region must match`,
          }
        }

        return {
          ok: false,
          reason: `Could not reach the database at ${host}${code ? ` (${code})` : ''}`,
        }
      }
    }
  }
}

/** Seed/migration scripts call this so the Node process can exit. */
export async function closeDb(): Promise<void> {
  await globalForDb.__globifyClient?.end({ timeout: 5 })
  globalForDb.__globifyClient = undefined
  globalForDb.__globifyDb = undefined
}

export { schema }