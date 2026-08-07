'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowRight,
  ChevronDown,
  Menu,
  Phone,
  Sparkles,
  X,
} from 'lucide-react'

import { Logo } from '@/components/layout/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Campaign } from '@/lib/data/campaign'
import { contactInfo, mainNav, type NavItem } from '@/lib/site'
import { cn, formatDayMonthLong } from '@/lib/utils'

export function Navbar({ campaign }: { campaign: Campaign }) {
  const pathname = usePathname()
  const [scrolled, setScrolled] = React.useState(false)
  const [openMenu, setOpenMenu] = React.useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Elevate the bar once the page scrolls. Passive listener + rAF guard so it
     never contributes to input delay. */
  React.useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Close the mega menu on route change. */
  React.useEffect(() => {
    setOpenMenu(null)
    setMobileOpen(false)
  }, [pathname])

  /* Escape closes the mega menu. */
  React.useEffect(() => {
    if (!openMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openMenu])

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140)
  }
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ------------------------------------------------ Announcement bar */}
      <div className="relative overflow-hidden bg-brand-950 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-brand-950 via-brand-800 to-brand-950 bg-[length:200%_100%] animate-gradient"
        />
        <div className="container-page relative flex h-9 items-center justify-center gap-2 text-center sm:h-10">
          <p className="flex items-center gap-2 font-sans text-[0.6875rem] font-semibold tracking-wide sm:text-xs">
            <span aria-hidden>{campaign.emoji}</span>
            <span className="hidden sm:inline">{campaign.name} —</span>
            <span className="text-gradient-gold font-extrabold">
              {campaign.discountPercent}% OFF ALL COURSES
            </span>
            <span className="hidden text-white/60 md:inline">
              · Offer ends {formatDayMonthLong(campaign.deadline)}
            </span>
            <Link
              href="/courses"
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-0.5 text-[0.6875rem] font-bold whitespace-nowrap transition-colors hover:bg-white/22"
            >
              Claim now
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          </p>
        </div>
      </div>

      {/* --------------------------------------------------------- Main bar */}
      <div
        className={cn(
          'border-b transition-all duration-400 ease-[var(--ease-out-expo)]',
          scrolled
            ? 'border-hairline bg-white/85 shadow-soft backdrop-blur-xl backdrop-saturate-150'
            : 'border-transparent bg-white',
        )}
      >
        <nav
          aria-label="Main navigation"
          className="container-page flex h-16 items-center justify-between gap-4 lg:h-18"
        >
          <Logo />

          {/* ------------------------------------------------- Desktop nav */}
          <ul className="hidden items-center gap-0.5 xl:flex">
            {mainNav.map((item) => (
              <NavEntry
                key={item.href}
                item={item}
                active={isActive(item.href)}
                open={openMenu === item.href}
                onOpen={() => {
                  cancelClose()
                  setOpenMenu(item.megaMenu ? item.href : null)
                }}
                onScheduleClose={scheduleClose}
                onToggle={() => setOpenMenu((current) => (current === item.href ? null : item.href))}
              />
            ))}
          </ul>

          {/* ------------------------------------------------------- Actions */}
          <div className="flex items-center gap-2">
            <a
              href={`tel:${contactInfo.phoneHref}`}
              className="hidden items-center gap-2 rounded-xl px-3 py-2 font-sans text-sm font-semibold text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-900 lg:flex"
            >
              <Phone aria-hidden className="size-4" />
              <span className="hidden 2xl:inline">{contactInfo.phone}</span>
              <span className="2xl:hidden">Call</span>
            </a>

            <Button asChild variant="gold" size="md" className="hidden sm:inline-flex">
              <Link href="/contact#enroll">
                Enroll Now
                <ArrowRight aria-hidden />
              </Link>
            </Button>

            {/* ---------------------------------------------- Mobile trigger */}
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <Button variant="secondary" size="icon" className="xl:hidden" aria-label="Open menu">
                  <Menu aria-hidden />
                </Button>
              </Dialog.Trigger>
              <MobileMenu isActive={isActive} campaign={campaign} />
            </Dialog.Root>
          </div>
        </nav>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------ Desktop item */

function NavEntry({
  item,
  active,
  open,
  onOpen,
  onScheduleClose,
  onToggle,
}: {
  item: NavItem
  active: boolean
  open: boolean
  onOpen: () => void
  onScheduleClose: () => void
  onToggle: () => void
}) {
  const linkClasses = cn(
    'relative flex items-center gap-1 rounded-xl px-3.5 py-2.5 font-sans text-sm font-semibold transition-colors duration-200',
    active ? 'text-brand-900' : 'text-ink-600 hover:text-brand-900',
    'after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-gold-500',
    'after:origin-left after:transition-transform after:duration-300 after:ease-[var(--ease-out-expo)]',
    active ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100',
  )

  if (!item.megaMenu) {
    return (
      <li>
        <Link href={item.href} className={linkClasses} aria-current={active ? 'page' : undefined}>
          {item.label}
        </Link>
      </li>
    )
  }

  return (
    <li className="static" onMouseEnter={onOpen} onMouseLeave={onScheduleClose}>
      <Link
        href={item.href}
        className={linkClasses}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={(e) => {
          // First click opens the panel; a second click follows the link.
          if (!open) {
            e.preventDefault()
            onToggle()
          }
        }}
        onFocus={onOpen}
      >
        {item.label}
        <ChevronDown
          aria-hidden
          className={cn('size-3.5 transition-transform duration-300', open && 'rotate-180')}
        />
      </Link>

      <MegaMenu item={item} open={open} onMouseEnter={onOpen} onMouseLeave={onScheduleClose} />
    </li>
  )
}

