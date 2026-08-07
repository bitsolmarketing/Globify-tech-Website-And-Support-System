import type { Metadata } from 'next'

/**
 * Applies to every `/admin` route including the login screen.
 *
 * `robots` here is belt-and-braces alongside `src/app/robots.ts`, which also
 * disallows `/admin`, and `sitemap.ts`, which never emits an admin URL.
 *
 * The authenticated shell lives in `(dashboard)/layout.tsx`; the login page
 * sits in `(auth)/` so it can render without the sidebar and without the
 * session guard that would otherwise redirect it to itself.
 */
export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s | Globify Admin' },
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children
}
