import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Props = {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: 'left' | 'center'
  tone?: 'dark' | 'light'
  /** Heading level — keeps the document outline correct on every page. */
  as?: 'h1' | 'h2' | 'h3'
  className?: string
  id?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'dark',
  as: Heading = 'h2',
  className,
  id,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'mx-auto max-w-3xl items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <Badge variant={tone === 'light' ? 'light' : 'brand'} size="sm">
          {eyebrow}
        </Badge>
      )}

      <Heading
        id={id}
        className={cn(
          'text-balance',
          Heading === 'h1'
            ? 'text-4xl sm:text-5xl lg:text-6xl'
            : 'text-3xl sm:text-4xl lg:text-[2.75rem]',
          tone === 'light' && 'text-white',
        )}
      >
        {title}
      </Heading>

      {description && (
        <p
          className={cn(
            'max-w-2xl text-lg leading-relaxed text-pretty',
            tone === 'light' ? 'text-white/75' : 'text-ink-500',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}