/* --------------------------------------------------------------- Mega menu */

function MegaMenu({
  item,
  open,
  onMouseEnter,
  onMouseLeave,
}: {
  item: NavItem
  open: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  if (!item.megaMenu) return null

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'absolute inset-x-0 top-full origin-top px-6 pt-3',
        'transition-[opacity,transform] duration-300 ease-[var(--ease-out-expo)]',
        open
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      <div className="container-page">
        <div className="overflow-hidden rounded-3xl border border-hairline bg-white/95 shadow-lift backdrop-blur-xl">
          <div className="grid gap-8 p-8 lg:grid-cols-[1fr_1fr_1fr_1fr_0.85fr]">
            {item.megaMenu.columns.map((column) => (
              <div key={column.heading}>
                <p className="mb-4 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                  {column.heading}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group/link block rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-brand-50"
                      >
                        <span className="flex items-center gap-1.5 font-sans text-[0.8125rem] font-bold text-ink-800 transition-colors group-hover/link:text-brand-900">
                          {link.label}
                          <ArrowRight
                            aria-hidden
                            className="size-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover/link:translate-x-0 group-hover/link:opacity-100"
                          />
                        </span>
                        {link.description && (
                          <span className="mt-0.5 block font-sans text-[0.75rem] leading-snug text-ink-400">
                            {link.description}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {item.megaMenu.feature && (
              <Link
                href={item.megaMenu.feature.href}
                className="group/feature relative flex flex-col justify-between overflow-hidden rounded-2xl bg-brand-950 p-6 text-white transition-transform duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1"
              >
                <div
                  aria-hidden
                  className="absolute -top-16 -right-16 size-40 rounded-full bg-gold-500/25 blur-3xl transition-opacity duration-500 group-hover/feature:opacity-70"
                />
                <div className="relative">
                  <Sparkles aria-hidden className="mb-3 size-6 text-gold-400" />
                  <p className="font-sans text-base font-extrabold">{item.megaMenu.feature.title}</p>
                  <p className="mt-2 font-sans text-[0.8125rem] leading-relaxed text-white/70">
                    {item.megaMenu.feature.body}
                  </p>
                </div>
                <span className="relative mt-5 inline-flex items-center gap-1.5 font-sans text-[0.8125rem] font-bold text-gold-400">
                  {item.megaMenu.feature.cta}
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform duration-300 group-hover/feature:translate-x-1"
                  />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ Mobile sheet */

function MobileMenu({
  isActive,
  campaign,
}: {
  isActive: (href: string) => boolean
  campaign: Campaign
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-90 bg-ink-950/50 backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 right-0 z-100 flex w-[min(23rem,90vw)] flex-col bg-white shadow-2xl',
          'data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right',
        )}
      >
        <Dialog.Title className="sr-only">Site navigation</Dialog.Title>
        <Dialog.Description className="sr-only">
          Browse courses, blog articles and institute pages.
        </Dialog.Description>

        <div className="flex items-center justify-between border-b border-hairline p-5">
          <Logo />
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close menu">
              <X aria-hidden />
            </Button>
          </Dialog.Close>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          <Badge variant="gold" size="md" className="mb-5">
            {campaign.emoji} {campaign.discountPercent}% OFF — ends{' '}
            {formatDayMonthLong(campaign.deadline)}
          </Badge>

          <ul className="flex flex-col gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Dialog.Close asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 font-sans text-[0.9375rem] font-bold transition-colors',
                      isActive(item.href)
                        ? 'bg-brand-50 text-brand-900'
                        : 'text-ink-700 hover:bg-ink-50',
                    )}
                  >
                    {item.label}
                    <ArrowRight aria-hidden className="size-4 text-ink-300" />
                  </Link>
                </Dialog.Close>

                {item.megaMenu && (
                  <ul className="mt-1 mb-2 ml-4 flex flex-col gap-0.5 border-l border-hairline pl-3">
                    {item.megaMenu.columns.flatMap((column) =>
                      column.links.map((link) => (
                        <li key={link.href}>
                          <Dialog.Close asChild>
                            <Link
                              href={link.href}
                              className="block rounded-lg px-3 py-2 font-sans text-[0.8125rem] font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-brand-800"
                            >
                              {link.label}
                            </Link>
                          </Dialog.Close>
                        </li>
                      )),
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-2.5 border-t border-hairline p-5">
          <Dialog.Close asChild>
            <Button asChild variant="gold" size="lg">
              <Link href="/contact#enroll">
                Enroll Now — 50% OFF
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </Dialog.Close>
          <Button asChild variant="outline" size="lg">
            <a href={`tel:${contactInfo.phoneHref}`}>
              <Phone aria-hidden />
              {contactInfo.phone}
            </a>
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}
