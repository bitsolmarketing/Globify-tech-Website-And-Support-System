import type { Metadata } from 'next'

import { PortalShell } from '@/components/portal/portal-shell'
import { requireInstructorAccount } from '@/lib/portal/session'
import { portalSignOut } from '@/portal-auth'

/** Session state is per-request, so the portal is never statically rendered. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s · Globify Teach' },
  robots: { index: false, follow: false, nocache: true },
}

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const { account } = await requireInstructorAccount()

  async function signOutAction() {
    'use server'
    await portalSignOut({ redirectTo: '/portal/login' })
  }

  return (
    <PortalShell
      role="instructor"
      user={{ name: account.name, email: account.email }}
      signOutAction={signOutAction}
    >
      {children}
    </PortalShell>
  )
}
