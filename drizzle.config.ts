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
 * Supabase publishes two connection strings, and the difference matters here.
 * The app uses the transaction pooler (port 6543), which multiplexes many short
 * connections onto few server ones — exactly right for serverless request
 * handlers, but it cannot hold session state, so it rejects the advisory locks
 * and prepared statements DDL relies on. Migrations therefore want the direct
 * or session-mode connection (port 5432).
 *
 * Falling back keeps a single-URL setup working: point both at 5432 and
 * everything runs, just without the pooler's connection reuse.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/pg',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || '',
  },
  /*
   * The blast-radius guard, and the reason it is not `public`.
   *
   * This Supabase project is shared: `public` belongs to the AI assistant's
   * Prisma schema (33 tables, live data) and `auth`/`storage`/`realtime` belong
   * to Supabase itself. drizzle-kit treats every table it can see but does not
   * find in `schema.ts` as drift, and offers to drop it — so pointed at
   * `public` a routine `push` would propose deleting another application's
   * database. Scoping it to the one schema this app owns makes that impossible
   * rather than merely unlikely.
   */
  schemaFilter: ['globify_site'],
  strict: true,
  verbose: true,
})