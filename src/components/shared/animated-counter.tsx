'use client'

import * as React from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

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
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduceMotion = useReducedMotion()

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

  React.useEffect(() => {
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
  }, [inView, reduceMotion, value, duration, format])

  return (
    <span ref={ref} className={className}>
      {prefix}
      <span className="tabular-nums">{display}</span>
      {suffix}
    </span>
  )
}
