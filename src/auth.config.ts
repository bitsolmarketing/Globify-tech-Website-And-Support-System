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
 * Two populations sign in here and they must never be interchangeable: staff
 * who administer the site, and students who buy access to it. One Auth.js
 * instance serves both — separate providers in `auth.ts`, separate tables —
 * and this claim is what tells them apart everywhere downstream.
 *
 * It is carried in the JWT rather than looked up per request because the
 * middleware runs on the Edge with no database, and a gate that cannot read
 * the claim it gates on is not a gate.
 */
export type SessionRole = 'admin' | 'student'

/** Prefixes the middleware protects on a student's behalf. */
const STUDENT_PREFIXES = ['/dashboard', '/checkout'] as const

/**
 * The Edge-safe half of the Auth.js setup.
 *
 * `middleware.ts` imports only this file, so it must not pull in bcrypt, the
 * Postgres driver, or anything else that cannot run on the Edge runtime. The
 * credentials providers themselves live in `auth.ts`.
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
      if (user?.role) token.role = user.role
      return token
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub

      /*
       * Narrowed rather than asserted. `JWT` is `Record<string, unknown>` —
       * honestly so, because a token is decoded from a cookie and its shape is
       * whatever came back — and a cast here would only be a promise the type
       * system was in no position to keep.
       *
       * A token with no `role` is an admin session minted by the build that
       * shipped before students existed. Only the student provider has ever
       * written this claim, and the cookie is sealed with AUTH_SECRET so no
       * third value can appear — which makes "absent" unambiguously a legacy
       * admin, and this default what keeps every signed-in admin from being
       * logged out by the deploy that introduces students.
       *
       * Safe to simplify once no pre-existing session can still be valid; the
       * cookie lasts 8 hours, so any time after that is late enough.
       */
      const claimed = token.role
      session.user.role = claimed === 'student' || claimed === 'admin' ? claimed : 'admin'
      return session
    },
    /**
     * Gate for the middleware matcher: `/admin/*` for staff, `/dashboard/*` and
     * `/checkout/*` for students.
     *
     * The two are checked against the *role*, not merely against having a
     * session. Without that, one signed-in population would silently inherit
     * the other's pages — a student's cookie is a perfectly valid session, and
     * "valid session" was the only thing this used to ask for.
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const role = auth?.user?.role
      const base = canonicalOrigin || request.nextUrl.origin

      if (pathname.startsWith('/admin')) {
        if (pathname === '/admin/login') return true
        if (role === 'admin') return true

        /* Returning the redirect rather than `false` is what lets it be built
           against the canonical origin instead of whatever host the proxy
           passed through. No `callbackUrl`: the sign-in form always continues
           to `/admin`, so carrying one only ever produced a wrong URL nobody
           read. */
        return NextResponse.redirect(new URL('/admin/login', base))
      }

      if (STUDENT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        if (role === 'student') return true

        /* Students, unlike admins, arrive by deep link — an "Enroll" button on
           a course page points straight at /checkout/course/<slug>. Losing that
           destination at the login screen would drop them on a dashboard with
           no memory of what they were trying to buy, so this one does carry a
           continuation. It is a path, never a full URL: a redirect target taken
           from the request is an open-redirect unless it cannot name a host. */
        const login = new URL('/login', base)
        login.searchParams.set('next', pathname + request.nextUrl.search)
        return NextResponse.redirect(login)
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
