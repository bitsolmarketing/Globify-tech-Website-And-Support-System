import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, EmptyState, Tbody, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isDatabaseConfigured } from '@/db'
import { leadStatusSchema } from '@/lib/admin/schemas'
import { getCourses } from '@/lib/data/courses'
import { countLeadsByStatus, listLeads, type LeadFilters } from '@/lib/data/leads'

import { LeadFilters as LeadFiltersForm } from './lead-filters'
import { LeadTableRow } from './lead-row'

export const metadata: Metadata = { title: 'Leads' }

type SearchParams = Promise<{ search?: string; course?: string; status?: string }>

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
  }

  const [leads, statusTotals, courses] = await Promise.all([
    listLeads(filters),
    countLeadsByStatus(),
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

  const hasFilters = exportQuery.size > 0

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

      <LeadFiltersForm courseOptions={courseOptions} />

      {leads.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No leads match those filters' : 'No enquiries yet'}
          description={
            hasFilters
              ? 'Try clearing the search or choosing a different course.'
              : 'Submissions from the public contact form will appear here as soon as they arrive.'
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
