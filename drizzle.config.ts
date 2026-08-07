import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

/* drizzle-kit runs outside Next, so it does not pick up `.env.local` on its
   own. Load the same files Next does, most specific first. */
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
