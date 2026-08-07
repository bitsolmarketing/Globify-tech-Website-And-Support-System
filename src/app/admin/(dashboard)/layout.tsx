import { redirect } from 'next/navigation'

import { AdminShell } from '@/components/admin/admin-shell'
import { auth, signOut } from '@/auth'

/** Session state is per-request, so the admin is never statically rendered. */
export const dynamic = 'force-dynamic'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  /* Middleware already gates these routes; this is the defence-in-depth check
     that also covers direct server-component rendering. */
  if (!session?.user) redirect('/admin/login')

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/admin/login' })
  }

  return (
    <AdminShell user={session.user} signOutAction={signOutAction}>
      {children}
    </AdminShell>
  )
}
