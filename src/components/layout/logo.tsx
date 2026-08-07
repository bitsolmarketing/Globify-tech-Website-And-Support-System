import Link from 'next/link'

import { cn } from '@/lib/utils'
import { siteConfig } from '@/lib/site'

type Props = {
  className?: string
  tone?: 'dark' | 'light'
  showTagline?: boolean
  href?: string | null
}

/**
 * Inline SVG mark — a crescent and star (Pakistan) enclosed in a globe
 * meridian (Globify). Rendered inline so it costs zero requests, scales
 * perfectly and can never cause layout shift.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${siteConfig.name} logo`}
      className={cn('size-10', className)}
    >
      <defs>
        <linearGradient id="globify-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#05603a" />
          <stop offset="55%" stopColor="#01411c" />
          <stop offset="100%" stopColor="#012a12" />
        </linearGradient>
        <linearGradient id="globify-mark-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4e3a2" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b8912a" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="13" fill="url(#globify-mark-bg)" />

      {/* Globe meridians */}
      <g stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.2" fill="none">
        <circle cx="24" cy="24" r="15.5" />
        <ellipse cx="24" cy="24" rx="7" ry="15.5" />
        <path d="M9 19h30M9 29h30" />
      </g>

      {/* Crescent */}
      <path
        d="M31.2 15.4a10.2 10.2 0 1 0 0 17.2 12.1 12.1 0 1 1 0-17.2Z"
        fill="url(#globify-mark-gold)"
      />
      {/* Five-pointed star */}
      <path
        d="m33.9 20.1 1.34 2.9 3.16.38-2.34 2.16.63 3.12-2.79-1.56-2.79 1.56.63-3.12-2.34-2.16 3.16-.38z"
        fill="url(#globify-mark-gold)"
      />
    </svg>
  )
}

export function Logo({ className, tone = 'dark', showTagline = false, href = '/' }: Props) {
  const content = (
    <>
      <LogoMark className="size-10 shrink-0 shadow-soft transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-105 group-hover:rotate-3 sm:size-11" />
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            'font-sans text-[1.0625rem] leading-tight font-extrabold tracking-tight sm:text-lg',
            tone === 'light' ? 'text-white' : 'text-ink-900',
          )}
        >
          Globify<span className="text-gold-500"> Tech</span>
        </span>
        <span
          className={cn(
            'font-sans text-[0.625rem] font-semibold tracking-[0.16em] uppercase',
            tone === 'light' ? 'text-white/60' : 'text-ink-400',
          )}
        >
          {showTagline ? siteConfig.tagline : 'Institute'}
        </span>
      </span>
    </>
  )

  const classes = cn('group flex items-center gap-2.5', className)

  if (href === null) return <div className={classes}>{content}</div>

  return (
    <Link href={href} className={classes} aria-label={`${siteConfig.name} — home`}>
      {content}
    </Link>
  )
}
