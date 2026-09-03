import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  ChangePasswordForm,
  type ChangePasswordState,
} from '@/components/portal/change-password-form'
import { setPortalPassword, verifyPortalPassword } from '@/lib/data/portal'
import { changePasswordSchema } from '@/lib/portal/schemas'
import { requireAnyPortalAccount } from '@/lib/portal/session'
import { PORTAL_HOME } from '@/portal-auth.config'

export const metadata: Metadata = {
  title: 'Choose a password',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

/**
 * The forced password change after an admin provisions an account.
 *
 * Deliberately outside `PortalShell`: an account still carrying a temporary
 * password has nowhere else it may go, and rendering a navigation full of
 * links that all redirect back here would be a maze rather than a step.
 */
export default async function PortalPasswordPage() {
  const { role, account } = await requireAnyPortalAccount()

  async function change(
    _prev: ChangePasswordState,
    formData: FormData,
  ): Promise<ChangePasswordState> {
    'use server'

    /* Re-read the session inside the action. The one closed over above was
       captured when the page rendered, and an action is a POST that can arrive
       long afterwards — from a tab left open overnight, or from a signed-out
       browser replaying the endpoint. */
    const current = await requireAnyPortalAccount()

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get('currentPassword'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    })

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { error: issue.message, field: String(issue.path[0] ?? '') }
    }

    const ok = await verifyPortalPassword(current.id, parsed.data.currentPassword)
    if (!ok) {
      return { error: 'That is not your current password.', field: 'currentPassword' }
    }

    if (parsed.data.currentPassword === parsed.data.password) {
      return { error: 'Choose a password you have not used here before.', field: 'password' }
    }

    await setPortalPassword(current.id, parsed.data.password, false)

    redirect(PORTAL_HOME[current.role])
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-2xl place-items-center px-4 py-12">
      <div className="w-full">
        <p className="mb-6 text-center font-sans text-lg font-extrabold tracking-tight text-ink-900">
          Globify <span className="text-brand-700">Portal</span>
        </p>

        <ChangePasswordForm
          action={change}
          title={
            account.mustChangePassword ? 'Choose your own password' : 'Change your password'
          }
          description={
            account.mustChangePassword
              ? `You are signed in as ${account.email} with a temporary password. Pick your own to carry on to your ${role === 'student' ? 'courses' : 'batches'}.`
              : 'Pick a new password for your account.'
          }
          submitLabel={account.mustChangePassword ? 'Save and continue' : 'Update password'}
        />
      </div>
    </div>
  )
}
