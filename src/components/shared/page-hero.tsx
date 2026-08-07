import * as React from 'react'

import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Badge } from '@/components/ui/badge'
import type { Crumb } from '@/lib/schema'
import { cn } from '@/lib/utils'

type Props = {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  crumbs: Crumb[]
  children?: React.ReactNode
  className?: string
  /** Extra content pinned to the right on wide screens (stats, CTA, meta). */
  aside?: React.ReactNode
}

/** Shared dark page header used by every interior page. */
export function PageHero({
  eyebrow,
  title,
  description,
  crumbs,
  children,
  className,
  aside,
}: Props) {
  return (
    <section
      className={cn(
        'relative isolate overflow-hidden bg-brand-950 pt-10 pb-16 text-white lg:pt-12 lg:pb-20',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute inset-0 bg-grid-light opacity-40" />
        <div className="absolute -top-40 -right-24 size-[30rem] rounded-full bg-gold-500/12 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-brand-600/20 blur-3xl" />
      </div>

      <div className="container-page">
        <Breadcrumbs crumbs={crumbs} tone="light" />

        <div
          className={cn(
            'mt-8 gap-10',
            aside ? 'grid lg:grid-cols-[1.35fr_1fr] lg:items-end' : 'max-w-3xl',
          )}
        >
          <div>
            {eyebrow && (
              <Badge variant="light" size="md" className="mb-4">
                {eyebrow}
              </Badge>
            )}

            <h1 className="text-4xl text-white sm:text-5xl lg:text-[3.25rem]">{title}</h1>

            {description && (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">{description}</p>
            )}

            {children && <div className="mt-8">{children}</div>}
          </div>

          {aside && <div>{aside}</div>}
        </div>
      </div>
    </section>
  )
}
