import crypto from 'node:crypto'

import type { NextRequest } from 'next/server'

import { auth } from '@/auth'
import { isDatabaseConfigured } from '@/db'
import {
  dueScheduledBroadcasts,
  sendingBroadcasts,
  setBroadcastStatus,
} from '@/lib/data/broadcasts'
import { runBroadcastSlice } from '@/lib/whatsapp/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/* Long enough to be worth a call, short enough to finish inside every host's
   limit. The slice budget below is set under this deliberately, so the runner
   returns on its own terms rather than being killed mid-send. */
export const maxDuration = 60

/**
 * =============================================================================
 *  Broadcast scheduler
 * =============================================================================
 *
 *  Two jobs, both of which exist because a browser tab is not a worker:
 *
 *   1. **Start what is due.** A broadcast scheduled for 9am has to begin at 9am
 *      whether or not anybody is signed in.
 *   2. **Finish what was left.** The admin's browser drives a send while the
 *      progress screen is open. Close the laptop at 400 of 900 and the
 *      remaining 500 sit in the queue until something picks them up. This is
 *      that something.
 *
 *  Point a scheduler at it every few minutes:
 *
 *      curl -H "Authorization: Bearer $CRON_SECRET" \
 *           https://globifytech.com/api/cron/broadcasts
 *
 *  On Vercel, a `vercel.json` cron entry sends exactly that header. Any other
 *  scheduler — a host cron, an uptime pinger — works the same way.
 *
 *  Safe to call as often as you like: it claims work atomically, so two
 *  overlapping runs divide the queue rather than duplicating it.
 * =============================================================================
 */

/**
 * `/api/*` is outside the middleware's `/admin/:path*` matcher, so this route
 * authorises itself. Two ways in, because the two callers are different: a
 * scheduler has a secret and no session, an admin pressing "run now" in the
 * browser has a session and no secret.
 *
 * An unset secret does not mean "let everyone in". It means the scheduler
 * cannot call this at all, and only a signed-in admin can — a broadcast runner
 * open to the internet is a spam cannon pointed at the institute's own
 * WhatsApp number.
 */
async function authorise(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET?.trim()
  const header = request.headers.get('authorization')

  if (secret && header?.startsWith('Bearer ')) {
    const supplied = Buffer.from(header.slice('Bearer '.length))
    const expected = Buffer.from(secret)

    /* Timing-safe, and length-checked first because `timingSafeEqual` throws on
       a length mismatch rather than returning false. */
    if (supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)) {
      return true
    }
  }

  const session = await auth()
  return Boolean(session?.user)
}

export async function GET(request: NextRequest) {
  if (!(await authorise(request))) {
    return Response.json({ ok: false, error: 'Unauthorised' }, { status: 401 })
  }

  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: 'No database configured' }, { status: 503 })
  }

  const started: string[] = []
  const ran: { id: string; sent: number; failed: number; skipped: number; remaining: number }[] = []

  try {
    /* Due first, so a broadcast scheduled for now is picked up by the same run
       that will then start sending it, rather than waiting for the next tick. */
    for (const broadcast of await dueScheduledBroadcasts()) {
      await setBroadcastStatus(broadcast.id, 'sending', {
        startedAt: new Date(),
        lastError: null,
      })
      started.push(broadcast.id)
    }

    /* One slice each, not one broadcast to completion. Two sends in flight
       should progress together — finishing the older one first would leave a
       time-sensitive announcement queued behind a long list. The next tick
       takes the next slice. */
    const inFlight = await sendingBroadcasts()
    const budgetMs = inFlight.length ? Math.floor(45_000 / inFlight.length) : 0

    for (const broadcast of inFlight) {
      const result = await runBroadcastSlice(broadcast.id, { budgetMs })
      ran.push({
        id: broadcast.id,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        remaining: result.remaining,
      })
    }

    return Response.json({ ok: true, started, ran })
  } catch (error) {
    /* A 500 is right here, unlike on the Meta webhook: the caller is a
       scheduler whose whole job is to notice a failure and try again. */
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron] broadcast sweep failed', error)
    return Response.json({ ok: false, error: message, started, ran }, { status: 500 })
  }
}
