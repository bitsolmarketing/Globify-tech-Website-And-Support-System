'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/**
 * The admin's own error boundary.
 *
 * Every public page degrades to the seed content checked into the repo when a
 * read fails, so the site stays up through a database outage. The admin cannot:
 * it exists to show what is actually in the database, and inventing content
 * there would be a lie about the business. So it fails — and until this file
 * existed it failed into Next's blank 500, which says nothing about which of
 * the two very different causes it was.
 *
 * Naming the reason is the whole point. "The database did not answer" sends you
 * to Supabase; anything else sends you to the logs. The distinction is worth
 * more here than a prettier page, because whoever hits this is usually the only
 * person who can fix it.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[admin-error]', error)
  }, [error])

  /* Server components strip the message from a production error and leave only
     the digest, so the timeout cannot be recognised by its text here. The
     boundary therefore describes both possibilities rather than guessing at
     one — a wrong confident diagnosis costs more than an honest pair. */
  return (
    <Card className="mx-auto mt-10 max-w-xl p-10 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle aria-hidden className="size-7" />
      </span>

      <h1 className="mt-5 font-sans text-2xl font-extrabold tracking-tight text-ink-900">
        This page could not be loaded
      </h1>

      <p className="mt-3 font-sans text-[0.9375rem] text-ink-500">
        Usually the database did not answer in time. The public site is unaffected — it serves its
        own copy of this content — but the admin reads live and has nothing to fall back to.
      </p>

      <p className="mt-3 font-sans text-[0.9375rem] text-ink-500">
        Try again first. If it keeps happening, check{' '}
        <code className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">/api/version?probe=1</code>, which
        opens a real connection and reports what stopped it.
      </p>

      {error.digest && (
        <p className="mt-4 font-sans text-xs text-ink-400">
          Reference: <code className="rounded bg-ink-100 px-1.5 py-0.5">{error.digest}</code>
        </p>
      )}

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button variant="primary" size="md" onClick={reset}>
          <RotateCcw aria-hidden />
          Try again
        </Button>
        <Button asChild variant="secondary" size="md">
          <Link href="/admin">Back to the dashboard</Link>
        </Button>
      </div>
    </Card>
  )
}
