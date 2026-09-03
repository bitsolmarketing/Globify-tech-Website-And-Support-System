import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { ProvisionAccountForm } from '@/components/admin/provision-account-form'
import { getAuthors } from '@/lib/data/authors'

import { createPortalAccount } from '../actions'

export const metadata: Metadata = { title: 'New portal account' }

export default async function NewPortalUserPage() {
  const authors = await getAuthors()

  return (
    <>
      <AdminPageHeader
        backHref="/admin/portal-users"
        backLabel="Portal accounts"
        title="New portal account"
        description="Instructor accounts are created here. Students can register themselves at /portal/register, so you only need to add one manually when someone cannot."
      />

      <ProvisionAccountForm
        action={createPortalAccount}
        authorOptions={authors.map((author) => ({
          value: author.slug,
          label: author.name,
        }))}
      />
    </>
  )
}
