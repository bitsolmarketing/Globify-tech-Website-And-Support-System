'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Phone, Tag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Campaign } from '@/lib/data/campaign'
import { contactInfo } from '@/lib/site'
import { cn, formatDayMonth } from '@/lib/utils'

/**
 * Mobile-only conversion bar. Appears after the hero so it never covers the
 * primary CTA, and is fixed-height from the start so it cannot shift layout.
 */
export function StickyCta({ campaign }: { campaign: Campaign }) {
  const pathname = usePathname()
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 700)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname === '/contact') return null

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-60 sm:hidden',
        'border-t border-white/10 bg-brand-950/95 backdrop-blur-lg',
        'pb-[env(safe-area-inset-bottom)]',
        'transition-transform duration-400 ease-[var(--ease-out-expo)]',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-sans text-[0.6875rem] font-bold tracking-wide text-gold-400 uppercase">
            <Tag aria-hidden className="size-3" />
            {campaign.discountPercent}% OFF · ends {formatDayMonth(campaign.deadline)}
          </p>
          <p className="truncate font-sans text-[0.8125rem] font-semibold text-white">
            Seats are limited — enroll today
          </p>
        </div>

        <Button asChild variant="ghost-light" size="icon" aria-label="Call admissions">
          <a href={`tel:${contactInfo.phoneHref}`} tabIndex={visible ? 0 : -1}>
            <Phone aria-hidden />
          </a>
        </Button>

        <Button asChild variant="gold" size="md">
          <Link href="/contact#enroll" tabIndex={visible ? 0 : -1}>
            Enroll
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  )
}
