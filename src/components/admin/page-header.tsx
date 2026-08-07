import * as React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Consistent title block for every admin screen. */
export function AdminPageHeader({
  title,
  description,
  backHref,
  backLabel = 'Back',
  actions,
  className,
}: {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-8', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 font-sans text-[0.8125rem] font-semibold text-ink-500 transition-colors hover:text-brand-800"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-500">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
