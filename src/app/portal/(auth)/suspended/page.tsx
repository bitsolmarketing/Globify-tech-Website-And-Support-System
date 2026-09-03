import type { Metadata } from 'next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { portalSignOut } from '@/portal-auth'

export const metadata: Metadata = {
  title: 'Account paused',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

/**
 * Where a suspended account lands.
 *
 * The sign-in form never says an account is suspended — that would confirm the
 * address exists to anyone guessing. Once someone has proved they hold the
 * password, though, withholding the reason only sends them to support to ask a
 * question the screen could have answered.
 */
export default function PortalSuspendedPage() {
  async function signOutAction() {
    'use server'
    await portalSignOut({ redirectTo: '/portal/login' })
  }

  return (
    <Card className="mt-6 bg-white p-7 shadow-lift sm:p-9">
      <h1 className="font-sans text-xl font-extrabold tracking-tight text-ink-900">
        Your account is paused
      </h1>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-500">
        Access to the learning portal has been put on hold. This is usually an enrolment or fees
        matter rather than anything to do with your work, and the office can lift it.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="primary" size="md">
          <a href="/contact">Contact the office</a>
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="md">
            Sign out
          </Button>
        </form>
      </div>
    </Card>
  )
}
