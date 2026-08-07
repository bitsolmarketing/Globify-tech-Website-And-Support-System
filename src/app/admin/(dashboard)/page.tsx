import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Mail,
  Newspaper,
  Ticket,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DataTable, Tbody, Td, Th, Thead, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAllPostsForAdmin } from '@/lib/data/admin-posts'
import { daysRemaining, getCampaign } from '@/lib/data/campaign'
import { getCourses } from '@/lib/data/courses'
import { countLeads, countLeadsByStatus, countLeadsSince, listLeads } from '@/lib/data/leads'
import { countSubscribers } from '@/lib/data/subscribers'
import { formatDate, formatDayMonthLong } from '@/lib/utils'

import { LeadStatusBadge } from './leads/status-badge'

export const metadata: Metadata = { title: 'Dashboard' }

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  href,
}: {
  label: string
  value: string | number
  hint: string
  icon: LucideIcon
  href: string
}) {
  return (
    <Card className="p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <Link href={href} className="block">
        <div className="flex items-start justify-between gap-3">
          <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
            {label}
          </p>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-800">
            <Icon aria-hidden className="size-4" />
          </span>
        </div>

        <p className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-ink-900">
          {value}
        </p>
        <p className="mt-1 font-sans text-xs text-ink-500">{hint}</p>
      </Link>
    </Card>
  )
}

export default async function AdminDashboardPage() {
  const [
    leadsThisWeek,
    totalLeads,
    statusTotals,
    subscribers,
    courses,
    posts,
    campaign,
    recentLeads,
  ] = await Promise.all([
    countLeadsSince(7),
    countLeads(),
    countLeadsByStatus(),
    countSubscribers(),
    getCourses(),
    getAllPostsForAdmin(),
    getCampaign(),
    listLeads({}, 8),
  ])

  const publishedPosts = posts.filter((post) => post.published).length
  const daysLeft = daysRemaining(campaign.deadline)

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description={`${campaign.name} — ${campaign.discountPercent}% off, closing ${formatDayMonthLong(campaign.deadline)}.`}
        actions={
          <Button asChild variant="secondary" size="md">
            <Link href="/admin/campaign">
              Campaign settings
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Tile
          label="Leads this week"
          value={leadsThisWeek}
          hint={`${totalLeads} in total · ${statusTotals.new} still marked new`}
          icon={Users}
          href="/admin/leads"
        />
        <Tile
          label="Newsletter subscribers"
          value={subscribers}
          hint="Currently subscribed"
          icon={Mail}
          href="/admin/subscribers"
        />
        <Tile
          label="Courses"
          value={courses.length}
          hint={`${courses.filter((course) => course.featured).length} featured on the homepage`}
          icon={BookOpen}
          href="/admin/courses"
        />
        <Tile
          label="Blog posts"
          value={posts.length}
          hint={`${publishedPosts} published · ${posts.length - publishedPosts} draft`}
          icon={Newspaper}
          href="/admin/posts"
        />
        <Tile
          label="Days left in campaign"
          value={daysLeft}
          hint={`Ends ${formatDate(campaign.deadline)}`}
          icon={CalendarClock}
          href="/admin/campaign"
        />
        <Tile
          label="Seats remaining"
          value={`${campaign.seatsRemaining} / ${campaign.seatsTotal}`}
          hint={`Coupon ${campaign.couponCode}`}
          icon={Ticket}
          href="/admin/campaign"
        />
      </div>

      {/* --------------------------------------------------------- Recent */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-sans text-lg font-bold text-ink-900">Latest enquiries</h2>
          <Button asChild variant="link" size="sm">
            <Link href="/admin/leads">
              View all leads
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {recentLeads.length === 0 ? (
          <Card className="px-6 py-12 text-center">
            <p className="font-sans text-[0.9375rem] text-ink-500">
              No enquiries yet. Submissions from the public contact form appear here.
            </p>
          </Card>
        ) : (
          <DataTable>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Course</Th>
                <Th className="hidden sm:table-cell">Phone</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Received</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recentLeads.map((lead) => (
                <Tr key={lead.id}>
                  <Td>
                    <Link
                      href={`/admin/leads?search=${encodeURIComponent(lead.email)}`}
                      className="font-semibold text-ink-900 hover:text-brand-800"
                    >
                      {lead.name}
                    </Link>
                    <span className="block truncate font-sans text-xs text-ink-400">
                      {lead.email}
                    </span>
                  </Td>
                  <Td>
                    <Badge variant="neutral" size="md">
                      {lead.courseTitle}
                    </Badge>
                  </Td>
                  <Td className="hidden sm:table-cell">{lead.phone}</Td>
                  <Td>
                    <LeadStatusBadge status={lead.status} />
                  </Td>
                  <Td className="hidden whitespace-nowrap md:table-cell">
                    {formatDate(lead.createdAt)}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </DataTable>
        )}
      </section>
    </>
  )
}
