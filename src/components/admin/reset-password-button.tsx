'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'

type ProvisionResult =
  | { ok: true; password: string; email: string }
  | { ok: false; error: string }

/**
 * Issue a fresh temporary password and reveal it once.
 *
 * Two-step, like the delete button, because it invalidates the password the
 * person is currently using — pressing it by accident locks someone out of a
 * class they are sitting in.
 */
export function ResetPasswordButton({ action }: { action: () => Promise<ProvisionResult> }) {
  const router = useRouter()
  const [armed, setArmed] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [password, setPassword] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  if (password) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50 p-5">
        <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
          New temporary password
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="font-mono text-lg font-bold tracking-wide text-ink-900">{password}</code>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard?.writeText(password)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <p className="mt-3 font-sans text-[0.8125rem] text-amber-700">
          Shown once. They will be asked to choose their own password when they next sign in.
        </p>
      </Card>
    )
  }

  return (
    <Button
      type="button"
      variant={armed ? 'primary' : 'secondary'}
      size="md"
      disabled={pending}
      className={armed ? 'bg-amber-600 hover:bg-amber-700' : undefined}
      onClick={async () => {
        if (!armed) {
          setArmed(true)
          setTimeout(() => setArmed(false), 4000)
          return
        }

        setPending(true)
        const result = await action()
        setPending(false)
        setArmed(false)

        if (!result.ok) {
          toast.error('Could not reset the password', { description: result.error })
          return
        }

        setPassword(result.password)
        router.refresh()
      }}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          Resetting
        </>
      ) : armed ? (
        'Confirm — this ends their current password'
      ) : (
        <>
          <KeyRound aria-hidden />
          Reset password
        </>
      )}
    </Button>
  )
}
