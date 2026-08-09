import { auth } from '@/auth'
import { LEAD_CHANNELS, type LeadChannel } from '@/db/schema'
import { csvResponse, toCsv } from '@/lib/admin/csv'
import { leadStatusSchema } from '@/lib/admin/schemas'
import { listLeads, type LeadFilters } from '@/lib/data/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * CSV export for the leads table.
 *
 * A route handler rather than a server action, because a download needs real
 * response headers. Middleware covers `/admin/*`, and the session is checked
 * again here so the endpoint cannot be scraped directly.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorised', { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusResult = leadStatusSchema.safeParse(searchParams.get('status'))

  const channel = searchParams.get('channel')

  const filters: LeadFilters = {
    ...(searchParams.get('search') ? { search: searchParams.get('search')! } : {}),
    ...(searchParams.get('course') ? { courseSlug: searchParams.get('course')! } : {}),
    ...(statusResult.success ? { status: statusResult.data } : {}),
    ...((LEAD_CHANNELS as readonly string[]).includes(channel ?? '')
      ? { channel: channel as LeadChannel }
      : {}),
  }

  const leads = await listLeads(filters, 10_000)

  /* Empty cells rather than the string "null": these files are opened in Excel
     and pasted into mail merges, and a chat lead genuinely has no email. */
  const csv = toCsv(
    [
      'Name',
      'Phone',
      'Email',
      'Channel',
      'Handle',
      'Course',
      'Course slug',
      'Message',
      'Status',
      'Source',
      'Campaign',
      'Received',
    ],
    leads.map((lead) => [
      lead.name ?? '',
      lead.phone ?? '',
      lead.email ?? '',
      lead.channel,
      lead.handle ?? '',
      lead.courseTitle,
      lead.courseSlug,
      lead.message ?? '',
      lead.status,
      lead.source,
      lead.campaign ?? '',
      lead.createdAt.toISOString(),
    ]),
  )

  const stamp = new Date().toISOString().slice(0, 10)
  return csvResponse(`globify-leads-${stamp}.csv`, csv)
}
