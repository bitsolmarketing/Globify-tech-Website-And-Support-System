import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdminPageHeader } from '@/components/admin/page-header'
import { ResetPasswordButton } from '@/components/admin/reset-password-button'
import { SimpleForm } from '@/components/admin/simple-form'
import { ActionButton } from '@/components/portal/action-button'
import { EnrollmentBadge, formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { PortalRole } from '@/db/schema'
import type { ActionResult } from '@/lib/admin/guard'
import { getAuthors } from '@/lib/data/authors'
import { getPortalUser, listBatches } from '@/lib/data/portal'
import { listStudentBatches } from '@/lib/data/student'
import { portalUserSchema } from '@/lib/portal/schemas'

import {
  resetPortalPassword,
  setPortalAccountStatus,
  updatePortalAccountAction,
} from '../actions'

export const metadata: Metadata = { title: 'Portal account' }

type AccountValues = {
  name: string
  email: string
  role: PortalRole
  status: 'active' | 'suspended'
  authorSlug?: string
  phone?: string
  headline?: string
}

export default async function AdminPortalUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getPortalUser(id)
  if (!user) notFound()

  const authors = await getAuthors()

  /* What this account is actually attached to — the thing you want to know
     before suspending it or changing its role. */
  const enrolments = user.role === 'student' ? await listStudentBatches(user.id) : []
  const teaching =
    user.role === 'instructor' ? await listBatches({ instructorId: user.id }) : []

  async function save(values: AccountValues): Promise<ActionResult> {
    'use server'
    return updatePortalAccountAction(id, portalUserSchema.parse(values))
  }

  return (
    <>
      <AdminPageHeader
        backHref="/admin/portal-users"
        backLabel="Portal accounts"
        title={user.name}
        description={`${user.email} · created ${formatDateTime(user.createdAt)}${
          user.lastLoginAt ? ` · last signed in ${formatDateTime(user.lastLoginAt)}` : ' · never signed in'
        }`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={user.role === 'instructor' ? 'gold' : 'brand'} size="md">
          {user.role === 'instructor' ? 'Instructor' : 'Student'}
        </Badge>
        {user.status === 'active' ? (
          <Badge variant="success" size="md">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" size="md">
            Suspended
          </Badge>
        )}
        {user.mustChangePassword && (
          <Badge variant="gold" size="md">
            Temporary password not yet changed
          </Badge>
        )}
      </div>

      <div className="grid gap-8">
        <SimpleForm<AccountValues>
          schema={portalUserSchema as never}
          defaultValues={{
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            authorSlug: user.authorSlug ?? '',
            phone: user.phone ?? '',
            headline: user.headline ?? '',
          }}
          fields={[
            { name: 'name', label: 'Full name', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            {
              name: 'role',
              label: 'Role',
              type: 'select',
              required: true,
              hint: 'Changing this moves them to the other dashboard entirely.',
              options: [
                { value: 'student', label: 'Student' },
                { value: 'instructor', label: 'Instructor' },
              ],
            },
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              required: true,
              hint: 'A suspended account is signed out at its next page view.',
              options: [
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
              ],
            },
            {
              name: 'authorSlug',
              label: 'Public profile',
              type: 'select',
              full: true,
              hint: 'Instructors only — links to the author shown on course and blog pages.',
              options: [
                { value: '', label: 'Not linked' },
                ...authors.map((author) => ({ value: author.slug, label: author.name })),
              ],
            },
          ]}
          sectionTitle="Account"
          sectionDescription="Email, role and status are administrative — the account holder cannot change them."
          onSubmitAction={save}
          cancelHref="/admin/portal-users"
          submitLabel="Save account"
          successMessage="Account updated"
          successDescription="Changes take effect at their next page view."
        />

        {/* ---------------------------------------------------------- Access */}
        <Card className="p-6">
          <h2 className="font-sans text-base font-bold text-ink-900">Access</h2>
          <p className="mt-1 text-[0.9375rem] text-ink-500">
            Passwords are stored as bcrypt hashes and cannot be read back. Resetting issues a new
            temporary one, shown once.
          </p>

          <div className="mt-5 flex flex-wrap items-start gap-3">
            <ResetPasswordButton
              action={async () => {
                'use server'
                return resetPortalPassword(id)
              }}
            />

            <ActionButton
              action={async () => {
                'use server'
                const result = await setPortalAccountStatus(
                  id,
                  user!.status === 'active' ? 'suspended' : 'active',
                )
                return result.ok ? { ok: true } : { ok: false, error: result.error }
              }}
              confirmLabel={
                user.status === 'active' ? 'Confirm suspension' : 'Confirm reactivation'
              }
              variant="secondary"
              size="md"
              successMessage={user.status === 'active' ? 'Account suspended' : 'Account reactivated'}
            >
              {user.status === 'active' ? 'Suspend account' : 'Reactivate account'}
            </ActionButton>
          </div>
        </Card>

        {/* ------------------------------------------------------ Attachments */}
        {user.role === 'student' && (
          <Card className="p-6">
            <h2 className="font-sans text-base font-bold text-ink-900">
              Enrolments ({enrolments.length})
            </h2>

            {enrolments.length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-ink-500">
                Not enrolled on any batch. Enrol them from the batch page.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {enrolments.map((row) => (
                  <li
                    key={row.batch.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-ink-900">
                        {row.batch.courseTitle}
                      </p>
                      <p className="font-sans text-xs text-ink-500">
                        {row.batch.name} · {row.progress}% complete · {row.attendance.rate}%
                        attendance
                      </p>
                    </div>
                    <EnrollmentBadge status={row.enrollment.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {user.role === 'instructor' && (
          <Card className="p-6">
            <h2 className="font-sans text-base font-bold text-ink-900">
              Teaching ({teaching.length})
            </h2>

            {teaching.length === 0 ? (
              <p className="mt-2 text-[0.9375rem] text-ink-500">
                Not assigned to any batch. Assign them when creating or editing a batch.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {teaching.map((batch) => (
                  <li
                    key={batch.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-ink-900">
                        {batch.courseTitle}
                      </p>
                      <p className="font-sans text-xs text-ink-500">
                        {batch.name} · {batch.studentCount} student
                        {batch.studentCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {batch.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  )
}
