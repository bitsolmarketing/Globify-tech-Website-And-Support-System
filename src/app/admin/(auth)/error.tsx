'use client'

import * as React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * Safety net for the sign-in screen, which otherwise has nothing catching a
 * throw and falls back to Next's blank "Application error" page — the exact
 * failure mode the AUTH_SECRET check in `page.tsx` exists to avoid, kept here
 * for any other unexpected error on this route.
 */
export default function AdminLoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[admin-login-error]', error)
  }, [error])

  return (
    <div className="grid min-h-dvh place-items-center bg-brand-950 px-4 py-12">
      <Card className="w-full max-w-md p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle aria-hidden className="size-7" />
        </span>

        <h1 className="mt-5 font-sans text-xl font-extrabold tracking-tight text-ink-900">
          Sign-in could not load
        </h1>

        <p className="mt-3 font-sans text-[0.9375rem] text-ink-500">
          Check that <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">AUTH_SECRET</code> and{' '}
          <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">DATABASE_URL</code> are set on the
          server. See README › Admin setup.
        </p>

        {error.digest && (
          <p className="mt-4 font-sans text-xs text-ink-400">
            Reference: <code className="rounded bg-ink-100 px-1.5 py-0.5">{error.digest}</code>
          </p>
        )}

        <Button variant="primary" size="md" onClick={reset} className="mt-6">
          <RotateCcw aria-hidden />
          Try again
        </Button>
      </Card>
    </div>
  )
}
