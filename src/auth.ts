import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'

import { authConfig, type SessionRole } from './auth.config'

/**
 * Auth.js v5, credentials only, two providers.
 *
 * `credentials` is the original admin provider and keeps that id, so the admin
 * login form's `signIn('credentials', …)` call is untouched. `student` is the
 * public one, backed by the `students` table. They are separate providers over
 * separate tables rather than one query across both: a single lookup that
 * happened to match an admin row would hand out an admin session from the
 * public sign-in form, and no amount of care downstream could undo that.
 *
 * The heavy imports (`bcryptjs`, the Postgres driver) are behind a dynamic
 * `import()` inside `authorize` so this module stays loadable from the Edge
 * middleware runtime, which cannot bundle them. Everything the middleware
 * needs lives in `auth.config.ts`.
 */
declare module 'next-auth' {
  interface Session {
    user: { id: string; role: SessionRole } & DefaultSession['user']
  }

  interface User {
    role?: SessionRole
  }
}

/*
 * `JWT` is deliberately not augmented. It is declared in `@auth/core/jwt` and
 * re-exported by `next-auth/jwt`, which nothing in this app imports — so TS
 * cannot resolve the module to augment it, and adding an import purely to make
 * a `declare module` block legal trips `noUnusedLocals`.
 *
 * It costs nothing, because `JWT extends Record<string, unknown>`: writing the
 * claim below type-checks against the index signature, and the session callback
 * in `auth.config.ts` narrows it on the way back out rather than trusting it.
 */

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

        return { id: user.id, email: user.email, name: user.name, role: 'admin' }
      },
    }),

    Credentials({
      id: 'student',
      name: 'Student',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const [{ getDb }, { students }, { eq }, bcrypt] = await Promise.all([
          import('@/db'),
          import('@/db/schema'),
          import('drizzle-orm'),
          import('bcryptjs'),
        ])

        const db = getDb()
        const [student] = await db
          .select()
          .from(students)
          .where(eq(students.email, email.trim().toLowerCase()))
          .limit(1)

        /* Same timing parity as the admin provider above: a missing account and
           a wrong password must take the same time to answer, or the response
           time enumerates who has registered. */
        const hash = student?.passwordHash ?? DUMMY_HASH
        const valid = await bcrypt.compare(password, hash)

        if (!student || !valid) return null

        /* Checked after the hash comparison, so a suspended account is not
           distinguishable from a wrong password by timing either. */
        if (student.status !== 'active') return null

        await db
          .update(students)
          .set({ lastLoginAt: new Date() })
          .where(eq(students.id, student.id))

        return { id: student.id, email: student.email, name: student.name, role: 'student' }
      },
    }),
  ],
})

/** bcrypt hash of a value nobody can submit — used only for timing parity. */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Ie6yqNLKYAtHkOJdVGa9nrfXTHDpTFm'
