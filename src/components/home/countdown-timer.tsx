'use client'

import * as React from 'react'

import { computeTimeLeft, type TimeLeft } from '@/lib/countdown'
import { cn } from '@/lib/utils'

type Props = {
  /** ISO deadline, computed once on the server. */
  deadline: string
  /** Server-rendered starting values — keeps SSR and hydration byte-identical. */
  initial: TimeLeft
  tone?: 'light' | 'dark'
  className?: string
  compact?: boolean
}

const UNITS: { key: keyof TimeLeft; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
]

/**
 * Course discount countdown.
 *
 * The server renders real values and passes them in as `initial`, so the first
 * client render matches the HTML exactly — no hydration warning, no layout
 * shift, and the numbers are visible even before JavaScript executes.
 */
export function CountdownTimer({ deadline, initial, tone = 'light', className, compact }: Props) {
  const deadlineMs = React.useMemo(() => new Date(deadline).getTime(), [deadline])
  const [timeLeft, setTimeLeft] = React.useState<TimeLeft>(initial)

  React.useEffect(() => {
    const update = () => setTimeLeft(computeTimeLeft(deadlineMs, Date.now()))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [deadlineMs])

  const isLight = tone === 'light'
  const expired =
    timeLeft.days === 0 &&
    timeLeft.hours === 0 &&
    timeLeft.minutes === 0 &&
    timeLeft.seconds === 0

  return (
    <div
      className={cn('flex items-stretch', compact ? 'gap-2' : 'gap-2.5 sm:gap-3', className)}
      role="timer"
      aria-live="off"
      aria-label={
        expired
          ? 'The offer has ended'
          : `Offer ends in ${timeLeft.days} days, ${timeLeft.hours} hours and ${timeLeft.minutes} minutes`
      }
    >
      {UNITS.map(({ key, label }) => (
        <div
          key={key}
          className={cn(
            'flex flex-1 flex-col items-center justify-center rounded-2xl border backdrop-blur-md',
            compact ? 'min-w-14 px-2 py-2' : 'min-w-16 px-3 py-3 sm:min-w-20 sm:px-4 sm:py-3.5',
            isLight
              ? 'border-white/15 bg-white/10 text-white'
              : 'border-hairline bg-white text-ink-900 shadow-soft',
          )}
        >
          <span
            className={cn(
              'font-sans leading-none font-extrabold tabular-nums',
              compact ? 'text-xl' : 'text-2xl sm:text-4xl',
              isLight ? 'text-gradient-gold' : 'text-brand-900',
            )}
          >
            {String(timeLeft[key]).padStart(2, '0')}
          </span>
          <span
            className={cn(
              'mt-1 font-sans font-semibold tracking-[0.12em] uppercase',
              compact ? 'text-[0.5625rem]' : 'text-[0.625rem] sm:text-[0.6875rem]',
              isLight ? 'text-white/55' : 'text-ink-400',
            )}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
