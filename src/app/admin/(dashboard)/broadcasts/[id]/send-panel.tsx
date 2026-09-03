'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2, PauseCircle, RefreshCw, RotateCcw, Send, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import type { BroadcastStatus } from '@/db/schema'
import type { ActionResult, DataResult } from '@/lib/admin/guard'
import type { AudienceResult } from '@/lib/data/broadcasts'
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
  /** False when the WhatsApp credentials are missing — send is not offered. */
  canSend: boolean
  actions: {
    start: (id: string) => Promise<ActionResult>
    pause: (id: string) => Promise<ActionResult>
    cancel: (id: string) => Promise<ActionResult>
    run: (id: string) => Promise<DataResult<SliceResult>>
    retryFailed: (id: string) => Promise<DataResult<number>>
    rebuildAudience: (id: string) => Promise<DataResult<AudienceResult>>
    sendTest: (id: string, phone: string) => Promise<ActionResult>
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [testPhone, setTestPhone] = React.useState('')
  const [testing, setTesting] = React.useState(false)

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

  async function onTest() {
    if (!testPhone.trim()) return

    setTesting(true)
    const result = await actions.sendTest(id, testPhone)
    setTesting(false)

    if (!result.ok) {
      toast.error('Test message failed', { description: result.error })
      return
    }
    toast.success('Test sent', { description: `Check WhatsApp on ${testPhone}.` })
  }

  const sending = status === 'sending'
  const finished = status === 'completed' || status === 'cancelled'

  return (
    <Card className="grid gap-5 p-6">
      <div className="flex flex-wrap items-center gap-2">
        {!sending && !finished && (
          <Button
            variant="primary"
            size="md"
            disabled={pending || !canSend || queued === 0}
            onClick={() => run('start the broadcast', actions.start)}
          >
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
            {status === 'paused' ? 'Resume sending' : `Send to ${queued} recipients`}
          </Button>
        )}

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

        {!sending && !finished && (
          <Button
            variant="ghost"
            size="md"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await actions.rebuildAudience(id)
                if (!result.ok) {
                  toast.error('Could not rebuild the audience', { description: result.error })
                  return
                }
                toast.success(`${result.data.added} recipients`, {
                  description:
                    result.data.optedOut > 0
                      ? `${result.data.optedOut} were skipped for having opted out.`
                      : 'The list now matches the saved filters.',
                })
                router.refresh()
              })
            }
          >
            <Users aria-hidden />
            Rebuild audience
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

        {finished && status === 'completed' && (
          <Button variant="ghost" size="md" onClick={() => router.refresh()}>
            <RefreshCw aria-hidden />
            Refresh delivery report
          </Button>
        )}
      </div>

      {/* ---------------------------------------------------------- Test send */}
      {!finished && canSend && (
        <div className="border-t border-hairline pt-5">
          <Label htmlFor="test-phone">Send yourself a test first</Label>
          <p className="mt-1 mb-3 font-sans text-[0.8125rem] text-ink-500">
            Goes straight to one number without touching the queue or the delivery report. The only
            way to see the header, footer and buttons Meta holds for the template.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input
              id="test-phone"
              type="tel"
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              placeholder="0300 1234567"
              className="h-11 max-w-xs"
            />
            <Button
              variant="secondary"
              size="md"
              disabled={testing || !testPhone.trim()}
              onClick={onTest}
            >
              {testing ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
              Send test
            </Button>
          </div>
        </div>
      )}

      {!canSend && (
        <p className="rounded-xl border border-gold-300/70 bg-gold-50 p-4 font-sans text-[0.875rem] text-gold-900">
          Sending is disabled until <code className="font-mono">WHATSAPP_PHONE_ID</code> and{' '}
          <code className="font-mono">WHATSAPP_TOKEN</code> are set in the environment.
        </p>
      )}
    </Card>
  )
}
