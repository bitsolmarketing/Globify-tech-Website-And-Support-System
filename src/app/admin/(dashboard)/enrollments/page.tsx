import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { isDatabaseConfigured } from '@/db'
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from '@/db/schema'
import {
  countEnrollmentsByStatus,
  listEnrollments,
  listPayments,
  type EnrollmentFilters,
} from '@/lib/data/enrollments'
import { cn } from '@/lib/utils'

import { EnrollmentTableRow } from './enrollment-row'
import { PaymentReviewCard } from './payment-review'

export const metadata: Metadata = { title: 'Enrollments' }

type SearchParams = Promise<{ status?: string }>

function isStatus(value: string | undefined): value is EnrollmentStatus {
  return Boolean(value) && (ENROLLMENT_STATUSES as readonly string[]).includes(value as string)
}

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Enrollments" />
        <EmptyState
          title="No database configured"
          description="Enrollments and payments are stored in Postgres. Set DATABASE_URL and run the migration to start accepting them."
        />
      </>
    )
  }

  const params = await searchParams
  const filters: EnrollmentFilters = isStatus(params.status) ? { status: params.status } : {}

  const [queue, enrollments, totals] = await Promise.all([
    /* The review queue is the reason this screen exists, so it is loaded
       unfiltered — a status filter applies to the table below it, not to the
       claims waiting on a decision. */
    listPayments('submitted'),
    listEnrollments(filters),
    countEnrollmentsByStatus(),
  ])

  const total = Object.values(totals).reduce((sum, count) => sum + count, 0)

  return (
    <>
      <AdminPageHeader
        title="Enrollments"
        description={`${total} enrollments · ${totals.active ?? 0} active · ${queue.length} payments waiting on you.`}
      />

      {/* ------------------------------------------------------ review queue */}
      <section aria-labelledby="queue-heading" className="mb-10">
        <h2
          id="queue-heading"
          className="mb-4 flex items-center gap-2 font-sans text-lg font-extrabold tracking-tight text-ink-900"
        >
          Payments to review
          {queue.length > 0 && (
            <Badge variant="gold" size="sm">
              {queue.length}
            </Badge>
          )}
        </h2>

        {queue.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-4 ring-1 ring-emerald-200 ring-inset">
            <CheckCircle2 aria-hidden className="size-5 shrink-0 text-emerald-700" />
            <p className="font-sans text-[0.9375rem] text-emerald-900">
              Nothing waiting. Every payment claim has been reviewed.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {queue.map((claim) => (
              <PaymentReviewCard key={claim.payment.id} claim={claim} />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- all records */}
      <section aria-labelledby="all-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="all-heading"
            className="font-sans text-lg font-extrabold tracking-tight text-ink-900"
          >
            All enrollments
          </h2>

          <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
            <FilterChip href="/admin/enrollments" label="All" count={total} active={!params.status} />
            {ENROLLMENT_STATUSES.map((status) => (
              <FilterChip
                key={status}
                href={`/admin/enrollments?status=${status}`}
                label={status}
                count={totals[status] ?? 0}
                active={params.status === status}
              />
            ))}
          </nav>
        </div>

        {enrollments.length === 0 ? (
          <EmptyState
            title={params.status ? `No ${params.status} enrollments` : 'No enrollments yet'}
            description={
              params.status
                ? 'Try a different status filter.'
                : 'When someone enrols from a course page or the pricing page, they will appear here.'
            }
          />
        ) : (
          <DataTable>
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th>Course</Th>
                <Th className="hidden md:table-cell">Fee</Th>
                <Th className="hidden lg:table-cell">Payment</Th>
                <Th>Status</Th>
                <Th className="hidden lg:table-cell">Started</Th>
              </Tr>
            </Thead>
            <Tbody>
              {enrollments.map((row) => (
                <EnrollmentTableRow key={row.enrollment.id} row={row} />
              ))}
            </Tbody>
          </DataTable>
        )}
      </section>
    </>
  )
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-xs font-semibold capitalize transition-colors',
        active
          ? 'bg-brand-900 text-white'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200 hover:text-ink-900',
      )}
    >
      {label}
      <span className={cn('tabular-nums', active ? 'text-white/60' : 'text-ink-400')}>{count}</span>
    </Link>
  )
}
