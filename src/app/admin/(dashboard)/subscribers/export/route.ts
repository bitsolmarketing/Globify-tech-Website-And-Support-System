import { auth } from '@/auth'
import { csvResponse, toCsv } from '@/lib/admin/csv'
import { listSubscribers } from '@/lib/data/subscribers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorised', { status: 401 })
  }

  const subscribers = await listSubscribers()

  const csv = toCsv(
    ['Email', 'Status', 'Source', 'Subscribed'],
    subscribers.map((subscriber) => [
      subscriber.email,
      subscriber.status,
      subscriber.source,
      subscriber.createdAt.toISOString(),
    ]),
  )

  const stamp = new Date().toISOString().slice(0, 10)
  return csvResponse(`globify-subscribers-${stamp}.csv`, csv)
}
