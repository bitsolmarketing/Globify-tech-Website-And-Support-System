import type { Metadata } from 'next'
import Link from 'next/link'
import { MessageCircleOff, Plus } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import {
  countOptOuts,
  countRecipientsForAll,
  listBroadcasts,
  type RecipientTotals,
} from '@/lib/data/broadcasts'
import { canSendWhatsApp } from '@/lib/whatsapp/send'
import { formatDate } from '@/lib/utils'

import { BroadcastProgress } from './progress-bar'
import { BroadcastStatusBadge } from './status-badge'

export const metadata: Metadata = { title: 'WhatsApp broadcasts' }

const EMPTY: RecipientTotals = {
  queued: 0,
  sending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  total: 0,
}

export default async function AdminBroadcastsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="WhatsApp broadcasts" />
        <EmptyState
          title="No database configured"
          description="Broadcasts and their recipient lists are stored in Postgres. Set DATABASE_URL and run the migration before composing one."
        />
      </>
    )
  }

  const [broadcasts, totalsById, optOuts] = await Promise.all([
    listBroadcasts(),
    countRecipientsForAll(),
    countOptOuts(),
  ])

  const configured = canSendWhatsApp()

  return (
    <>
      <AdminPageHeader
        title="WhatsApp broadcasts"
        description="Announce a new batch, a fee deadline or a results day to everyone at once — with an approved template, and never to anyone who has opted out."
        actions={
          <>
            <Button asChild variant="secondary" size="md">
              <Link href="/admin/broadcasts/opt-outs">
                <MessageCircleOff aria-hidden />
                Opt-outs
                {optOuts > 0 && (
                  <span className="ml-1 rounded-full bg-ink-100 px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-500">
                    {optOuts}
                  </span>
                )}
              </Link>
            </Button>
            <Button asChild variant="primary" size="md">
              <Link href="/admin/broadcasts/new">
                <Plus aria-hidden />
                New broadcast
              </Link>
            </Button>
          </>
        }
      />

      {/* Said once, at the top, rather than discovered at the moment of sending.
          Composing a broadcast against an unconfigured number is wasted work,
          and the send is the worst possible place to find out. */}
      {!configured && (
        <div className="mb-6 rounded-2xl border border-gold-300/70 bg-gold-50 p-5">
          <p className="font-sans text-sm font-bold text-gold-900">
            WhatsApp sending is not configured
          </p>
          <p className="mt-1 text-[0.9375rem] text-gold-800">
            Set <code className="font-mono text-[0.875em]">WHATSAPP_PHONE_ID</code> and{' '}
            <code className="font-mono text-[0.875em]">WHATSAPP_TOKEN</code> in the environment.
            You can still compose and review a broadcast — it simply cannot be sent yet.
          </p>
        </div>
      )}

      {broadcasts.length === 0 ? (
        <EmptyState
          title="No broadcasts yet"
          description="A broadcast goes to people who are not currently in a conversation, so it needs a template Meta has approved. Compose one, review exactly who it will reach, then send."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/admin/broadcasts/new">
                <Plus aria-hidden />
                Compose the first one
              </Link>
            </Button>
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Broadcast</Th>
              <Th className="hidden md:table-cell">Message</Th>
              <Th className="w-56">Progress</Th>
              <Th>Status</Th>
              <Th className="hidden lg:table-cell">Created</Th>
            </Tr>
          </Thead>
          <Tbody>
            {broadcasts.map((broadcast) => {
              const totals = totalsById.get(broadcast.id) ?? EMPTY

              return (
                <Tr key={broadcast.id}>
                  <Td className="font-medium text-ink-900">
                    <Link
                      href={`/admin/broadcasts/${broadcast.id}`}
                      className="transition-colors hover:text-brand-800"
                    >
                      {broadcast.name}
                    </Link>
                    {broadcast.scheduledFor && broadcast.status === 'scheduled' && (
                      <p className="mt-0.5 font-sans text-xs text-ink-500">
                        Sends {formatDate(broadcast.scheduledFor)}
                      </p>
                    )}
                  </Td>

                  <Td className="hidden md:table-cell">
                    <Badge variant="neutral" size="md">
                      {broadcast.kind === 'template'
                        ? (broadcast.templateName ?? 'Template')
                        : 'Free text'}
                    </Badge>
                  </Td>

                  <Td>
                    {totals.total === 0 ? (
                      <span className="font-sans text-xs text-ink-400">No recipients</span>
                    ) : (
                      <BroadcastProgress totals={totals} />
                    )}
                  </Td>

                  <Td>
                    <BroadcastStatusBadge status={broadcast.status} />
                  </Td>

                  <Td className="hidden whitespace-nowrap lg:table-cell">
                    {formatDate(broadcast.createdAt)}
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
