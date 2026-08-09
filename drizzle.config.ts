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

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/mysql',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
