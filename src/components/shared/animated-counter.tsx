'use client'

import * as React from 'react'

type Props = {
  value: number
  suffix?: string
  prefix?: string
  duration?: number
  decimals?: number
  className?: string
}

/**
 * Counts up when scrolled into view. The final value is rendered on the server
 * and in the initial HTML, so the number is present for crawlers and for users
 * with JavaScript disabled — the animation only ever replaces it.
 *
 * Uses a bare IntersectionObserver and `matchMedia` rather than framer-motion's
 * `useInView`/`useReducedMotion`. Those two hooks were the last thing on the
 * public site pulling in framer-motion, and a counter is not worth a ~35 KB
 * animation runtime in every visitor's bundle. The scroll reveals moved to CSS
 * scroll-driven animations at the same time; between them the dependency is
 * gone from the client entirely.
 */
export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 1600,
  decimals,
  className,
}: Props) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [inView, setInView] = React.useState(false)

  const fractionDigits = decimals ?? (Number.isInteger(value) ? 0 : 1)
  const format = React.useCallback(
    (n: number) =>
      n.toLocaleString('en-US', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }),
    [fractionDigits],
  )

  const [display, setDisplay] = React.useState(() => format(value))

  /* One observer, disconnected the moment it fires: the count-up runs once and
     never needs to know about the element again. */
  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const reduceMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!inView || reduceMotion) {
      setDisplay(format(value))
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      // easeOutExpo — fast start, gentle settle
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(format(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration, format])

  return (
    <span ref={ref} className={className}>
      {prefix}
      <span className="tabular-nums">{display}</span>
      {suffix}
    </span>
  )
}
