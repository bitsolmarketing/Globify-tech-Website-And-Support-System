import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

import { portalAuthConfig } from './portal-auth.config'

/**
 * Auth.js for the learning portal — students and instructors.
 *
 * Mirrors `auth.ts` in shape, but reads `portal_users` rather than
 * `admin_users` and signs its session with a different cookie name, which is
 * what keeps the two populations apart at the cryptographic level rather than
 * the conditional level. See `portal-auth.config.ts`.
 *
 * As in `auth.ts`, bcrypt and the Postgres driver are behind a dynamic
 * `import()` so this module never drags them into the Edge middleware bundle.
 */
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const {
  handlers: portalHandlers,
  auth: portalAuth,
  signIn: portalSignIn,
  signOut: portalSignOut,
} = NextAuth({
  ...portalAuthConfig,
  providers: [
    Credentials({
      id: 'portal',
      name: 'Portal',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const [{ getDb }, { portalUsers }, { eq }, bcrypt] = await Promise.all([
          import('@/db'),
          import('@/db/schema'),
          import('drizzle-orm'),
          import('bcryptjs'),
        ])

        const db = getDb()
        const [user] = await db
          .select()
          .from(portalUsers)
          .where(eq(portalUsers.email, email.trim().toLowerCase()))
          .limit(1)

        /* Compare against a dummy hash when the account is missing so a wrong
           email and a wrong password take the same time to answer. */
        const hash = user?.passwordHash ?? DUMMY_HASH
        const valid = await bcrypt.compare(password, hash)

        if (!user || !valid) return null

        /* A suspended account fails *after* the hash comparison, deliberately:
           answering early would tell an outsider which addresses are real. */
        if (user.status !== 'active') return null

        await db
          .update(portalUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(portalUsers.id, user.id))

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})

/** bcrypt hash of a value nobody can submit — used only for timing parity. */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Ie6yqNLKYAtHkOJdVGa9nrfXTHDpTFm'
