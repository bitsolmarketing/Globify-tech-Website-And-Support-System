import * as React from 'react'
import Link from 'next/link'

/**
 * The signed-out portal screens — sign in, register, suspended.
 *
 * Same dark treatment as the admin login so the two read as the same building,
 * and deliberately outside `PortalShell`: there is no role yet, so there is no
 * navigation to show.
 */
export default function PortalAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-brand-950 px-4 py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute inset-0 bg-grid-light opacity-40" />
        <div className="absolute -top-32 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-gold-500/12 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="block text-center font-sans text-lg font-extrabold tracking-tight text-white"
        >
          Globify <span className="text-gold-400">Learn</span>
        </Link>

        {children}
      </div>
    </div>
  )
}
