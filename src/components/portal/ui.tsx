import * as React from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type {
  AttendanceStatus,
  BatchStatus,
  EnrollmentStatus,
  SubmissionStatus,
} from '@/db/schema'
import { cn } from '@/lib/utils'

/**
 * The small, repeated pieces of the portal.
 *
 * Every status in this system is a string union in the schema, and each one is
 * given exactly one badge here. That is the point of the file: a mark of
 * `late` should look the same on the register, on the student's own record and
 * in the grade export, and the only way to guarantee that is for all three to
 * render the same component rather than each choosing a colour.
 */

/* ------------------------------------------------------------------- Tiles */

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = 'brand',
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  href?: string
  tone?: 'brand' | 'gold' | 'positive' | 'warn'
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-800',
    gold: 'bg-gold-50 text-gold-800',
    positive: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
  } as const

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
          {label}
        </p>
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', tones[tone])}>
          <Icon aria-hidden className="size-4" />
        </span>
      </div>

      <p className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-ink-900">{value}</p>
      {hint && <p className="mt-1 font-sans text-xs text-ink-500">{hint}</p>}
    </>
  )

  if (!href) return <Card className="p-5">{body}</Card>

  return (
    <Card className="p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift">
      <Link href={href} className="block">
        {body}
      </Link>
    </Card>
  )
}

/* ---------------------------------------------------------------- Progress */

/**
 * `role="img"` with a written label rather than a `<progress>` element.
 *
 * A screen reader announcing "62 percent" says nothing about *what* is 62% —
 * and these bars appear four to a card, where that ambiguity is the whole
 * problem. The label carries the subject.
 */
export function ProgressBar({
  value,
  label,
  tone = 'brand',
  className,
}: {
  value: number
  label: string
  tone?: 'brand' | 'positive' | 'warn' | 'danger'
  className?: string
}) {
  const tones = {
    brand: 'bg-brand-800',
    positive: 'bg-emerald-600',
    warn: 'bg-amber-500',
    danger: 'bg-red-500',
  } as const

  const clamped = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div
      role="img"
      aria-label={`${label}: ${clamped}%`}
      className={cn('h-1.5 overflow-hidden rounded-full bg-ink-100', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

/** Green when healthy, amber when slipping, red when it needs attention. */
export function toneForRate(rate: number): 'positive' | 'warn' | 'danger' {
  if (rate >= 75) return 'positive'
  if (rate >= 50) return 'warn'
  return 'danger'
}

/* ------------------------------------------------------------------ Badges */

const ATTENDANCE_BADGE: Record<
  AttendanceStatus,
  { label: string; variant: 'success' | 'neutral' | 'gold' | 'outline' }
> = {
  present: { label: 'Present', variant: 'success' },
  late: { label: 'Late', variant: 'gold' },
  absent: { label: 'Absent', variant: 'outline' },
  excused: { label: 'Excused', variant: 'neutral' },
}

export function AttendanceBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) {
    return (
      <Badge variant="outline" size="sm">
        Not marked
      </Badge>
    )
  }

  const badge = ATTENDANCE_BADGE[status]
  return (
    <Badge variant={badge.variant} size="sm">
      {badge.label}
    </Badge>
  )
}

const SUBMISSION_BADGE: Record<
  SubmissionStatus,
  { label: string; variant: 'success' | 'brand' | 'gold' }
> = {
  submitted: { label: 'Awaiting mark', variant: 'brand' },
  graded: { label: 'Marked', variant: 'success' },
  resubmit: { label: 'Resubmit', variant: 'gold' },
}

export function SubmissionBadge({ status }: { status: SubmissionStatus | null }) {
  if (!status) {
    return (
      <Badge variant="outline" size="sm">
        Not submitted
      </Badge>
    )
  }

  const badge = SUBMISSION_BADGE[status]
  return (
    <Badge variant={badge.variant} size="sm">
      {badge.label}
    </Badge>
  )
}

const BATCH_BADGE: Record<
  BatchStatus,
  { label: string; variant: 'success' | 'brand' | 'neutral' | 'outline' }
> = {
  upcoming: { label: 'Upcoming', variant: 'brand' },
  active: { label: 'Running', variant: 'success' },
  completed: { label: 'Completed', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const badge = BATCH_BADGE[status]
  return (
    <Badge variant={badge.variant} size="sm">
      {badge.label}
    </Badge>
  )
}

const ENROLLMENT_BADGE: Record<
  EnrollmentStatus,
  { label: string; variant: 'success' | 'brand' | 'outline' }
> = {
  active: { label: 'Enrolled', variant: 'brand' },
  completed: { label: 'Completed', variant: 'success' },
  dropped: { label: 'Dropped', variant: 'outline' },
}

export function EnrollmentBadge({ status }: { status: EnrollmentStatus }) {
  const badge = ENROLLMENT_BADGE[status]
  return (
    <Badge variant={badge.variant} size="sm">
      {badge.label}
    </Badge>
  )
}

/**
 * A mark, or an honest blank.
 *
 * An unmarked piece of work renders as an em dash rather than as 0 — the two
 * mean opposite things to a student looking at their own grades, and a zero
 * that turns out to be "not marked yet" is the kind of thing that generates a
 * complaint before it generates a question.
 */
export function GradePill({
  score,
  letter,
  size = 'md',
}: {
  score: number | null
  letter?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  if (score === null) {
    return <span className="font-sans text-sm text-ink-400">—</span>
  }

  const variant = score >= 75 ? 'success' : score >= 50 ? 'gold' : 'neutral'

  return (
    <Badge variant={variant} size={size}>
      {score}%{letter ? ` · ${letter}` : ''}
    </Badge>
  )
}

/* ---------------------------------------------------------------- Sections */

export function SectionHeading({
  title,
  action,
  className,
}: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <h2 className="font-sans text-lg font-bold text-ink-900">{title}</h2>
      {action}
    </div>
  )
}

/** A card-shaped "there is nothing here yet", used in place of an empty table. */
export function PortalEmpty({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <Card className="grid place-items-center gap-3 px-6 py-14 text-center">
      <h2 className="font-sans text-base font-bold text-ink-900">{title}</h2>
      {description && <p className="max-w-md text-[0.9375rem] text-ink-500">{description}</p>}
      {action}
    </Card>
  )
}

/* ------------------------------------------------------------------- Dates */

/**
 * Date *and* time, in the site's fixed `en-GB`/UTC formatting.
 *
 * Everything else on this site formats dates alone, where the helpers in
 * `lib/utils` suffice. A class at "6 March" is not enough information to turn
 * up to, so the portal needs the clock as well — and it has to render
 * identically on the server and the client, which is why the timezone is
 * pinned rather than left to the browser.
 */
const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

export function formatDateTime(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return dateTime.format(date).replace(',', '')
}

const timeOnly = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
})

export function formatTime(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return timeOnly.format(date)
}

/** "in 3 days" / "2 days ago" — the phrasing a deadline actually needs. */
export function relativeDays(target: Date, now = new Date()): string {
  const days = Math.round((target.getTime() - now.getTime()) / 86_400_000)

  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`
}

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
export function toDateTimeLocal(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}
