'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toaster'
import type { SubscriberStatus } from '@/db/schema'
import type { ActionResult } from '@/lib/admin/guard'
import { cn } from '@/lib/utils'

/** Click the badge to subscribe/unsubscribe — no separate edit screen needed. */
export function SubscriberStatusToggle({
  id,
  email,
  status,
  onToggle,
}: {
  id: string
  email: string
  status: SubscriberStatus
  onToggle: (id: string, status: string) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [current, setCurrent] = React.useState(status)
  const [pending, startTransition] = React.useTransition()

  function toggle() {
    const next: SubscriberStatus = current === 'subscribed' ? 'unsubscribed' : 'subscribed'
    const previous = current
    setCurrent(next)

    startTransition(async () => {
      const result = await onToggle(id, next)

      if (!result.ok) {
        setCurrent(previous)
        toast.error('Could not update subscription', { description: result.error })
        return
      }

      toast.success(next === 'subscribed' ? `${email} resubscribed` : `${email} unsubscribed`)
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={`Mark ${email} as ${current === 'subscribed' ? 'unsubscribed' : 'subscribed'}`}
      className={cn('rounded-full transition-opacity', pending && 'opacity-50')}
    >
      <Badge variant={current === 'subscribed' ? 'success' : 'neutral'} size="md">
        {current === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}
      </Badge>
    </button>
  )
}
