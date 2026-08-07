'use client'

import * as React from 'react'
import { ArrowUp } from 'lucide-react'

import { cn } from '@/lib/utils'

export function BackToTop() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setVisible(window.scrollY > 900)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn(
        'fixed right-4 bottom-38 z-70 grid size-11 place-items-center rounded-full sm:right-6 sm:bottom-40',
        'border border-hairline bg-white/90 text-ink-600 shadow-lift backdrop-blur-sm',
        'transition-all duration-400 ease-[var(--ease-out-expo)]',
        'hover:-translate-y-1 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-900',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <ArrowUp aria-hidden className="size-4.5" />
    </button>
  )
}
