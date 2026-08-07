import NextAuth from 'next-auth'

import { authConfig } from './auth.config'

/**
 * Protects `/admin/*`. Uses the Edge-safe config only — no database driver and
 * no bcrypt reach this bundle. Unauthenticated requests are redirected to
 * `/admin/login` by Auth.js using the `authorized` callback.
 */
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  /*
   * Only admin routes are matched. The public site never runs middleware, so
   * it keeps its fully static rendering.
   */
  matcher: ['/admin/:path*'],
}
