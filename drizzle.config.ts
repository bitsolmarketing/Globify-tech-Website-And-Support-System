import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

/* drizzle-kit runs outside Next, so it does not pick up any of these on its
   own. Load the same files Next does, most specific first — dotenv keeps the
   first value it sees, so order is the precedence.
 *
 * `.env.production.local` matters most and was missing: it is the only file
 * that exists on the server, so `npm run db:migrate` there found no
 * DATABASE_URL and reported a configuration problem rather than migrating. A
 * schema change that cannot be applied where the database lives is a schema
 * change that ships as an outage. */
loadEnv({ path: '.env.production.local' })
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

/**
 * Migrations run against `DIRECT_URL` when it is set, and `DATABASE_URL`
 * otherwise.
 *
 * Under Supabase these were genuinely different endpoints — DDL cannot run
 * through a transaction pooler. MySQL is reached directly, so the two are
 * normally the same string; the override is kept because the database is
 * reachable on `127.0.0.1` from the server but only through whatever host
 * Remote MySQL exposes from anywhere else, and a migration run from a laptop
 * therefore needs a different URL from the one the app uses.
 *
 * There is no `schemaFilter` any more. Under Postgres it was a blast-radius
 * guard, scoping drizzle-kit to `globify_site` so a `push` could not propose
 * dropping another application's tables out of `public`. MySQL has no schema
 * inside a database — the database *is* the namespace — so the equivalent
 * protection is simply that DATABASE_URL names a database this app owns
 * outright. Never point it at one shared with anything else.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/mysql',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || '',
  },
  strict: true,
  verbose: true,
})