import type { RecipientTotals } from '@/lib/data/broadcasts'
import { cn } from '@/lib/utils'

/**
 * Four outcomes in one bar, in the order they matter to the person reading it:
 * delivered, still to go, deliberately skipped, failed.
 *
 * Skipped and failed are kept visually distinct on purpose. A skipped recipient
 * is the system working — they opted out, or free text could not legally reach
 * them — while a failed one is something to look at. Rendering both in red
 * would send an admin hunting for a fault in a send that went exactly right.
 */
export function BroadcastProgress({
  totals,
  className,
}: {
  totals: RecipientTotals
  className?: string
}) {
  const total = Math.max(1, totals.total)
  const segments = [
    { key: 'sent', value: totals.sent, className: 'bg-emerald-500' },
    { key: 'inflight', value: totals.queued + totals.sending, className: 'bg-ink-200' },
    { key: 'skipped', value: totals.skipped, className: 'bg-gold-400' },
    { key: 'failed', value: totals.failed, className: 'bg-red-500' },
  ]

  const percent = Math.round((totals.sent / total) * 100)

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-ink-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${totals.sent} of ${totals.total} sent`}
      >
        {segments.map((segment) =>
          segment.value > 0 ? (
            <span
              key={segment.key}
              className={cn('h-full transition-[width] duration-500', segment.className)}
              style={{ width: `${(segment.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <p className="font-sans text-xs text-ink-500">
        <span className="font-bold text-ink-800">{totals.sent}</span> of {totals.total} sent
        {totals.queued + totals.sending > 0 && ` · ${totals.queued + totals.sending} to go`}
        {totals.skipped > 0 && ` · ${totals.skipped} skipped`}
        {totals.failed > 0 && ` · ${totals.failed} failed`}
      </p>
    </div>
  )
}
