import 'server-only'

import type { BroadcastRow, BroadcastStatus } from '@/db/schema'
import {
  claimRecipients,
  countRecipients,
  getBroadcast,
  lastInboundAt,
  markRecipientFailed,
  markRecipientSent,
  markRecipientSkipped,
  optedOutPhones,
  requeueStaleRecipients,
  setBroadcastStatus,
  type ClaimedRecipient,
} from '@/lib/data/broadcasts'

import { applyMergeFields } from './format'
import { canSendWhatsApp, sendText, sendTemplate } from './send'

/**
 * ---------------------------------------------------------------------------
 * The send loop
 * ---------------------------------------------------------------------------
 *
 * A broadcast is not sent by one function call. It is sent by many short
 * slices, each of which takes whatever it can from the queue, sends it, and
 * returns — leaving the rest for the next slice.
 *
 * That shape is forced by where this runs. A serverless request is killed at a
 * hard timeout, so a thousand-recipient send cannot be one invocation; and the
 * throttle Meta requires means a thousand recipients takes minutes of mostly
 * waiting. Anything that tried to hold a request open for that would be killed
 * halfway with no record of where it got to.
 *
 * So the queue is the state, and slices are interchangeable workers. Three
 * things drive them, and any combination is safe:
 *
 *   · the admin's browser, polling while the progress screen is open;
 *   · the cron route, which finishes what a closed tab left behind;
 *   · a manual "resume", which is the same thing on demand.
 *
 * `claimRecipients` is what makes that safe — see the note on
 * `BROADCAST_RECIPIENT_STATUSES` in `schema.ts`.
 */

/** Claimed per round trip. Small enough that a killed worker strands little. */
const BATCH_SIZE = 10

/**
 * Cloud API's default throughput is 80 messages/second, and exceeding it earns
 * 130429 rather than a queue. Eight is deliberately far below that: the ceiling
 * is shared with the bot answering live conversations, and a marketing send is
 * never the thing that should push a student's reply into a retry.
 */
const MESSAGES_PER_SECOND = Number(process.env.WHATSAPP_BROADCAST_RATE?.trim() || '8')

/**
 * Three tries, then the row is left `failed` for the admin to look at.
 *
 * Unbounded retries on a genuinely undeliverable number are worse than a
 * visible failure: the queue never drains, the broadcast never completes, and
 * the sweep keeps paying for the same rejection every few minutes.
 */
const MAX_ATTEMPTS = 3

/** How long one slice may run before returning. Well under any host's limit. */
const DEFAULT_BUDGET_MS = 20_000

/** Free text is only deliverable within this of the recipient's own message. */
const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

export type SliceResult = {
  sent: number
  failed: number
  skipped: number
  /** Still queued when the slice gave up its budget. */
  remaining: number
  /** True when there is nothing left for another slice to do. */
  done: boolean
  status: BroadcastStatus
  error?: string
}

export async function runBroadcastSlice(
  broadcastId: string,
  options: { budgetMs?: number } = {},
): Promise<SliceResult> {
  const deadline = Date.now() + (options.budgetMs ?? DEFAULT_BUDGET_MS)
  const result = { sent: 0, failed: 0, skipped: 0 }

  const broadcast = await getBroadcast(broadcastId)
  if (!broadcast) {
    return { ...result, remaining: 0, done: true, status: 'cancelled', error: 'Not found.' }
  }

  if (broadcast.status !== 'sending') {
    /* Paused, cancelled or already finished. Not an error — a slice arriving
       after the admin pressed pause is exactly what should happen. */
    const totals = await countRecipients(broadcastId)
    return { ...result, remaining: totals.queued, done: true, status: broadcast.status }
  }

  /* A configuration failure is not a per-recipient failure. Marking four
     hundred people `failed` because a token expired would destroy the record
     of who still needs the message, so the broadcast pauses instead and every
     row keeps its place in the queue. */
  if (!canSendWhatsApp()) {
    const error = 'WHATSAPP_PHONE_ID / WHATSAPP_TOKEN are not set, so nothing can be sent.'
    await setBroadcastStatus(broadcastId, 'paused', { lastError: error })
    const totals = await countRecipients(broadcastId)
    return { ...result, remaining: totals.queued, done: true, status: 'paused', error }
  }

  // Rows abandoned by a worker that never came back.
  await requeueStaleRecipients(broadcastId)

  while (Date.now() < deadline) {
    const batch = await claimRecipients(broadcastId, BATCH_SIZE, MAX_ATTEMPTS)

    if (!batch.length) {
      const totals = await countRecipients(broadcastId)

      /* Nothing claimable. Either the queue is genuinely empty — in which case
         this is the slice that completes the broadcast — or another worker is
         holding the last rows, in which case this one simply stands down. */
      if (totals.queued === 0 && totals.sending === 0) {
        await setBroadcastStatus(broadcastId, 'completed', {
          completedAt: new Date(),
          lastError: null,
        })
        return { ...result, remaining: 0, done: true, status: 'completed' }
      }

      return { ...result, remaining: totals.queued, done: false, status: 'sending' }
    }

    await sendBatch(broadcast, batch, result, deadline)

    /* Re-read between batches so a pause or cancel takes effect within one
       batch rather than at the end of the slice. Nothing is held at this
       point — every claimed row has been resolved — so stopping here strands
       no one. */
    const current = await getBroadcast(broadcastId)
    if (current?.status !== 'sending') {
      const totals = await countRecipients(broadcastId)
      return {
        ...result,
        remaining: totals.queued,
        done: true,
        status: current?.status ?? 'cancelled',
      }
    }
  }

  const totals = await countRecipients(broadcastId)
  return { ...result, remaining: totals.queued, done: totals.queued === 0, status: 'sending' }
}

