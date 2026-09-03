import { redirect } from 'next/navigation'

import { requireAnyPortalAccount } from '@/lib/portal/session'
import { PORTAL_HOME } from '@/portal-auth.config'

export const dynamic = 'force-dynamic'

/**
 * The role router.
 *
 * Sign-in cannot know where to send someone — the role is a property of the
 * account, and the account is not loaded until the session exists — so every
 * entry point redirects here and this page answers the question once.
 *
 * It renders nothing by design. Every path out of it is a redirect.
 */
export default async function PortalIndexPage() {
  const { role, account } = await requireAnyPortalAccount()

  if (account.mustChangePassword) redirect('/portal/password')

  redirect(PORTAL_HOME[role])
}
