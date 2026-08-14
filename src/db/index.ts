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
  /** Earliest time another pool may be retired — see `retirePool`. */
  __globifyRetiredAt?: number
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

/**
 * =============================================================================
 *  Why this app talks to the session pooler, not the transaction pooler
 * =============================================================================
 *
 * The transaction pooler cannot survive a connection being *reused*, which is
 * the whole basis of a long-lived server's connection pool.
 *
 * Measured against the live database, nine concurrent reads — the shape of the
 * admin dashboard — behave like this on `aws-0-*.pooler.supabase.com`:
 *
 *     port 6543   first burst 9/9 in 0.9s, second burst never returns
 *     port 5432   first burst 9/9 in 1.3s, every later burst 9/9 in 0.1s
 *
 * 6543 wedged identically with `prepare:false`, with `fetch_types:false` and
 * with `max_pipeline:1`, so it is not the prepared-statement problem described
 * above and not pipelining either. The first burst opens fresh connections and
 * succeeds; the second reuses idle ones and hangs, leaving backends parked in
 * `active` / `ClientRead` waiting on a client message that never arrives —
 * where no server-side timeout can reap them, because the backend is neither
 * executing nor in a transaction.
 *
 * That is precisely the 504 this file was changed to fix: the dashboard worked
 * on the first load after a restart and hung on every one after it.
 *
 * Transaction mode was chosen here for its connection ceiling, and that reason
 * was sound — it is simply not worth a pool that stops answering on its second
 * use. Session mode holds one backend per connection, and with `max` below it
 * costs at most a handful of the sixty this database allows.
 *
 * The port is corrected here rather than in the environment because the server's
 * variables are edited by hand in hPanel, so a deploy cannot carry the change
 * with it — a code fix reaches production, an env fix waits for someone to
 * remember. Setting `DATABASE_URL` to 5432 directly is still the tidier end
 * state, and it makes this a no-op rather than something to undo.
 * =============================================================================
 */
const SESSION_POOLER_PORT = '5432'

function preferSessionPooler(url: string): string {
  const parsed = new URL(url)

  /* Supabase's pooler hosts only. A self-hosted Postgres, or anything else that
     happens to listen on 6543, is left exactly as configured. */
  if (!usesTransactionPooler(parsed) || !/(^|\.)pooler\.supabase\.com$/.test(parsed.hostname)) {
    return url
  }

  parsed.port = SESSION_POOLER_PORT
  return parsed.toString()
}

/**
 * The URL the pool is actually built from, port correction included.
 *
 * `/api/version` reports what the *running process* believes its connection is,
 * which is the only report that settles an argument between a shell and an app
 * holding different values for the same name. Reading the raw variable there
 * would now name a port nothing connects to — the precise kind of confident,
 * wrong answer that endpoint exists to prevent.
 */
export function effectiveDatabaseUrl(): string {
  const url = databaseUrl()
  if (!url) return url

  try {
    return preferSessionPooler(url)
  } catch {
    /* Unparseable. Handing it back untouched leaves the caller to report the
       malformed value it already knows how to describe. */
    return url
  }
}

/**
 * How long one query may take, counting the wait for a free pool slot.
 *
 * postgres-js has no query timeout. `connect_timeout` is cancelled the instant a
 * connection reports ready and nothing bounds what happens after it, so a
 * connection that stops answering mid-exchange holds its query open for ever —
 * and because the pool is small, every later query queues behind it. The admin
 * dashboard issues nine reads at once, so a couple of stuck slots is all it
 * takes for the page to stop responding and for the proxy in front to end the
 * request with a 504.
 *
 * Nothing on the server side can be relied on to cut this short either. A
 * pooled backend left waiting on `ClientRead` is not executing, so
 * `statement_timeout` never fires, and it is not in a transaction, so
 * `idle_in_transaction_session_timeout` does not reach it either. The bound has
 * to come from this side.
 *
 * Eight seconds stays well under the proxy's sixty even when the pool is full
 * and the dashboard's reads run in two waves. A healthy query here takes
 * milliseconds, so anything approaching this is a fault, and failing at it is
 * what lets the circuit breaker in `lib/data/cache.ts` open and serve seed
 * content instead of waiting.
 */
const QUERY_TIMEOUT_MS = 8_000

/** Recognised as a connection-class fault by `lib/data/cache.ts`. */
export const QUERY_TIMEOUT = 'QUERY_TIMEOUT'

/**
 * Consecutive timeouts before the pool is thrown away and rebuilt.
 *
 * A timed-out query frees its caller but not the connection it was waiting on:
 * postgres-js closes a connection only once its in-flight query finishes, and a
 * wedged one never does. Each wedge therefore costs a pool slot permanently, and
 * after `max` of them every query times out for ever — an outage that outlives
 * the fault that caused it and clears only on a restart nobody knows to perform.
 *
 * So a run of timeouts is read as "the pool itself is gone" and it is retired,
 * letting the next call build a clean one. A run rather than a single one,
 * because one slow query under load must not discard the healthy connections
 * around it.
 */
const TIMEOUTS_BEFORE_RECYCLE = 3

