import NextAuth from 'next-auth'
import type { NextFetchEvent, NextRequest } from 'next/server'

import { authConfig } from './auth.config'
import { isPortalPath, portalAuthConfig } from './portal-auth.config'

/**
 * Two independent Auth.js gates behind one Next middleware export.
 *
 * `/admin/*` is checked against the admin session; `/portal`, `/student` and
 * `/instructor` against the portal one. Next allows a single middleware, and
 * each `NextAuth().auth` wrapper only knows about its own cookie — so the
 * dispatch has to happen here, by path, before either is invoked.
 *
 * Order matters only in that the two path sets are disjoint. Neither wrapper
 * ever sees a request belonging to the other, which is what stops the admin
 * gate from redirecting a student to `/admin/login`.
 *
 * Edge-safe config only, on both sides — no database driver and no bcrypt
 * reaches this bundle.
 */
const { auth: adminGate } = NextAuth(authConfig)
const { auth: portalGate } = NextAuth(portalAuthConfig)

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl

  if (isPortalPath(pathname)) {
    return (portalGate as unknown as MiddlewareFn)(request, event)
  }

  return (adminGate as unknown as MiddlewareFn)(request, event)
}

/**
 * `auth` is overloaded for use as a route wrapper, a server helper and a
 * middleware; TypeScript picks the wrong overload when it is called
 * indirectly, so the middleware signature is named here rather than inferred.
 */
type MiddlewareFn = (
  request: NextRequest,
  event: NextFetchEvent,
) => ReturnType<typeof adminGate>

export const config = {
  /*
   * Only gated routes are matched. The public site never runs middleware, so
   * it keeps its fully static rendering.
   */
  matcher: ['/admin/:path*', '/portal/:path*', '/student/:path*', '/instructor/:path*'],
}
