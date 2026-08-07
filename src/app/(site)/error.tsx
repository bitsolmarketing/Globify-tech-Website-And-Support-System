'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { contactInfo } from '@/lib/site'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Surface to whatever monitoring is wired up in production.
    console.error('[app-error]', error)
  }, [error])

  return (
    <section className="section-y">
      <div className="container-page">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6 rounded-3xl border border-hairline bg-white p-10 text-center shadow-soft sm:p-14">
          <span className="grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle aria-hidden className="size-8" />
          </span>

          <h1 className="text-3xl sm:text-4xl">Something went wrong</h1>

          <p className="text-lg text-ink-500">
            An unexpected error interrupted this page. Trying again usually fixes it — if it does
            not, call us on{' '}
            <a
              href={`tel:${contactInfo.phoneHref}`}
              className="font-semibold text-brand-700 underline underline-offset-4"
            >
              {contactInfo.phone}
            </a>
            .
          </p>

          {error.digest && (
            <p className="font-sans text-xs text-ink-400">
              Reference: <code className="rounded bg-ink-100 px-1.5 py-0.5">{error.digest}</code>
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" size="lg" onClick={reset}>
              <RotateCcw aria-hidden />
              Try again
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/">
                <Home aria-hidden />
                Back to homepage
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
