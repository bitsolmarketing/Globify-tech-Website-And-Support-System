import { NextResponse } from 'next/server'
import type { NextAuthConfig } from 'next-auth'

/**
 * The origin this site is actually served from.
 *
 * Auth.js builds its redirects from the request it sees, and behind Passenger
 * that request arrives with `Host: 0.0.0.0:3000` — the address the Node process
 * is bound to, not the one anyone typed. So `/admin` redirected to
 * `/admin/login?callbackUrl=https://0.0.0.0:3000/admin`: a URL that resolves
 * nowhere. Signing in still worked, because the form ignores that parameter and
 * always sends people to `/admin`, but the redirect was wrong and the next
 * thing to depend on it would have inherited the fault silently.
 *
 * `NEXT_PUBLIC_SITE_URL` is the canonical origin every other URL on this site
 * is derived from, so using it here keeps them in agreement by construction
 * instead of by remembering to set a second variable.
 */
const canonicalOrigin = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')

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
      if (auth?.user) return true

      /* Returning the redirect rather than `false` is what lets it be built
         against the canonical origin instead of whatever host the proxy passed
         through. No `callbackUrl`: the sign-in form always continues to
         `/admin`, so carrying one only ever produced a wrong URL nobody read. */
      const base = canonicalOrigin || request.nextUrl.origin
      return NextResponse.redirect(new URL('/admin/login', base))
    },
  },
  providers: [],
} satisfies NextAuthConfig
