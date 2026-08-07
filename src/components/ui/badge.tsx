import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-sans font-semibold whitespace-nowrap transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        brand: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200/70 ring-inset',
        gold: 'bg-gold-50 text-gold-800 ring-1 ring-gold-300/70 ring-inset',
        solid: 'bg-brand-900 text-white',
        'solid-gold': 'bg-linear-to-br from-gold-400 to-gold-600 text-brand-950',
        neutral: 'bg-ink-100 text-ink-700 ring-1 ring-ink-200 ring-inset',
        outline: 'border border-ink-300 text-ink-600',
        light: 'bg-white/12 text-white ring-1 ring-white/25 ring-inset backdrop-blur-sm',
        success: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 ring-inset',
      },
      size: {
        sm: 'px-2.5 py-0.5 text-[0.6875rem] tracking-wide uppercase',
        md: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm',
      },
    },
    defaultVariants: { variant: 'brand', size: 'md' },
  },
)

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { badgeVariants }
