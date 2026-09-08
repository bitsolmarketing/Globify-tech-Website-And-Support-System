'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin, runAction, runDataAction, type ActionResult, type DataResult } from '@/lib/admin/guard'
import {
  broadcastAudienceSchema,
  broadcastFormSchema,
  broadcastMessageSchema,
  toAudienceInput,
  toBroadcastInput,
  toMessageInput,
  type BroadcastAudienceValues,
  type BroadcastFormValues,
  type BroadcastMessageValues,
} from '@/lib/admin/schemas'
import {
  countRecipients,
  createBroadcast,
  deleteBroadcast,
  getBroadcast,
  optedOutPhones,
  rebuildRecipients,
  recordOptOut,
  removeOptOut,
  requeueFailed,
  resolveAudience,
  setBroadcastStatus,
} from '@/lib/data/broadcasts'
import { normalisePhone } from '@/lib/whatsapp/format'
import { runBroadcastSlice, sendTestMessage, type SliceResult } from '@/lib/whatsapp/runner'
import { listTemplates, type TemplateFetch } from '@/lib/whatsapp/templates'

/**
 * Broadcasts are admin-only, so every revalidation here is of an `/admin` path.
 * Nothing on the public site reads a broadcast, and sweeping the public tree
 * for a send that changes no page would evict the whole static cache for
 * nothing.
 */
function refresh(id?: string) {
  revalidatePath('/admin/broadcasts')
  if (id) revalidatePath(`/admin/broadcasts/${id}`)
}

/* ---------------------------------------------------------------------------
 * Compose and send
 * ------------------------------------------------------------------------ */

export type AudiencePreview = {
  /** People who would be messaged. */
  total: number
  /** Matched the filter but have opted out, so they are not in `total`. */
  optedOut: number
}

/**
 * How many people the current filter selects, right now.
 *
 * Answered by the same resolver the send queues from rather than by a cheaper
 * `count(*)`: the number on the screen is the promise the button makes, and the
 * only way to keep it honest is to resolve the list the same way both times.
 */
export async function previewAudience(
  values: BroadcastAudienceValues,
): Promise<DataResult<AudiencePreview>> {
  return runDataAction(async () => {
    await requireAdmin()

    const candidates = await resolveAudience(toAudienceInput(broadcastAudienceSchema.parse(values)))
    const suppressed = await optedOutPhones(candidates.map((candidate) => candidate.phone))

    return {
      total: candidates.length - suppressed.size,
      optedOut: suppressed.size,
    }
  })
}

export type SendResult = {
  id: string
  queued: number
  optedOut: number
  /** True when it was scheduled for later rather than started now. */
  scheduled: boolean
}

/**
 * Compose, queue and start — one press.
 *
 * This was three steps across two screens: save a draft, review it, press send.
 * The review screen did no work the compose screen could not do itself, because
 * the two things worth checking — what the message says and who receives it —
 * are both on the compose screen already, live. What it did do was let a
 * draft's saved audience drift out of date behind the admin's back, which is
 * the most dangerous state this feature could have: one list reviewed, another
 * one sent. Resolving the audience and starting the send in a single action
 * closes that window — the count that was on screen is the list that goes out.
 */
export async function sendBroadcast(values: BroadcastFormValues): Promise<DataResult<SendResult>> {
  return runDataAction(async () => {
    const admin = await requireAdmin()
    const input = toBroadcastInput(broadcastFormSchema.parse(values))

    const broadcast = await createBroadcast({ ...input, createdBy: admin.email })
    const audience = await rebuildRecipients(broadcast.id, await resolveAudience(input.audience))

    /* Refused after the row exists rather than before it, so an empty filter
       leaves a record of what was attempted instead of vanishing. */
    if (audience.added === 0) {
      await setBroadcastStatus(broadcast.id, 'cancelled', {
        completedAt: new Date(),
        lastError:
          audience.total > 0
            ? 'Everyone the filter matched has opted out of WhatsApp messages.'
            : 'The filter matched nobody with a usable phone number.',
      })
      refresh(broadcast.id)
      throw new Error(
        audience.total > 0
          ? `All ${audience.total} people matching that filter have opted out. Nothing was sent.`
          : 'Nobody matches that filter. Nothing was sent.',
      )
    }

    const scheduled = Boolean(input.scheduledFor)
    if (!scheduled) {
      await setBroadcastStatus(broadcast.id, 'sending', { startedAt: new Date(), lastError: null })
    }

    refresh(broadcast.id)
    return { id: broadcast.id, queued: audience.added, optedOut: audience.optedOut, scheduled }
  })
}

