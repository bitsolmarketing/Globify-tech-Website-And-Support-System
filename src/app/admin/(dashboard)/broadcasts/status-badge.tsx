import {
  Ban,
  CheckCircle2,
  Clock,
  FileEdit,
  PauseCircle,
  Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { BroadcastStatus } from '@/db/schema'

/**
 * The status is the first thing anyone looks for on this screen, so it carries
 * a colour and an icon rather than being a word in a row of words. `sending`
 * is the only one that animates: it is the only one that will change on its
 * own, and a spinner is how a list says "come back to this" without a refresh.
 */
const STATUSES: Record<
  BroadcastStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  draft: {
    label: 'Draft',
    icon: FileEdit,
    className: 'bg-ink-100 text-ink-700 ring-1 ring-ink-200 ring-inset',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    className: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200/70 ring-inset',
  },
  sending: {
    label: 'Sending',
    icon: Send,
    className: 'bg-[#25D366]/12 text-[#0b6b33] ring-1 ring-[#25D366]/40 ring-inset',
  },
  paused: {
    label: 'Paused',
    icon: PauseCircle,
    className: 'bg-gold-50 text-gold-800 ring-1 ring-gold-300/70 ring-inset',
  },
  completed: {
    label: 'Sent',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 ring-inset',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    className: 'bg-red-50 text-red-700 ring-1 ring-red-200 ring-inset',
  },
}

export function BroadcastStatusBadge({
  status,
  size = 'md',
}: {
  status: BroadcastStatus
  size?: 'sm' | 'md' | 'lg'
}) {
  const meta = STATUSES[status] ?? STATUSES.draft
  const Icon = meta.icon

  return (
    <Badge size={size} className={meta.className}>
      <Icon aria-hidden className={status === 'sending' ? 'animate-pulse' : undefined} />
      {meta.label}
    </Badge>
  )
}
