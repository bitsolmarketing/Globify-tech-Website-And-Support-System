import { SimpleForm } from '@/components/admin/simple-form'
import { ChangePasswordForm, type ChangePasswordState } from '@/components/portal/change-password-form'
import { formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { PortalUserRow } from '@/db/schema'
import type { ActionResult } from '@/lib/admin/guard'
import { portalProfileSchema } from '@/lib/portal/schemas'

type ProfileValues = {
  name: string
  phone?: string
  headline?: string
  bio?: string
}

/**
 * The profile screen, shared by both roles.
 *
 * Students and instructors edit exactly the same fields — the only difference
 * is the wording of the headline hint — so this is one component parameterised
 * by role rather than two pages that would drift the first time a field is
 * added.
 *
 * Email and role are shown but not editable. Both decide what the account can
 * reach, and neither belongs to a form the account holder controls; changing
 * them is an admin action.
 */
export function PortalProfilePage({
  account,
  saveAction,
  passwordAction,
  headlineHint,
  bioHint,
}: {
  account: PortalUserRow
  saveAction: (values: ProfileValues) => Promise<ActionResult>
  passwordAction: (prev: ChangePasswordState, formData: FormData) => Promise<ChangePasswordState>
  headlineHint: string
  bioHint: string
}) {
  return (
    <div className="grid gap-8">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
              Signed in as
            </p>
            <p className="mt-1 font-sans text-base font-bold text-ink-900">{account.email}</p>
            <p className="mt-0.5 font-sans text-xs text-ink-500">
              Joined {formatDateTime(account.createdAt)}
              {account.lastLoginAt ? ` · last signed in ${formatDateTime(account.lastLoginAt)}` : ''}
            </p>
          </div>

          <Badge variant={account.role === 'instructor' ? 'gold' : 'brand'} size="md">
            {account.role === 'instructor' ? 'Instructor' : 'Student'}
          </Badge>
        </div>

        <p className="mt-4 border-t border-hairline pt-4 font-sans text-[0.8125rem] text-ink-500">
          Your email address and role are managed by the Globify office. Contact them if either
          needs to change.
        </p>
      </Card>

      <SimpleForm<ProfileValues>
        schema={portalProfileSchema as never}
        defaultValues={{
          name: account.name,
          phone: account.phone ?? '',
          headline: account.headline ?? '',
          bio: account.bio ?? '',
        }}
        fields={[
          { name: 'name', label: 'Full name', required: true },
          { name: 'phone', label: 'Phone', type: 'text', hint: 'e.g. 0300 1234567' },
          { name: 'headline', label: 'Headline', full: true, hint: headlineHint },
          { name: 'bio', label: 'About you', type: 'textarea', rows: 5, hint: bioHint },
        ]}
        sectionTitle="Your details"
        sectionDescription="How your name appears to your instructors and classmates."
        onSubmitAction={saveAction}
        cancelHref={account.role === 'instructor' ? '/instructor' : '/student'}
        submitLabel="Save profile"
        successMessage="Profile updated"
        successDescription="Your details have been saved."
      />

      <ChangePasswordForm
        action={passwordAction}
        title="Password"
        description="Choose a new password for your account. You will stay signed in."
      />
    </div>
  )
}
