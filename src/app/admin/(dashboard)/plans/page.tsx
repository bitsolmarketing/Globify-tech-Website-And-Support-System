import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, Pencil, Plus, Star } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { DataTable, EmptyState, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import { listPlanRows } from '@/lib/data/plans'
import { intervalAdjective } from '@/lib/plans'
import { formatPKR } from '@/lib/utils'

import { deletePlan } from './actions'

export const metadata: Metadata = { title: 'Plans' }

/** The seeded placeholder prices, so the warning below knows when it applies. */
const PLACEHOLDER_PRICES = new Set([6000, 45000])

export default async function AdminPlansPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Plans" />
        <EmptyState
          title="No database configured"
          description="Set DATABASE_URL, run the migration and seed before editing plans."
        />
      </>
    )
  }

  const rows = await listPlanRows()
  const live = rows.filter((row) => row.active)
  const unpriced = live.filter((row) => PLACEHOLDER_PRICES.has(row.price))

  return (
    <>
      <AdminPageHeader
        title="Plans"
        description={`${rows.length} plans · ${live.length} on sale at /pricing.`}
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/plans/new">
              <Plus aria-hidden />
              New plan
            </Link>
          </Button>
        }
      />

      {/*
       * Nobody has told the codebase what an all-access plan should cost, so
       * the seed shipped defensible placeholders. This says so out loud for as
       * long as one is still live — a price rendering to the public is not the
       * place for a value that was never decided.
       */}
      {unpriced.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-gold-50 px-4 py-3.5 font-sans text-[0.875rem] text-gold-900 ring-1 ring-gold-200 ring-inset">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {unpriced.length === 1 ? 'One plan is' : `${unpriced.length} plans are`} still at the
              seeded placeholder price
            </p>
            <p className="mt-1 leading-relaxed">
              These are on sale at /pricing right now. Set the real figures, or untick “On sale”
              until the institute has decided them.
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Run `npm run db:seed` to import the starter plans, or add one now."
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Plan</Th>
              <Th className="hidden sm:table-cell">Billing</Th>
              <Th className="text-right">Price</Th>
              <Th className="hidden md:table-cell">Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link
                    href={`/admin/plans/${row.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-800"
                  >
                    {row.name}
                  </Link>
                  <span className="mt-0.5 block max-w-xl font-sans text-xs text-ink-400">
                    {row.tagline}
                  </span>
                </Td>

                <Td className="hidden sm:table-cell text-ink-600">
                  {intervalAdjective(row.interval)}
                </Td>

                <Td className="text-right whitespace-nowrap">
                  <span className="font-semibold text-ink-900">{formatPKR(row.price)}</span>
                  {row.compareAtPrice && (
                    <span className="ml-2 text-xs text-ink-400 line-through">
                      {formatPKR(row.compareAtPrice)}
                    </span>
                  )}
                </Td>

                <Td className="hidden md:table-cell">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.active ? (
                      <Badge variant="success" size="md">
                        On sale
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="md">
                        Hidden
                      </Badge>
                    )}
                    {row.featured && (
                      <Badge variant="gold" size="md">
                        <Star aria-hidden />
                        Featured
                      </Badge>
                    )}
                  </div>
                </Td>

                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Edit plan">
                      <Link href={`/admin/plans/${row.id}`}>
                        <Pencil aria-hidden />
                      </Link>
                    </Button>
                    <DeleteButton
                      label={`Delete plan: ${row.name}`}
                      itemName="plan"
                      onDelete={deletePlan.bind(null, row.id)}
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
