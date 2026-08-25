import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { siteConfig } from '@/lib/site'

type Props = {
  className?: string
  tone?: 'dark' | 'light'
  showTagline?: boolean
  href?: string | null
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/brand/logo-mark.png"
      alt=""
      width={1024}
      height={1024}
      className={cn('size-10 object-contain', className)}
    />
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
