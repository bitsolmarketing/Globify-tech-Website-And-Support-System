import { NextResponse } from 'next/server'
import type { NextAuthConfig } from 'next-auth'

import type { PortalRole } from '@/db/schema'

/**
 * The Edge-safe half of the *portal* Auth.js setup — students and instructors.
 *
 * This is a second, fully independent Auth.js instance sitting alongside the
 * admin one in `auth.config.ts`. They share a process and a secret and nothing
 * else: different table, different route, different cookie, different
 * encryption key. `middleware.ts` imports both and dispatches on the path.
 *
 * Two instances rather than one with a role claim, because the isolation is
 * the point. A bug in the portal cannot mint an admin session, because the
 * portal never signs anything the admin instance is able to read.
 */

const canonicalOrigin = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')

/** Mounted at `src/app/api/portal-auth/[...nextauth]/route.ts`. */
export const PORTAL_BASE_PATH = '/api/portal-auth'

/**
 * The session cookie name — and, because Auth.js derives the JWT encryption key
 * with HKDF salted by this exact string, the thing that makes the two sessions
 * cryptographically separate rather than merely differently named.
 *
 * Copying a portal cookie into `authjs.session-token` therefore does not
 * escalate to admin: the admin instance derives a different key and the decrypt
 * fails outright. That property is why the name is a fixed literal instead of
 * Auth.js's environment-sensitive `__Secure-` prefixed default. A name that
 * varied by runtime would vary the key with it, and a token minted in the route
 * handler would stop decrypting in the middleware.
 *
 * The `secure` flag itself is untouched — Auth.js still sets it from the
 * request protocol, so only the prefix (defence in depth against a non-HTTPS
 * origin overwriting the cookie) is given up for that determinism.
 */
export const PORTAL_SESSION_COOKIE = 'globify.portal-session'

/** Where each role lands after signing in, and what it is allowed to open. */
export const PORTAL_HOME: Record<PortalRole, string> = {
  student: '/student',
  instructor: '/instructor',
}

/** Paths under the portal that a signed-out visitor may reach. */
const PUBLIC_PORTAL_PATHS = ['/portal/login', '/portal/register']

/** True for any path this instance is responsible for gating. */
export function isPortalPath(pathname: string): boolean {
  return (
    pathname === '/portal' ||
    pathname.startsWith('/portal/') ||
    pathname === '/student' ||
    pathname.startsWith('/student/') ||
    pathname === '/instructor' ||
    pathname.startsWith('/instructor/')
  )
}

declare module 'next-auth' {
  interface Session {
    /**
     * Present only on portal sessions. Optional because the same `Session`
     * interface is shared with the admin instance, whose users have no role.
     */
    portalRole?: PortalRole
  }

  /** What `authorize` hands back, and therefore what the `jwt` callback sees. */
  interface User {
    role?: PortalRole
  }
}

export const portalAuthConfig = {
  basePath: PORTAL_BASE_PATH,
  cookies: { sessionToken: { name: PORTAL_SESSION_COOKIE } },
  /** JWT sessions, same as the admin — no session table to keep in step. */
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: {
    signIn: '/portal/login',
    error: '/portal/login',
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      /* `user` is only populated on the sign-in request, so the role has to be
         copied onto the token then — every later request has the token alone. */
      if (user?.role) token.portalRole = user.role
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      /* `JWT extends Record<string, unknown>`, so the claim arrives untyped.
         Matching it against the literals rather than casting means a token
         carrying anything else is treated as having no role at all. */
      const role = token.portalRole
      if (role === 'student' || role === 'instructor') session.portalRole = role
      return session
    },
    /**
     * Gate for the middleware matcher.
     *
     * Two things happen here. A signed-out visitor is sent to the portal login,
     * and — the part a single-role gate would miss — a student is kept out of
     * `/instructor` and an instructor out of `/student`. Doing it in the
     * middleware means a wrong-role request never reaches a page at all, and
     * the layouts re-check anyway for anything the matcher does not cover.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      if (!isPortalPath(pathname)) return true
      if (PUBLIC_PORTAL_PATHS.includes(pathname)) return true

      const base = canonicalOrigin || request.nextUrl.origin
      if (!auth?.user) return NextResponse.redirect(new URL('/portal/login', base))

      const role = auth.portalRole
      if (!role) return NextResponse.redirect(new URL('/portal/login', base))

      /* `/portal/*` beyond the public pages is shared ground — the role router
         and the forced password change both live there. */
      if (pathname.startsWith('/portal')) return true

      const home = PORTAL_HOME[role]
      if (pathname === home || pathname.startsWith(`${home}/`)) return true

      /* Signed in, wrong wing. Send them to their own rather than to a 403:
         the usual cause is a stale bookmark, not an attack. */
      return NextResponse.redirect(new URL(home, base))
    },
  },
  providers: [],
} satisfies NextAuthConfig
