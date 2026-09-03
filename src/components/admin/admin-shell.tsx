'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  CalendarClock,
  GraduationCap,
  IdCard,
  Images,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquareQuote,
  Newspaper,
  PanelLeftClose,
  Users,
  UsersRound,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Enquiries',
    items: [
      { href: '/admin/leads', label: 'Leads', icon: Users },
      { href: '/admin/subscribers', label: 'Subscribers', icon: Mail },
    ],
  },
  {
    /* Its own group rather than an item under Enquiries. Everything there is
       inbound and safe to browse; this one sends, to hundreds of people, and
       putting it a click away from "Leads" is how it gets opened by accident. */
    heading: 'Outbound',
    items: [{ href: '/admin/broadcasts', label: 'WhatsApp broadcasts', icon: Megaphone }],
  },
  {
    /* The LMS. Separate from Content because these rows are about people and
       delivery — who is enrolled, who teaches — not about what the marketing
       site publishes. */
    heading: 'Learning portal',
    items: [
      { href: '/admin/batches', label: 'Batches', icon: GraduationCap },
      { href: '/admin/portal-users', label: 'Portal accounts', icon: IdCard },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: '/admin/courses', label: 'Courses', icon: BookOpen },
      { href: '/admin/posts', label: 'Blog posts', icon: Newspaper },
      { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      { href: '/admin/faqs', label: 'FAQs', icon: MessageSquareQuote },
      { href: '/admin/gallery', label: 'Gallery', icon: Images },
      { href: '/admin/authors', label: 'Authors', icon: UsersRound },
    ],
  },
  {
    heading: 'Settings',
    items: [{ href: '/admin/campaign', label: 'Campaign', icon: CalendarClock }],
  },
]

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

export function AdminShell({
  user,
  signOutAction,
  children,
}: {
  user: { name?: string | null; email?: string | null }
  /** Server action — keeps the sign-out POST out of the client bundle. */
  signOutAction: () => Promise<void>
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => setMobileOpen(false), [pathname])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link href="/admin" className="font-sans text-sm font-extrabold tracking-tight text-white">
          Globify <span className="text-gold-400">Admin</span>
        </Link>
        <Button
          variant="ghost-light"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          <X aria-hidden />
        </Button>
      </div>

      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 py-5">
        {NAV.map((group) => (
          <div key={group.heading} className="mb-6 last:mb-0">
            <p className="px-3 pb-2 font-sans text-[0.625rem] font-bold tracking-[0.14em] text-white/35 uppercase">
              {group.heading}
            </p>
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item.href)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-sm font-semibold transition-colors',
                        active
                          ? 'bg-white/12 text-white'
                          : 'text-white/60 hover:bg-white/6 hover:text-white',
                      )}
                    >
                      <Icon aria-hidden className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate font-sans text-[0.8125rem] font-bold text-white">
          {user.name ?? 'Administrator'}
        </p>
        <p className="truncate font-sans text-xs text-white/45">{user.email}</p>

        <form action={signOutAction} className="mt-3">
          <Button type="submit" variant="ghost-light" size="sm" className="w-full justify-start">
            <LogOut aria-hidden />
            Sign out
          </Button>
        </form>

        <Link
          href="/"
          target="_blank"
          rel="noopener"
          className="mt-2 flex items-center gap-2 rounded-lg px-3.5 py-2 font-sans text-[0.8125rem] font-semibold text-white/50 transition-colors hover:bg-white/6 hover:text-white"
        >
          <PanelLeftClose aria-hidden className="size-4" />
          View public site
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ------------------------------------------------------ Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-brand-950 lg:block">
        {sidebar}
      </aside>

      {/* ------------------------------------------------------ Mobile sheet */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 animate-fade-in bg-ink-950/50 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 animate-slide-in-right bg-brand-950 lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:hidden">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
          <span className="font-sans text-sm font-extrabold text-brand-900">Globify Admin</span>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
