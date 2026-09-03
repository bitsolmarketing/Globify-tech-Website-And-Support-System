'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import type { ActionResult } from '@/lib/admin/guard'

/**
 * Adding an opt-out by hand.
 *
 * People ask to be taken off a list by every route except the one the software
 * knows about — in a phone call, in a reply to a different channel, in person
 * at the front desk. Without this the only way to honour that is to remember to
 * exclude them from every future audience, which no one will.
 */
export function OptOutForm({
  onAdd,
}: {
  onAdd: (phone: string, reason: string) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [phone, setPhone] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [pending, startTransition] = React.useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!phone.trim()) return

    startTransition(async () => {
      const result = await onAdd(phone, reason)

      if (!result.ok) {
        toast.error('Could not add the opt-out', { description: result.error })
        return
      }

      toast.success('Opt-out recorded', {
        description: 'This number will be excluded from every future broadcast.',
      })
      setPhone('')
      setReason('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="mb-6 flex flex-wrap items-end gap-3">
      <div className="grid gap-2">
        <Label htmlFor="opt-out-phone">Phone number</Label>
        <Input
          id="opt-out-phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="0300 1234567"
          className="h-11 w-56"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="opt-out-reason">Reason (optional)</Label>
        <Input
          id="opt-out-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Asked at the front desk"
          className="h-11 w-72"
        />
      </div>

      <Button type="submit" variant="secondary" size="md" disabled={pending || !phone.trim()}>
        {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
        Add opt-out
      </Button>
    </form>
  )
}
