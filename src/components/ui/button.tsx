import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Zero-JS button. The press "ripple" and hover shine are pure CSS pseudo
 * elements, so this stays a server component and ships no client bundle.
 */
const buttonVariants = cva(
  [
    'relative isolate inline-flex items-center justify-center gap-2 overflow-hidden',
    'font-sans font-semibold whitespace-nowrap select-none',
    'transition-[transform,box-shadow,background-color,color] duration-300 ease-[var(--ease-out-expo)]',
    'active:scale-[0.985] active:duration-75',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Press ripple
    'after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]',
    'after:bg-[radial-gradient(circle_at_center,rgb(255_255_255/0.45),transparent_62%)]',
    'after:scale-0 after:opacity-0 after:transition-transform after:duration-500',
    'active:after:scale-150 active:after:opacity-100 active:after:duration-150',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-900 text-white shadow-soft',
          'hover:bg-brand-700 hover:shadow-lift hover:-translate-y-0.5',
          // Shine sweep
          'before:pointer-events-none before:absolute before:inset-y-0 before:-left-full before:-z-10 before:w-1/2',
          'before:bg-linear-to-r before:from-transparent before:via-white/25 before:to-transparent',
          'before:transition-transform before:duration-700 hover:before:translate-x-[300%]',
        ],
        gold: [
          'bg-linear-to-br from-gold-400 via-gold-500 to-gold-600 text-brand-950 shadow-soft',
          'hover:shadow-glow hover:-translate-y-0.5 hover:brightness-110',
          'before:pointer-events-none before:absolute before:inset-y-0 before:-left-full before:-z-10 before:w-1/2',
          'before:bg-linear-to-r before:from-transparent before:via-white/50 before:to-transparent',
          'before:transition-transform before:duration-700 hover:before:translate-x-[300%]',
        ],
        outline: [
          'border-2 border-brand-900 bg-transparent text-brand-900',
          'hover:bg-brand-900 hover:text-white hover:-translate-y-0.5 hover:shadow-lift',
        ],
        'outline-light': [
          'border-2 border-white/40 bg-white/5 text-white backdrop-blur-sm',
          'hover:border-white hover:bg-white hover:text-brand-900 hover:-translate-y-0.5',
        ],
        secondary: [
          'bg-white text-brand-900 shadow-soft ring-1 ring-ink-200',
          'hover:bg-brand-50 hover:ring-brand-200 hover:-translate-y-0.5 hover:shadow-lift',
        ],
        ghost: 'text-ink-700 hover:bg-ink-100 hover:text-brand-900',
        'ghost-light': 'text-white/80 hover:bg-white/10 hover:text-white',
        link: 'text-brand-700 underline-offset-4 hover:text-brand-600 hover:underline after:hidden',
        whatsapp: 'bg-[#25D366] text-white shadow-lift hover:brightness-110 hover:-translate-y-0.5',
      },
      size: {
        sm: 'h-9 rounded-lg px-3.5 text-[0.8125rem] [&_svg]:size-4',
        md: 'h-11 rounded-xl px-5 text-sm [&_svg]:size-4',
        lg: 'h-13 rounded-xl px-7 text-base [&_svg]:size-5',
        xl: 'h-15 rounded-2xl px-9 text-[1.0625rem] [&_svg]:size-5',
        icon: 'size-11 rounded-xl [&_svg]:size-5',
        'icon-sm': 'size-9 rounded-lg [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Render as the child element (e.g. next/link) instead of a <button>. */
    asChild?: boolean
  }

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
