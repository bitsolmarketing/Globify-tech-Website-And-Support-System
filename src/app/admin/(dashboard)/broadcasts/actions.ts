'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin, runAction, runDataAction, type ActionResult, type DataResult } from '@/lib/admin/guard'
import {
  broadcastFormSchema,
  toBroadcastInput,
  type BroadcastFormValues,
} from '@/lib/admin/schemas'
import {
  createBroadcast,
  deleteBroadcast,
  getBroadcast,
  rebuildRecipients,
  recordOptOut,
  removeOptOut,
  requeueFailed,
  resolveAudience,
  setBroadcastStatus,
  updateBroadcast,
  countRecipients,
  type AudienceResult,
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
 * Compose
 * ------------------------------------------------------------------------ */

export type SavedBroadcast = { id: string; audience: AudienceResult }

/**
 * Save a draft and resolve its audience in one step.
 *
 * The two are deliberately not separable. A saved broadcast whose recipient
 * list belongs to the *previous* filter is the single most dangerous state this
 * feature could have — the review screen would show one audience and the send
 * would go to another — so the list is rebuilt every time the filter is stored.
 */
export async function saveBroadcast(
  id: string | null,
  values: BroadcastFormValues,
): Promise<DataResult<SavedBroadcast>> {
  return runDataAction(async () => {
    const admin = await requireAdmin()
    const input = toBroadcastInput(broadcastFormSchema.parse(values))

    let broadcastId = id
    if (broadcastId) {
      await updateBroadcast(broadcastId, input)
    } else {
      const created = await createBroadcast({ ...input, createdBy: admin.email })
      broadcastId = created.id
    }

    const audience = await rebuildRecipients(broadcastId, await resolveAudience(input.audience))

    refresh(broadcastId)
    return { id: broadcastId, audience }
  })
}

/** Re-run the saved filter — the audience moves on even when the message does not. */
export async function rebuildAudience(id: string): Promise<DataResult<AudienceResult>> {
  return runDataAction(async () => {
    const broadcast = await getBroadcast(id)
    if (!broadcast?.audience) throw new Error('That broadcast has no audience filter saved.')

    const audience = await rebuildRecipients(id, await resolveAudience(broadcast.audience))
    refresh(id)
    return audience
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
 * Sending
 * ------------------------------------------------------------------------ */

/**
 * Move a reviewed broadcast into the queue.
 *
 * Every precondition that would otherwise fail hundreds of times — once per
 * recipient — is checked once, here, while there is still a person looking at
 * the screen to tell.
 */
export async function startBroadcast(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const broadcast = await getBroadcast(id)
    if (!broadcast) throw new Error('That broadcast no longer exists.')

    if (broadcast.status === 'sending') throw new Error('That broadcast is already sending.')
    if (broadcast.status === 'completed') {
      throw new Error('That broadcast has already been sent. Duplicate it to send again.')
    }

    if (broadcast.kind === 'template' && !broadcast.templateName) {
      throw new Error('Choose an approved template before sending.')
    }
    if (broadcast.kind === 'text' && !broadcast.body?.trim()) {
      throw new Error('Write the message before sending.')
    }

    const totals = await countRecipients(id)
    if (totals.queued === 0) {
      throw new Error(
        totals.total === 0
          ? 'This broadcast has no recipients. Rebuild the audience first.'
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

/**
 * Send the composed message to one number, now.
 *
 * Bypasses the queue entirely — no recipient row is created and no counter
 * moves — because a test that shows up in the delivery report is a test that
 * makes the report a lie.
 */
export async function sendTest(id: string, phone: string): Promise<ActionResult> {
  return runAction(async () => {
    const broadcast = await getBroadcast(id)
    if (!broadcast) throw new Error('That broadcast no longer exists.')

    const to = normalisePhone(phone)
    if (!to) throw new Error('That does not look like a valid phone number.')

    const outcome = await sendTestMessage(broadcast, to)
    if (!outcome.ok) throw new Error(outcome.error)
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
