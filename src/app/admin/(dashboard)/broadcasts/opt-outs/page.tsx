import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { isDatabaseConfigured } from '@/db'
import { listOptOuts } from '@/lib/data/broadcasts'
import { displayPhone } from '@/lib/whatsapp/format'
import { formatDate } from '@/lib/utils'

import { addOptOut, deleteOptOut } from '../actions'
import { OptOutForm } from './opt-out-form'

export const metadata: Metadata = { title: 'WhatsApp opt-outs' }

export default async function OptOutsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="WhatsApp opt-outs" backHref="/admin/broadcasts" />
        <EmptyState
          title="No database configured"
          description="Opt-outs are stored in Postgres. Set DATABASE_URL and run the migration first."
        />
      </>
    )
  }

  const optOuts = await listOptOuts()

  return (
    <>
      <AdminPageHeader
        title="WhatsApp opt-outs"
        description="Numbers that are never included in a broadcast. Anyone replying STOP, UNSUBSCRIBE or their Urdu equivalents is added here automatically."
        backHref="/admin/broadcasts"
        backLabel="All broadcasts"
      />

      <OptOutForm onAdd={addOptOut} />

      {optOuts.length === 0 ? (
        <EmptyState
          title="Nobody has opted out"
          description="Replies asking to stop are recorded here the moment they arrive, and checked again at the moment of sending."
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Number</Th>
              <Th className="hidden sm:table-cell">How</Th>
              <Th className="hidden md:table-cell">Reason</Th>
              <Th>Since</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {optOuts.map((optOut) => (
              <Tr key={optOut.id}>
                <Td className="font-mono text-[0.8125rem] whitespace-nowrap text-ink-900">
                  {displayPhone(optOut.phone)}
                </Td>
                <Td className="hidden sm:table-cell">
                  <Badge variant="neutral" size="md">
                    {optOut.source === 'admin' ? 'Added by hand' : 'Replied STOP'}
                  </Badge>
                </Td>
                <Td className="hidden max-w-sm md:table-cell text-[0.8125rem] text-ink-500">
                  {optOut.reason ?? '—'}
                </Td>
                <Td className="whitespace-nowrap">{formatDate(optOut.createdAt)}</Td>
                <Td>
                  <div className="flex justify-end">
                    {/* Removing an opt-out puts someone back on the list, so it
                        gets the same two-step confirmation as a deletion. */}
                    <DeleteButton
                      label={`Remove the opt-out for ${displayPhone(optOut.phone)}`}
                      itemName={`the opt-out for ${displayPhone(optOut.phone)}`}
                      onDelete={deleteOptOut.bind(null, optOut.phone)}
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