/**
 * Send the composed message to one number, before it exists as a broadcast.
 *
 * The single most useful thing in the whole feature, and it has to work from
 * the compose screen: a template renders differently from how it reads here —
 * the header, footer and buttons are all held by Meta — so the only way to know
 * what four hundred people are about to receive is to receive it once first.
 * Nothing is persisted and no recipient row is created.
 */
export async function sendTest(
  values: BroadcastMessageValues,
  phone: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin()

    const to = normalisePhone(phone)
    if (!to) throw new Error('That does not look like a valid phone number.')

    /* Only the message is validated. A test needs no audience, and refusing one
       until the recipient list is settled gets it exactly backwards. */
    const outcome = await sendTestMessage(toMessageInput(broadcastMessageSchema.parse(values)), to)
    if (!outcome.ok) throw new Error(outcome.error)
  })
}

export async function removeBroadcast(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const broadcast = await getBroadcast(id)
    /* Deleting a send in flight would leave the queue rows orphaned and the
       workers mid-batch. Cancelling first is one extra click and makes the
       record of what was sent survive. */
    if (broadcast?.status === 'sending') {
      throw new Error('Pause or cancel the broadcast before deleting it.')
    }

    await deleteBroadcast(id)
    refresh()
  })
}

/* ---------------------------------------------------------------------------
 * Running
 * ------------------------------------------------------------------------ */

/** Resume a paused send, or start a scheduled one ahead of its time. */
export async function resumeBroadcast(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const broadcast = await getBroadcast(id)
    if (!broadcast) throw new Error('That broadcast no longer exists.')

    if (broadcast.status === 'sending') throw new Error('That broadcast is already sending.')
    if (broadcast.status === 'completed') {
      throw new Error('That broadcast has already been sent. Compose a new one to send again.')
    }

    const totals = await countRecipients(id)
    if (totals.queued === 0) {
      throw new Error(
        totals.total === 0
          ? 'This broadcast has no recipients left.'
          : 'Every recipient has already been processed. Retry the failures instead.',
      )
    }

    await setBroadcastStatus(id, 'sending', { startedAt: new Date(), lastError: null })
    refresh(id)
  })
}

export async function pauseBroadcast(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await setBroadcastStatus(id, 'paused')
    refresh(id)
  })
}

export async function cancelBroadcast(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await setBroadcastStatus(id, 'cancelled', { completedAt: new Date() })
    refresh(id)
  })
}

/** Failed rows back to the front of the queue, without touching the sent ones. */
export async function retryFailed(id: string): Promise<DataResult<number>> {
  return runDataAction(async () => {
    const requeued = await requeueFailed(id)
    if (requeued > 0) {
      await setBroadcastStatus(id, 'sending', { completedAt: null, lastError: null })
    }
    refresh(id)
    return requeued
  })
}

/**
 * Push the queue along by one slice.
 *
 * Called in a loop by the progress screen while it is open. The work is done
 * here rather than in the browser so the token never leaves the server, and the
 * loop lives in the browser rather than here so no single request has to
 * outlive a serverless timeout.
 */
export async function runBroadcast(id: string): Promise<DataResult<SliceResult>> {
  return runDataAction(async () => {
    const result = await runBroadcastSlice(id)
    refresh(id)
    return result
  })
}

/* ---------------------------------------------------------------------------
 * Templates and opt-outs
 * ------------------------------------------------------------------------ */

/** Re-read the approved list — a template approved a minute ago is not cached. */
export async function refreshTemplates(): Promise<DataResult<TemplateFetch>> {
  return runDataAction(async () => listTemplates({ refresh: true }))
}

export async function addOptOut(phone: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    const normalised = normalisePhone(phone)
    if (!normalised) throw new Error('That does not look like a valid phone number.')

    await recordOptOut(normalised, reason || 'Added by an administrator', 'admin')
    revalidatePath('/admin/broadcasts/opt-outs')
  })
}

export async function deleteOptOut(phone: string): Promise<ActionResult> {
  return runAction(async () => {
    await removeOptOut(phone)
    revalidatePath('/admin/broadcasts/opt-outs')
  })
}
