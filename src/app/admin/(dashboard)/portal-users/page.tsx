import type { Metadata } from 'next'
import Link from 'next/link'
import { Pencil, Plus } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { formatDateTime } from '@/components/portal/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import { listPortalUsers } from '@/lib/data/portal'

export const metadata: Metadata = { title: 'Portal accounts' }

export default async function AdminPortalUsersPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Portal accounts" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed before managing portal accounts."
        />
      </>
    )
  }

  const users = await listPortalUsers()
  const students = users.filter((user) => user.role === 'student')
  const instructors = users.filter((user) => user.role === 'instructor')

  return (
    <>
      <AdminPageHeader
        title="Portal accounts"
        description={`${students.length} student${students.length === 1 ? '' : 's'} and ${instructors.length} instructor${
          instructors.length === 1 ? '' : 's'
        }. These are separate from admin logins — a portal account can never reach /admin.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/portal-users/new">
              <Plus aria-hidden />
              New account
            </Link>
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          title="No portal accounts yet"
          description="Create an instructor account here. Students can also register themselves at /portal/register."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/admin/portal-users/new">Create the first account</Link>
            </Button>
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th className="hidden md:table-cell">Phone</Th>
              <Th>Status</Th>
              <Th className="hidden lg:table-cell">Last signed in</Th>
              <Th className="text-right">Edit</Th>
            </Tr>
          </Thead>
          <Tbody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <Link
                    href={`/admin/portal-users/${user.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {user.name}
                  </Link>
                  <span className="block truncate font-sans text-xs text-ink-400">
                    {user.email}
                  </span>
                </Td>

                <Td>
                  <Badge variant={user.role === 'instructor' ? 'gold' : 'brand'} size="sm">
                    {user.role === 'instructor' ? 'Instructor' : 'Student'}
                  </Badge>
                </Td>

                <Td className="hidden md:table-cell">{user.phone ?? '—'}</Td>

                <Td>
                  {user.status === 'active' ? (
                    <Badge variant="success" size="sm">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">
                      Suspended
                    </Badge>
                  )}
                  {user.mustChangePassword && (
                    <span className="mt-1 block font-sans text-xs text-amber-700">
                      Temporary password
                    </span>
                  )}
                </Td>

                <Td className="hidden lg:table-cell whitespace-nowrap font-sans text-xs text-ink-500">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
                </Td>

                <Td className="text-right">
                  <Button asChild variant="ghost" size="icon-sm" aria-label={`Edit ${user.name}`}>
                    <Link href={`/admin/portal-users/${user.id}`}>
                      <Pencil aria-hidden />
                    </Link>
                  </Button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
