export type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

/**
 * Shared by the server (to render the initial values into the HTML) and the
 * client (to tick every second). Deliberately lives outside the `'use client'`
 * boundary so both runtimes can import it.
 */
export function computeTimeLeft(deadlineMs: number, nowMs: number): TimeLeft {
  const diff = Math.max(0, deadlineMs - nowMs)
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  }
}
