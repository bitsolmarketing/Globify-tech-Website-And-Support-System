import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Crumb } from '@/lib/schema'

/**
 * Visible breadcrumb trail. The matching BreadcrumbList JSON-LD is emitted by
 * each page via `breadcrumbSchema()` so the markup and the structured data
 * always describe the same path.
 */
export function Breadcrumbs({
  crumbs,
  tone = 'dark',
  className,
}: {
  /** Excludes Home — it is prepended automatically. */
  crumbs: Crumb[]
  tone?: 'dark' | 'light'
  className?: string
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('w-full', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-sans text-[0.8125rem]">
        <li>
          <Link
            href="/"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors',
              tone === 'light'
                ? 'text-white/60 hover:text-white'
                : 'text-ink-400 hover:text-brand-800',
            )}
          >
            <Home aria-hidden className="size-3.5" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
        </li>

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              <ChevronRight
                aria-hidden
                className={cn('size-3.5', tone === 'light' ? 'text-white/30' : 'text-ink-300')}
              />
              {isLast ? (
                <span
                  aria-current="page"
                  className={cn(
                    'max-w-[16rem] truncate font-semibold sm:max-w-md',
                    tone === 'light' ? 'text-white' : 'text-ink-800',
                  )}
                >
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className={cn(
                    'rounded-md px-1 py-0.5 transition-colors',
                    tone === 'light'
                      ? 'text-white/60 hover:text-white'
                      : 'text-ink-400 hover:text-brand-800',
                  )}
                >
                  {crumb.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
