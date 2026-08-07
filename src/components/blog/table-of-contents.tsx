'use client'

import * as React from 'react'
import { List } from 'lucide-react'

import type { TocItem } from '@/lib/blog'
import { cn } from '@/lib/utils'

/**
 * Sticky table of contents with scroll-spy.
 *
 * Uses a single IntersectionObserver over all headings rather than a scroll
 * listener, so it costs nothing on the main thread while scrolling.
 */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = React.useState<string>(items[0]?.id ?? '')

  React.useEffect(() => {
    if (items.length === 0) return

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible[0]) {
          setActiveId(visible[0].target.id)
          return
        }

        // Nothing visible: fall back to the last heading scrolled past.
        const scrolledPast = headings.filter((h) => h.getBoundingClientRect().top < 120)
        const last = scrolledPast[scrolledPast.length - 1]
        if (last) setActiveId(last.id)
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
    )

    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [items])

  if (items.length < 3) return null

  return (
    <nav aria-labelledby="toc-heading" className="rounded-2xl border border-hairline bg-white p-5 shadow-soft">
      <h2
        id="toc-heading"
        className="flex items-center gap-2 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase"
      >
        <List aria-hidden className="size-3.5" />
        On this page
      </h2>

      <ul className="mt-4 max-h-[60vh] overflow-y-auto overscroll-contain">
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'block border-l-2 py-1.5 font-sans text-[0.8125rem] leading-snug transition-all duration-200',
                  item.level === 3 ? 'pl-6' : 'pl-3.5 font-semibold',
                  isActive
                    ? 'border-brand-700 text-brand-800'
                    : 'border-hairline text-ink-500 hover:border-ink-300 hover:text-ink-800',
                )}
              >
                {item.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
