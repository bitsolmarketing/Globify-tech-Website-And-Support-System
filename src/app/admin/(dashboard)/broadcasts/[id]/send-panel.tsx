'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2, PauseCircle, RotateCcw, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import type { BroadcastStatus } from '@/db/schema'
import type { ActionResult, DataResult } from '@/lib/admin/guard'
import type { SliceResult } from '@/lib/whatsapp/runner'

/**
 * The controls, and the engine.
 *
 * While a broadcast is `sending` this component is what actually moves it: it
 * calls the runner one slice at a time and refreshes the server-rendered
 * progress between each. That is a deliberate choice rather than a fallback —
 * the alternative is a background worker this deployment does not have, and a
 * send that only progresses when a cron happens to fire.
 *
 * Closing the tab is therefore safe but slower: the cron route picks up
 * whatever is left. Nothing is lost either way, because the queue is the state
 * and neither driver holds anything the other cannot claim.
 *
 * There is no compose control here any more. A broadcast is created by the send
 * itself, so by the time this screen exists the message and the recipient list
 * are both settled — what is left is watching it happen, and stopping it.
 */
export function SendPanel({
  id,
  status,
  queued,
  failed,
  canSend,
  actions,
}: {
  id: string
  status: BroadcastStatus
  queued: number
  failed: number
  /** False when the WhatsApp credentials are missing — resuming is not offered. */
  canSend: boolean
  actions: {
    resume: (id: string) => Promise<ActionResult>
    pause: (id: string) => Promise<ActionResult>
    cancel: (id: string) => Promise<ActionResult>
    run: (id: string) => Promise<DataResult<SliceResult>>
    retryFailed: (id: string) => Promise<DataResult<number>>
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  /* Guards the pump against being started twice. `router.refresh()` re-renders
     this component on every slice, and without this each render that still saw
     `sending` would launch another loop — which is how a throttled send turns
     into an unthrottled one. */
  const pumping = React.useRef(false)

  /**
   * The server actions arrive as a fresh object on every render, so they cannot
   * be effect dependencies: the effect would tear down and restart the pump
   * after each slice, and the teardown of the old loop would clear the guard
   * the new one had just set. Holding them in a ref keeps the pump keyed on the
   * only thing that should ever restart it — the broadcast changing state.
   */
  const actionsRef = React.useRef(actions)
  actionsRef.current = actions

  React.useEffect(() => {
    if (status !== 'sending' || pumping.current) return

    pumping.current = true
    let cancelled = false

    async function pump() {
      try {
        while (!cancelled) {
          const result = await actionsRef.current.run(id)

          if (!result.ok) {
            toast.error('The send stopped', { description: result.error })
            break
          }

          // Server-rendered counters, refreshed by the same slice that moved
          // them — so the numbers on screen are never ahead of the database.
          router.refresh()

          if (result.data.done) {
            if (result.data.status === 'completed') toast.success('Broadcast finished')
            break
          }

          /* A breath between slices. The runner already throttles per message;
             this is only so a stalled queue cannot spin. */
          await new Promise((resolve) => setTimeout(resolve, 750))
        }
      } finally {
        // Released whatever happened, including a thrown action, so a transient
        // network failure does not leave the send permanently un-restartable.
        pumping.current = false
      }
    }

    void pump()

    return () => {
      cancelled = true
    }
  }, [status, id, router])

  function run(label: string, action: (id: string) => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action(id)
      if (!result.ok) {
        toast.error(`Could not ${label}`, { description: result.error })
        return
      }
      router.refresh()
    })
  }

  const sending = status === 'sending'
  const finished = status === 'completed' || status === 'cancelled'

  // Nothing left to control: a finished send with no failures to retry.
  if (finished && failed === 0) return null

  return (
    <Card className="flex flex-wrap items-center gap-2 p-6">
      {sending && (
        <>
          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 font-sans text-sm font-semibold text-emerald-800">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Sending — {queued} to go
          </span>
          <Button
            variant="secondary"
            size="md"
            disabled={pending}
            onClick={() => run('pause the broadcast', actions.pause)}
          >
            <PauseCircle aria-hidden />
            Pause
          </Button>
        </>
      )}

      {!sending && !finished && (
        <Button
          variant="primary"
          size="md"
          disabled={pending || !canSend || queued === 0}
          onClick={() => run('start the broadcast', actions.resume)}
        >
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
          {status === 'paused' ? `Resume — ${queued} to go` : `Send now to ${queued}`}
        </Button>
      )}

      {failed > 0 && !sending && (
        <Button
          variant="secondary"
          size="md"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await actions.retryFailed(id)
              if (!result.ok) {
                toast.error('Could not retry', { description: result.error })
                return
              }
              toast.success(`${result.data} recipients queued again`)
              router.refresh()
            })
          }
        >
          <RotateCcw aria-hidden />
          Retry {failed} failed
        </Button>
      )}

      {!finished && (
        <Button
          variant="ghost"
          size="md"
          disabled={pending}
          className="text-ink-500 hover:bg-red-50 hover:text-red-600"
          onClick={() => run('cancel the broadcast', actions.cancel)}
        >
          <Ban aria-hidden />
          Cancel
        </Button>
      )}

      {!canSend && (
        <p className="w-full rounded-xl border border-gold-300/70 bg-gold-50 p-4 font-sans text-[0.875rem] text-gold-900">
          Sending is disabled until <code className="font-mono">WHATSAPP_PHONE_ID</code> and{' '}
          <code className="font-mono">WHATSAPP_TOKEN</code> are set in the environment.
        </p>
      )}
    </Card>
  )
}
