import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCheck, Eye, Pencil } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isDatabaseConfigured } from '@/db'
import { countRecipients, getBroadcast, listRecipients } from '@/lib/data/broadcasts'
import { displayPhone } from '@/lib/whatsapp/format'
import { canSendWhatsApp } from '@/lib/whatsapp/send'
import { formatDate } from '@/lib/utils'

import {
  cancelBroadcast,
  pauseBroadcast,
  rebuildAudience,
  removeBroadcast,
  retryFailed,
  runBroadcast,
  sendTest,
  startBroadcast,
} from '../actions'
import { BroadcastProgress } from '../progress-bar'
import { BroadcastStatusBadge } from '../status-badge'
import { SendPanel } from './send-panel'

export const metadata: Metadata = { title: 'Broadcast' }

/**
 * A row's outcome, in the words the admin needs.
 *
 * `sent` is only the first half of the story — Meta accepting a message is not
 * the same as anyone receiving it — so a row that has been accepted shows what
 * the delivery receipt later said instead of freezing at "sent".
 */
function outcomeOf(recipient: {
  status: string
  deliveryStatus: string | null
}): { label: string; className: string } {
  if (recipient.status === 'sent') {
    switch (recipient.deliveryStatus) {
      case 'read':
        return { label: 'Read', className: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 ring-inset' }
      case 'delivered':
        return { label: 'Delivered', className: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200/70 ring-inset' }
      default:
        return { label: 'Sent', className: 'bg-ink-100 text-ink-700 ring-1 ring-ink-200 ring-inset' }
    }
  }

  switch (recipient.status) {
    case 'failed':
      return { label: 'Failed', className: 'bg-red-50 text-red-700 ring-1 ring-red-200 ring-inset' }
    case 'skipped':
      return { label: 'Skipped', className: 'bg-gold-50 text-gold-800 ring-1 ring-gold-300/70 ring-inset' }
    case 'sending':
      return { label: 'Sending', className: 'bg-ink-100 text-ink-600 ring-1 ring-ink-200 ring-inset' }
    default:
      return { label: 'Queued', className: 'bg-ink-50 text-ink-500 ring-1 ring-ink-200 ring-inset' }
  }
}

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Broadcast" backHref="/admin/broadcasts" />
        <EmptyState
          title="No database configured"
          description="Broadcasts are stored in Postgres. Set DATABASE_URL and run the migration first."
        />
      </>
    )
  }

  const broadcast = await getBroadcast(id)
  if (!broadcast) notFound()

  const [totals, recipients] = await Promise.all([
    countRecipients(id),
    listRecipients(id, { limit: 500 }),
  ])

  const editable = broadcast.status !== 'sending' && broadcast.status !== 'completed'
  const read = recipients.filter((r) => r.deliveryStatus === 'read').length
  const delivered = recipients.filter(
    (r) => r.deliveryStatus === 'delivered' || r.deliveryStatus === 'read',
  ).length

  return (
    <>
      <AdminPageHeader
        title={broadcast.name}
        description={
          broadcast.kind === 'template'
            ? `Template · ${broadcast.templateName} · ${broadcast.templateLanguage}`
            : 'Free text · only reaches people who messaged in the last 24 hours'
        }
        backHref="/admin/broadcasts"
        backLabel="All broadcasts"
        actions={
          <>
            <BroadcastStatusBadge status={broadcast.status} size="lg" />
            {editable && (
              <Button asChild variant="secondary" size="md">
                <Link href={`/admin/broadcasts/${id}/edit`}>
                  <Pencil aria-hidden />
                  Edit
                </Link>
              </Button>
            )}
            {broadcast.status !== 'sending' && (
              <DeleteButton
                label={`Delete ${broadcast.name}`}
                itemName={broadcast.name}
                onDelete={removeBroadcast.bind(null, id)}
                redirectTo="/admin/broadcasts"
              />
            )}
          </>
        }
      />

      {broadcast.lastError && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-sans text-sm font-bold text-red-800">The send stopped</p>
          <p className="mt-1 font-sans text-[0.9375rem] text-red-700">{broadcast.lastError}</p>
        </div>
      )}

      <div className="grid gap-6">
        {/* -------------------------------------------------------- Progress */}
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-sans text-base font-bold text-ink-900">Progress</h2>
            {totals.sent > 0 && (
              <p className="inline-flex items-center gap-1.5 font-sans text-[0.8125rem] text-ink-500">
                <CheckCheck aria-hidden className="size-4 text-brand-600" />
                {delivered} delivered
                <Eye aria-hidden className="ml-2 size-4 text-brand-600" />
                {read} read
              </p>
            )}
          </div>

          {totals.total === 0 ? (
            <p className="font-sans text-[0.9375rem] text-ink-500">
              No recipients yet. Rebuild the audience to fill the list from the saved filters.
            </p>
          ) : (
            <BroadcastProgress totals={totals} />
          )}

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-hairline pt-5 sm:grid-cols-4">
            <Stat label="Recipients" value={totals.total} />
            <Stat label="Sent" value={totals.sent} />
            <Stat label="Skipped" value={totals.skipped} />
            <Stat label="Failed" value={totals.failed} />
          </dl>

          {broadcast.scheduledFor && broadcast.status === 'scheduled' && (
            <p className="mt-4 font-sans text-[0.8125rem] text-ink-500">
              Scheduled to start on {formatDate(broadcast.scheduledFor)}. The scheduler checks
              periodically, so it may begin shortly after.
            </p>
          )}
        </Card>

        {/* -------------------------------------------------------- Controls */}
        <SendPanel
          id={id}
          status={broadcast.status}
          queued={totals.queued + totals.sending}
          failed={totals.failed}
          canSend={canSendWhatsApp()}
          actions={{
            start: startBroadcast,
            pause: pauseBroadcast,
            cancel: cancelBroadcast,
            run: runBroadcast,
            retryFailed,
            rebuildAudience,
            sendTest,
          }}
        />

        {/* ------------------------------------------------------ Recipients */}
        {recipients.length === 0 ? (
          <EmptyState
            title="No recipients"
            description="Rebuild the audience to fill this list from the filters saved with the broadcast."
          />
        ) : (
          <div>
            <h2 className="mb-3 font-sans text-base font-bold text-ink-900">
              Recipients
              <span className="ml-2 font-normal text-ink-500">
                {recipients.length < totals.total
                  ? `showing ${recipients.length} of ${totals.total}`
                  : totals.total}
              </span>
            </h2>

            <DataTable>
              <Thead>
                <Tr>
                  <Th>Number</Th>
                  <Th className="hidden sm:table-cell">Name</Th>
                  <Th>Outcome</Th>
                  <Th className="hidden lg:table-cell">Sent</Th>
                  <Th>Detail</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recipients.map((recipient) => {
                  const outcome = outcomeOf(recipient)

                  return (
                    <Tr key={recipient.id}>
                      <Td className="font-mono text-[0.8125rem] whitespace-nowrap text-ink-900">
                        {displayPhone(recipient.phone)}
                      </Td>
                      <Td className="hidden sm:table-cell">{recipient.name ?? '—'}</Td>
                      <Td>
                        <Badge size="md" className={outcome.className}>
                          {outcome.label}
                        </Badge>
                      </Td>
                      <Td className="hidden whitespace-nowrap lg:table-cell">
                        {recipient.sentAt ? formatDate(recipient.sentAt) : '—'}
                      </Td>
                      <Td className="max-w-md text-[0.8125rem] text-ink-500">
                        {recipient.error ?? '—'}
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </DataTable>
          </div>
        )}
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-sans text-2xl font-extrabold tracking-tight text-ink-900">
        {value}
      </dd>
    </div>
  )
}