/** Floor between retirements, so an outage cannot turn into a socket storm. */
const RETIRE_COOLDOWN_MS = 60_000

/**
 * The private surface of a postgres-js query.
 *
 * `resolve`/`reject` are the instance's own handles on its promise, and they are
 * what make it possible to fail a query from the outside without needing
 * anything from the connection it is stuck on.
 */
type QueryInternals = {
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

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
 * Drizzle funnels all of its execution paths through `client.unsafe`, so this
 * one wrapper covers every read and write in the app without touching a single
 * call site. It deliberately does not hand back a promise race: drizzle calls
 * `.values()` on what it gets, and `.then()` on a postgres-js query is what
 * starts the query executing — a wrapper object would break the first and fire
 * the second too early. Swapping the query's own `resolve`/`reject` leaves the
 * object, and the moment it runs, exactly as they were.
 */
function boundQueries(client: postgres.Sql): postgres.Sql {
  const unsafe = client.unsafe.bind(client)

  /* Scoped to this pool rather than to the module. A burst of nine dashboard
     reads times out together, so a shared counter would trip, rebuild, and then
     immediately trip again on the stragglers — retiring a pool that had done
     nothing wrong. Counting per pool means the stragglers are charged to the
     one they were issued against, which by then is already gone. */
  let consecutiveTimeouts = 0

  function retirePool(): void {
    if (++consecutiveTimeouts < TIMEOUTS_BEFORE_RECYCLE) return
    if (globalForDb.__globifyClient !== client) return

    /* A full outage times out every query, so without a floor here the app
       would abandon a pool every few seconds and open a fresh set of sockets
       against a database that is already struggling. Retiring at most once a
       minute keeps the repair from becoming the load. */
    const now = Date.now()
    if (now < (globalForDb.__globifyRetiredAt ?? 0)) return
    globalForDb.__globifyRetiredAt = now + RETIRE_COOLDOWN_MS

    globalForDb.__globifyClient = undefined
    globalForDb.__globifyDb = undefined

    console.error(
      `[db] ${TIMEOUTS_BEFORE_RECYCLE} queries in a row went unanswered — ` +
        'retiring the connection pool so the next request builds a new one',
    )

    /* Dropped, deliberately without being closed.

       Neither way of closing it is safe. `end({ timeout })` schedules
       postgres-js's own `destroy`, which force-closes every socket and then
       writes to them; that write throws from inside a `setTimeout` whose
       promise is never returned, so nothing can catch it and the process dies.
       A plain `end()` is quieter but worse than doing nothing: it stops the
       pool serving, so the queries already queued on it — which the healthy
       connections were about to pick up — hang until they time out too. Both
       were measured here, and the second turned one stuck connection into five
       failed reads.

       Dropping the reference has neither problem. The old pool finishes what it
       was already given, its healthy connections close themselves on
       `idle_timeout`, and only the genuinely wedged sockets are left behind —
       which were never reclaimable from this side anyway. */
  }

  client.unsafe = ((...args: Parameters<typeof unsafe>) => {
    const query = unsafe(...args)
    const internals = query as unknown as QueryInternals
    const { resolve, reject } = internals

    let expired = false

    const timer = setTimeout(() => {
      expired = true
      retirePool()

      /* Best effort only: cancelling opens a second connection to ask Postgres
         to stop, which a wedged backend will not answer either. It still earns
         its place for a query that never started — that one leaves the pool
         queue here instead of running later against nobody. The caller is
         freed on the line below whatever this does. */
      try {
        query.cancel()
      } catch {
        /* Nothing cancellable. The rejection below is what matters. */
      }

      reject(timedOut())
    }, QUERY_TIMEOUT_MS)

    /* Never let a pending bound hold the seed script or a build open. */
    ;(timer as unknown as { unref?: () => void }).unref?.()

    internals.resolve = (value) => {
      clearTimeout(timer)
      consecutiveTimeouts = 0
      resolve(value)
    }

    /* `cancel()` above rejects a not-yet-started query with 57014 on its way
       out. Reporting that would send whoever reads the log hunting for a
       cancellation nobody asked for, so the timeout is what surfaces instead. */
    internals.reject = (error) => {
      clearTimeout(timer)
      reject(expired ? timedOut() : error)
    }

    return query
  }) as typeof client.unsafe

  return client
}

function createClient(configured: string): postgres.Sql {
  const url = preferSessionPooler(configured)
  const parsed = new URL(url)

  if (url !== configured) {
    console.warn(
      `[db] connecting to the session pooler on ${parsed.hostname}:${SESSION_POOLER_PORT}, not the ` +
        'transaction pooler on 6543, which stops answering once a pooled connection is reused',
    )
  }

  return boundQueries(postgres(url, {
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
  }))
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
      case QUERY_TIMEOUT:
        /* Reached, rather than refused. Distinguishing the two is the point:
           "connected but silent" is a pooled connection that stopped answering
           mid-exchange, which no amount of checking the URL will explain. */
        return {
          ok: false,
          reason: `${host} accepted the connection but did not answer within ${
            QUERY_TIMEOUT_MS / 1000
          }s — a pooled connection is likely wedged`,
        }
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