/* ---------------------------------------------------------------------------
 * One batch
 * ------------------------------------------------------------------------ */

async function sendBatch(
  broadcast: BroadcastRow,
  batch: ClaimedRecipient[],
  result: { sent: number; failed: number; skipped: number },
  deadline: number,
): Promise<void> {
  const phones = batch.map((recipient) => recipient.phone)

  /* Checked again here, not only when the list was built. A scheduled
     broadcast's audience can be hours old, and someone who replied STOP in
     those hours has opted out in time to matter. */
  const suppressed = await optedOutPhones(phones)

  /* Only free text needs the window, and asking for it costs a query, so it is
     not asked for when sending a template. */
  const windowByPhone =
    broadcast.kind === 'text' ? await lastInboundAt(phones) : new Map<string, Date>()

  const gapMs = Math.max(0, Math.round(1000 / Math.max(1, MESSAGES_PER_SECOND)))

  for (const recipient of batch) {
    if (suppressed.has(recipient.phone)) {
      await markRecipientSkipped(recipient.id, 'Opted out of WhatsApp messages.')
      result.skipped++
      continue
    }

    if (broadcast.kind === 'text') {
      const lastInbound = windowByPhone.get(recipient.phone)
      const insideWindow =
        lastInbound && Date.now() - lastInbound.getTime() < CUSTOMER_SERVICE_WINDOW_MS

      if (!insideWindow) {
        /* Skipped, not failed. Nothing was wrong with the number and nothing
           was attempted — the message simply could not legally be free text.
           Recording it as a failure would suggest a retry might work. */
        await markRecipientSkipped(
          recipient.id,
          lastInbound
            ? 'Last replied more than 24 hours ago — free text cannot be delivered. Use a template.'
            : 'Has never messaged this number — free text cannot be delivered. Use a template.',
        )
        result.skipped++
        continue
      }
    }

    const outcome = await send(broadcast, recipient)

    if (outcome.ok) {
      await markRecipientSent(recipient.id, outcome.messageId)
      result.sent++
    } else {
      /* Out of attempts stops being retryable however transient the cause —
         otherwise a number that times out every time never leaves the queue. */
      const retryable = outcome.retryable && recipient.attempts < MAX_ATTEMPTS
      await markRecipientFailed(recipient.id, outcome.error, retryable)
      if (!retryable) result.failed++
    }

    // Throttle, unless the slice is out of time anyway.
    if (gapMs && Date.now() + gapMs < deadline) await sleep(gapMs)
  }
}

function send(broadcast: BroadcastRow, recipient: ClaimedRecipient) {
  const context = { name: recipient.name, courseTitle: recipient.courseTitle }

  if (broadcast.kind === 'text') {
    return sendText(recipient.phone, applyMergeFields(broadcast.body ?? '', context))
  }

  return sendTemplate(recipient.phone, {
    name: broadcast.templateName ?? '',
    language: broadcast.templateLanguage ?? 'en_US',
    bodyParameters: (broadcast.templateVariables ?? []).map((value) =>
      applyMergeFields(value, context),
    ),
    headerParameter: broadcast.headerParameter
      ? applyMergeFields(broadcast.headerParameter, context)
      : undefined,
    headerImageUrl: broadcast.headerImageUrl,
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ---------------------------------------------------------------------------
 * Test send
 * ------------------------------------------------------------------------ */

/**
 * Send this exact broadcast to one number, without touching the queue.
 *
 * The single most useful thing in the whole feature. A template renders
 * differently from how it reads in the compose form — the header, the footer
 * and the buttons are all held by Meta and never appear in the draft — so the
 * only way to know what four hundred people are about to receive is to receive
 * it once first.
 */
export async function sendTestMessage(
  broadcast: BroadcastRow,
  phone: string,
  context: { name?: string | null; courseTitle?: string | null } = {},
) {
  return send(broadcast, {
    id: 'test',
    phone,
    name: context.name ?? 'Test recipient',
    courseTitle: context.courseTitle ?? null,
    attempts: 0,
  })
}
