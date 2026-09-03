'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { PortalRole } from '@/db/schema'
import { cn } from '@/lib/utils'

/**
 * The frame for both wings of the learning portal.
 *
 * One component, two navigations. Students and instructors do different work
 * but they are the same *kind* of user — signed in, working through a cohort,
 * on a phone as often as a laptop — so giving them two shells would mean two
 * places to fix every layout bug. The role picks the menu and the accent; the
 * chrome around it is shared.
 *
 * Structurally a sibling of `AdminShell` rather than a reuse of it: the admin
 * rail is a fixed list of content sections, and this one is derived from who
 * is signed in.
 */

type NavItem = { href: string; label: string; icon: LucideIcon }
type NavGroup = { heading: string; items: NavItem[] }

const STUDENT_NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ href: '/student', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Learning',
    items: [
      { href: '/student/courses', label: 'My courses', icon: BookOpen },
      { href: '/student/assignments', label: 'Assignments', icon: ClipboardList },
      { href: '/student/quizzes', label: 'Quizzes', icon: ListChecks },
    ],
  },
  {
    heading: 'My record',
    items: [
      { href: '/student/attendance', label: 'Attendance', icon: CalendarDays },
      { href: '/student/grades', label: 'Grades', icon: GraduationCap },
      { href: '/student/certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/student/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/student/profile', label: 'Profile', icon: UserRound },
    ],
  },
]

const INSTRUCTOR_NAV: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ href: '/instructor', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Teaching',
    items: [
      { href: '/instructor/batches', label: 'Batches', icon: Users },
      { href: '/instructor/assignments', label: 'Assignments', icon: ClipboardList },
      { href: '/instructor/quizzes', label: 'Quizzes', icon: ListChecks },
    ],
  },
  {
    heading: 'Cohort',
    items: [
      { href: '/instructor/attendance', label: 'Attendance', icon: ClipboardCheck },
      { href: '/instructor/certificates', label: 'Certificates', icon: Award },
    ],
  },
  {
    heading: 'Account',
    items: [
      { href: '/instructor/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/instructor/profile', label: 'Profile', icon: UserRound },
    ],
  },
]

const ROLE: Record<
  PortalRole,
  { nav: NavGroup[]; home: string; word: string; accent: string; navLabel: string }
> = {
  student: {
    nav: STUDENT_NAV,
    home: '/student',
    word: 'Learn',
    accent: 'text-gold-400',
    navLabel: 'Student sections',
  },
  instructor: {
    nav: INSTRUCTOR_NAV,
    home: '/instructor',
    word: 'Teach',
    accent: 'text-emerald-300',
    navLabel: 'Instructor sections',
  },
}

/**
 * A dashboard link matches only itself; every other link matches its subtree.
 *
 * Without the special case `/student` is a prefix of `/student/courses` and the
 * dashboard would stay highlighted on every page in the portal.
 */
function isActive(pathname: string, href: string, home: string): boolean {
  return href === home ? pathname === home : pathname.startsWith(href)
}

export function PortalShell({
  user,
  role,
  signOutAction,
  children,
}: {
  user: { name?: string | null; email?: string | null }
  role: PortalRole
  /** Server action — keeps the sign-out POST out of the client bundle. */
  signOutAction: () => Promise<void>
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const config = ROLE[role]

  React.useEffect(() => setMobileOpen(false), [pathname])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <Link
          href={config.home}
          className="font-sans text-sm font-extrabold tracking-tight text-white"
        >
          Globify <span className={config.accent}>{config.word}</span>
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

      <nav aria-label={config.navLabel} className="flex-1 overflow-y-auto px-3 py-5">
        {config.nav.map((group) => (
          <div key={group.heading} className="mb-6 last:mb-0">
            <p className="px-3 pb-2 font-sans text-[0.625rem] font-bold tracking-[0.14em] text-white/35 uppercase">
              {group.heading}
            </p>
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item.href, config.home)

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
          {user.name ?? 'Signed in'}
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
          <span className="font-sans text-sm font-extrabold text-brand-900">
            Globify {config.word}
          </span>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
