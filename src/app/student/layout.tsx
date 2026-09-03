import type { Metadata } from 'next'

import { PortalShell } from '@/components/portal/portal-shell'
import { requireStudentAccount } from '@/lib/portal/session'
import { portalSignOut } from '@/portal-auth'

/** Session state is per-request, so the portal is never statically rendered. */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s · Globify Learn' },
  robots: { index: false, follow: false, nocache: true },
}

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  /* Middleware gates the path and this re-reads the account row — it is what
     makes a suspension or a forced password reset take effect on the next page
     view rather than at the next sign-in twelve hours later. */
  const { account } = await requireStudentAccount()

  async function signOutAction() {
    'use server'
    await portalSignOut({ redirectTo: '/portal/login' })
  }

  return (
    <PortalShell
      role="student"
      user={{ name: account.name, email: account.email }}
      signOutAction={signOutAction}
    >
      {children}
    </PortalShell>
  )
}
