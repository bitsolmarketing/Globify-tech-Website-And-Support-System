'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import type { PortalActionResult } from '@/lib/portal/guard'

/**
 * A button that runs one server action and reports what happened.
 *
 * `confirmLabel` turns it into the same two-step press the admin's delete
 * button uses: the first click arms it, the second commits. Used for anything
 * that cannot be undone from the interface — issuing a certificate, deleting a
 * class along with its register.
 */
export function ActionButton({
  action,
  children,
  confirmLabel,
  successMessage,
  errorTitle = 'That did not work',
  variant = 'secondary',
  size = 'sm',
  className,
  disabled,
  icon,
}: {
  action: () => Promise<PortalActionResult>
  children: React.ReactNode
  /** When given, the button must be pressed twice. */
  confirmLabel?: string
  successMessage?: string
  errorTitle?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
  disabled?: boolean
  icon?: React.ReactNode
}) {
  const router = useRouter()
  const [armed, setArmed] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  function run() {
    if (confirmLabel && !armed) {
      setArmed(true)
      /* Disarm on its own, so a button left armed on an open tab does not fire
         on an unrelated click ten minutes later. */
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setArmed(false), 4000)
      return
    }

    startTransition(async () => {
      const result = await action()
      setArmed(false)

      if (!result.ok) {
        toast.error(errorTitle, { description: result.error })
        return
      }

      const message = result.message ?? successMessage
      if (message) toast.success(message)
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant={armed ? 'primary' : variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      onClick={run}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          Working
        </>
      ) : armed ? (
        confirmLabel
      ) : (
        <>
          {children}
          {icon}
        </>
      )}
    </Button>
  )
}
