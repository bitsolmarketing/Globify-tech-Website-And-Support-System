import type { NextAuthConfig } from 'next-auth'

/**
 * The Edge-safe half of the Auth.js setup.
 *
 * `middleware.ts` imports only this file, so it must not pull in bcrypt, the
 * Postgres driver, or anything else that cannot run on the Edge runtime. The
 * credentials provider itself lives in `auth.ts`.
 */
export const authConfig = {
  /** JWT sessions: no session table, and the middleware can verify without a DB. */
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
    /**
     * Gate for the middleware matcher. `/admin/login` is public; everything
     * else under `/admin` requires a session.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      if (!pathname.startsWith('/admin')) return true
      if (pathname === '/admin/login') return true
      return Boolean(auth?.user)
    },
  },
  providers: [],
} satisfies NextAuthConfig
