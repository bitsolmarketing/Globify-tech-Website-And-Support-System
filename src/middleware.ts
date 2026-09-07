import NextAuth from 'next-auth'

import { authConfig } from './auth.config'

/**
 * Protects `/admin/*` for staff and `/dashboard/*` + `/checkout/*` for
 * students. Uses the Edge-safe config only — no database driver and no bcrypt
 * reach this bundle. Requests without the right role are redirected by Auth.js
 * using the `authorized` callback.
 */
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  /*
   * Only signed-in areas are matched. The marketing site — including /pricing
   * and every course page — is deliberately absent, so it keeps its fully
   * static rendering and never pays for a middleware invocation.
   */
  matcher: ['/admin/:path*', '/dashboard/:path*', '/checkout/:path*'],
}
