import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

import { authConfig } from './auth.config'

/**
 * Auth.js v5, credentials provider, a single seeded admin user.
 *
 * The heavy imports (`bcryptjs`, the Postgres driver) are behind a dynamic
 * `import()` inside `authorize` so this module stays loadable from the Edge
 * middleware runtime, which cannot bundle them. Everything the middleware
 * needs lives in `auth.config.ts`.
 */
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const [{ getDb }, { adminUsers }, { eq }, bcrypt] = await Promise.all([
          import('@/db'),
          import('@/db/schema'),
          import('drizzle-orm'),
          import('bcryptjs'),
        ])

        const db = getDb()
        const [user] = await db
          .select()
          .from(adminUsers)
          .where(eq(adminUsers.email, email.trim().toLowerCase()))
          .limit(1)

        /* Compare against a dummy hash when the account is missing so a wrong
           email and a wrong password take the same time to answer. */
        const hash = user?.passwordHash ?? DUMMY_HASH
        const valid = await bcrypt.compare(password, hash)

        if (!user || !valid) return null

        await db
          .update(adminUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(adminUsers.id, user.id))

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
})

/** bcrypt hash of a value nobody can submit — used only for timing parity. */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Ie6yqNLKYAtHkOJdVGa9nrfXTHDpTFm'
