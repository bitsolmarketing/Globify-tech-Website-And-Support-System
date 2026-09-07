import Link from 'next/link'
import { LayoutDashboard, LogOut } from 'lucide-react'

import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { getStudentSession } from '@/lib/student/guard'

import { studentSignOutAction } from './actions'

/**
 * Chrome for everything a student signs in for: /login, /signup, /dashboard and
 * /checkout.
 *
 * Deliberately not the marketing `(site)` layout. That one carries a sticky
 * "Enroll now" bar, a floating WhatsApp button and a campaign countdown — all
 * correct for a visitor deciding whether to buy, all noise for someone who has
 * already bought and is trying to read their own payment status. What is kept
 * is the logo and a way back to the public site, so nobody feels dropped into a
 * different product.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const student = await getStudentSession()

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50/40">
      <a
        href="#account-content"
        className="sr-only-focusable top-4 left-4 z-100 rounded-xl bg-brand-900 px-5 py-3 font-sans text-sm font-semibold text-white shadow-lift"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-hairline bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Globify Tech Institute — back to the main site">
            <Logo />
          </Link>

          {student && (
            <nav aria-label="Account" className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">
                  <LayoutDashboard aria-hidden />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>

              {/* A sign-out that is a real POST, not a link. A GET that ends a
                  session can be fired by any image tag on any other site. */}
              <form action={studentSignOutAction}>
                <Button type="submit" variant="secondary" size="sm">
                  <LogOut aria-hidden />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </form>
            </nav>
          )}

          {!student && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/courses">Browse courses</Link>
            </Button>
          )}
        </div>
      </header>

      <main id="account-content" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-hairline bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center font-sans text-xs text-ink-500 sm:flex-row sm:px-6 sm:text-left">
          <p>&copy; {new Date().getFullYear()} Globify Tech Institute</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="transition-colors hover:text-brand-800">
              Terms
            </Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-brand-800">
              Privacy
            </Link>
            <Link href="/contact" className="transition-colors hover:text-brand-800">
              Help
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
