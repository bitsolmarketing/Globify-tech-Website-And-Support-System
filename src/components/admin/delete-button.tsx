'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import type { ActionResult } from '@/lib/admin/guard'

/**
 * Two-step delete: the first click arms the button, the second confirms.
 * Cheaper than a modal, and it cannot be triggered by a single stray click.
 */
export function DeleteButton({
  onDelete,
  label,
  itemName,
  redirectTo,
  size = 'icon-sm',
}: {
  onDelete: () => Promise<ActionResult>
  label: string
  itemName: string
  redirectTo?: string
  size?: React.ComponentProps<typeof Button>['size']
}) {
  const router = useRouter()
  const [armed, setArmed] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function disarmLater() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setArmed(false), 4000)
  }

  function handleClick() {
    if (!armed) {
      setArmed(true)
      disarmLater()
      return
    }

    startTransition(async () => {
      const result = await onDelete()

      if (!result.ok) {
        toast.error(`Could not delete ${itemName}`, { description: result.error })
        setArmed(false)
        return
      }

      toast.success(`${itemName} deleted`)
      if (redirectTo) router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant={armed ? 'primary' : 'ghost'}
      size={armed ? 'md' : size}
      onClick={handleClick}
      disabled={pending}
      aria-label={armed ? undefined : label}
      className={
        armed
          ? 'bg-red-600 hover:bg-red-700'
          : 'text-ink-400 hover:bg-red-50 hover:text-red-600'
      }
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          Deleting
        </>
      ) : armed ? (
        <>
          <Trash2 aria-hidden />
          Confirm delete
        </>
      ) : (
        <Trash2 aria-hidden />
      )}
    </Button>
  )
}
