import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { DeleteButton } from '@/components/admin/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import { countSubscribers, listSubscribers } from '@/lib/data/subscribers'
import { formatDate } from '@/lib/utils'

import { removeSubscriber, toggleSubscriberStatus } from './actions'
import { SubscriberStatusToggle } from './status-toggle'

export const metadata: Metadata = { title: 'Subscribers' }

export default async function AdminSubscribersPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Newsletter subscribers" />
        <EmptyState
          title="No database configured"
          description="Newsletter sign-ups are stored in Postgres. Set DATABASE_URL and run the migration to start capturing them."
        />
      </>
    )
  }

  const [subscribers, active] = await Promise.all([listSubscribers(), countSubscribers()])

  return (
    <>
      <AdminPageHeader
        title="Newsletter subscribers"
        description={`${active} active of ${subscribers.length} total.`}
        actions={
          <Button asChild variant="secondary" size="md">
            <Link href="/admin/subscribers/export">
              <Download aria-hidden />
              Export CSV
            </Link>
          </Button>
        }
      />

      {subscribers.length === 0 ? (
        <EmptyState
          title="No subscribers yet"
          description="Sign-ups from the footer and blog sidebar forms will appear here."
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Email</Th>
              <Th className="hidden sm:table-cell">Source</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">Subscribed</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {subscribers.map((subscriber) => (
              <Tr key={subscriber.id}>
                <Td className="font-medium text-ink-900">
                  <a href={`mailto:${subscriber.email}`} className="hover:text-brand-800">
                    {subscriber.email}
                  </a>
                </Td>
                <Td className="hidden sm:table-cell">
                  <Badge variant="neutral" size="md">
                    {subscriber.source}
                  </Badge>
                </Td>
                <Td>
                  <SubscriberStatusToggle
                    id={subscriber.id}
                    email={subscriber.email}
                    status={subscriber.status}
                    onToggle={toggleSubscriberStatus}
                  />
                </Td>
                <Td className="hidden whitespace-nowrap md:table-cell">
                  {formatDate(subscriber.createdAt)}
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <DeleteButton
                      label={`Delete ${subscriber.email}`}
                      itemName={subscriber.email}
                      onDelete={removeSubscriber.bind(null, subscriber.id)}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
