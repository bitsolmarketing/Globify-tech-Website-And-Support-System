import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import type { ChangePasswordState } from '@/components/portal/change-password-form'
import { PortalProfilePage } from '@/components/portal/profile-page'
import type { ActionResult } from '@/lib/admin/guard'
import { setPortalPassword, updatePortalProfile, verifyPortalPassword } from '@/lib/data/portal'
import { runPortalAction } from '@/lib/portal/guard'
import { changePasswordSchema, portalProfileSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Profile' }

export default async function InstructorProfilePage() {
  const { account } = await requireInstructorAccount()

  async function save(values: {
    name: string
    phone?: string
    headline?: string
    bio?: string
  }): Promise<ActionResult> {
    'use server'

    return runPortalAction('instructor', async (user) => {
      const parsed = portalProfileSchema.safeParse(values)
      if (!parsed.success) throw new Error(parsed.error.issues[0].message)

      await updatePortalProfile(user.id, parsed.data)
      revalidatePath('/instructor/profile')
    })
  }

  async function changePassword(
    _prev: ChangePasswordState,
    formData: FormData,
  ): Promise<ChangePasswordState> {
    'use server'

    const current = await requireInstructorAccount()

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
    if (!ok) return { error: 'That is not your current password.', field: 'currentPassword' }

    await setPortalPassword(current.id, parsed.data.password, false)
    return { done: true }
  }

  return (
    <>
      <PageHeader title="Profile" description="Your details and your password." />

      <PortalProfilePage
        account={account}
        saveAction={save}
        passwordAction={changePassword}
        headlineHint="Shown to your students — e.g. 'Senior Full Stack Engineer, 9 years'."
        bioHint="Optional. A short background your students can read."
      />
    </>
  )
}
