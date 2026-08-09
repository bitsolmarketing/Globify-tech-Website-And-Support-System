import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { channelLabel } from '@/components/admin/channel-badge'
import { DataTable, EmptyState, Tbody, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import { LEAD_CHANNELS, type LeadChannel } from '@/db/schema'
import { leadStatusSchema } from '@/lib/admin/schemas'
import { getCourses } from '@/lib/data/courses'
import {
  countLeadsByChannel,
  countLeadsByStatus,
  listLeads,
  type LeadFilters,
} from '@/lib/data/leads'
import { cn } from '@/lib/utils'

import { LeadFilters as LeadFiltersForm } from './lead-filters'
import { LeadTableRow } from './lead-row'

export const metadata: Metadata = { title: 'Leads' }

type SearchParams = Promise<{
  search?: string
  course?: string
  status?: string
  channel?: string
}>

function isChannel(value: string | undefined): value is LeadChannel {
  return Boolean(value) && (LEAD_CHANNELS as readonly string[]).includes(value as string)
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Leads" />
        <EmptyState
          title="No database configured"
          description="Contact-form submissions are stored in Postgres. Set DATABASE_URL and run the migration to start capturing leads."
        />
      </>
    )
  }

  const params = await searchParams

  const statusResult = leadStatusSchema.safeParse(params.status)
  const filters: LeadFilters = {
    ...(params.search ? { search: params.search } : {}),
    ...(params.course ? { courseSlug: params.course } : {}),
    ...(statusResult.success ? { status: statusResult.data } : {}),
    ...(isChannel(params.channel) ? { channel: params.channel } : {}),
  }

  const [leads, statusTotals, channelTotals, courses] = await Promise.all([
    listLeads(filters),
    countLeadsByStatus(),
    countLeadsByChannel(),
    getCourses(),
  ])

  const courseOptions = [
    ...courses.map((course) => ({ value: course.slug, label: course.title })),
    { value: 'not-sure', label: 'Not sure yet' },
  ]

  /* Export honours the active filters so "download what I am looking at"
     behaves the way an admin expects. */
  const exportQuery = new URLSearchParams()
  if (filters.search) exportQuery.set('search', filters.search)
  if (filters.courseSlug) exportQuery.set('course', filters.courseSlug)
  if (filters.status) exportQuery.set('status', filters.status)
  if (filters.channel) exportQuery.set('channel', filters.channel)

  const hasFilters = exportQuery.size > 0

  /* One tab per channel that has ever produced a lead, plus whichever one is
     selected. Channels with nothing in them are left out rather than shown as
     zero: this strip is for moving between inboxes, and six tabs where four are
     empty makes the two that matter harder to find. The dashboard is where
     "WhatsApp has produced nothing" belongs. */
  const total = Object.values(channelTotals).reduce((sum, n) => sum + n, 0)
  const tabs = [
    { value: '', label: 'All channels', count: total },
    ...LEAD_CHANNELS.filter((c) => channelTotals[c] > 0 || filters.channel === c).map((c) => ({
      value: c,
      label: channelLabel(c),
      count: channelTotals[c],
    })),
  ]

  const tabHref = (value: string) => {
    const params = new URLSearchParams(exportQuery)
    if (value) params.set('channel', value)
    else params.delete('channel')
    return params.size > 0 ? `/admin/leads?${params}` : '/admin/leads'
  }

  return (
    <>
      <AdminPageHeader
        title="Leads"
        description={`${leads.length} shown${hasFilters ? ' (filtered)' : ''} · ${statusTotals.new} new, ${statusTotals.contacted} contacted, ${statusTotals.enrolled} enrolled, ${statusTotals.closed} closed.`}
        actions={
          <Button asChild variant="secondary" size="md">
            <Link href={`/admin/leads/export${exportQuery.size > 0 ? `?${exportQuery}` : ''}`}>
              <Download aria-hidden />
              Export CSV
            </Link>
          </Button>
        }
      />

      {tabs.length > 1 && (
        <nav aria-label="Filter by channel" className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = (filters.channel ?? '') === tab.value
            return (
              <Link
                key={tab.value || 'all'}
                href={tabHref(tab.value)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-sans text-[0.8125rem] font-semibold transition-colors',
                  active
                    ? 'border-brand-900 bg-brand-900 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-800',
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 font-mono text-[0.6875rem]',
                    active ? 'bg-white/15' : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {tab.count}
                </span>
              </Link>
            )
          })}
        </nav>
      )}

      <LeadFiltersForm courseOptions={courseOptions} />

      {leads.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No leads match those filters' : 'No enquiries yet'}
          description={
            hasFilters
              ? 'Try clearing the search, or choosing a different channel or course.'
              : 'Enquiries from the contact form, the AI assistant, WhatsApp, Messenger and Instagram all arrive here.'
          }
          action={
            hasFilters ? (
              <Button asChild variant="secondary" size="md">
                <Link href="/admin/leads">Clear filters</Link>
              </Button>
            ) : (
              <Badge variant="neutral" size="lg">
                Waiting for the first submission
              </Badge>
            )
          }
        />
      ) : (
        <DataTable>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th className="hidden lg:table-cell">Channel</Th>
              <Th className="hidden md:table-cell">Course</Th>
              <Th>Status</Th>
              <Th className="hidden lg:table-cell">Received</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {leads.map((lead) => (
              <LeadTableRow key={lead.id} lead={lead} />
            ))}
          </Tbody>
        </DataTable>
      )}
    </>
  )
}
