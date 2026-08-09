import { Bot, Globe, Instagram, MessageCircle, MessageSquare, UserPlus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { LeadChannel, LeadRow } from '@/db/schema'
import { cn } from '@/lib/utils'

/**
 * How each channel presents itself in the inbox.
 *
 * Colours are the ones people already associate with the products — WhatsApp
 * green, Messenger blue, Instagram magenta — because in a mixed list the colour
 * is what the eye sorts by before it reads a word.
 */
const CHANNELS: Record<LeadChannel, { label: string; icon: typeof Globe; className: string }> = {
  website: {
    label: 'Website form',
    icon: Globe,
    className: 'bg-ink-100 text-ink-700 ring-1 ring-ink-200 ring-inset',
  },
  chatbot: {
    label: 'AI assistant',
    icon: Bot,
    className: 'bg-brand-50 text-brand-800 ring-1 ring-brand-200/70 ring-inset',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    className: 'bg-[#25D366]/12 text-[#0b6b33] ring-1 ring-[#25D366]/40 ring-inset',
  },
  messenger: {
    label: 'Messenger',
    icon: MessageSquare,
    className: 'bg-[#0084FF]/10 text-[#0a4d8c] ring-1 ring-[#0084FF]/35 ring-inset',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    className: 'bg-[#E1306C]/10 text-[#a3164a] ring-1 ring-[#E1306C]/30 ring-inset',
  },
  manual: {
    label: 'Added by hand',
    icon: UserPlus,
    className: 'bg-ink-100 text-ink-700 ring-1 ring-ink-200 ring-inset',
  },
}

export function channelLabel(channel: LeadChannel): string {
  return CHANNELS[channel]?.label ?? channel
}

export function ChannelBadge({
  channel,
  className,
}: {
  channel: LeadChannel
  className?: string
}) {
  const meta = CHANNELS[channel] ?? CHANNELS.website
  const Icon = meta.icon

  return (
    <Badge size="md" className={cn(meta.className, className)}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  )
}

/**
 * What to call someone in a list.
 *
 * A form submission always has a name. A WhatsApp message has one only if the
 * sender publishes a profile name, and a Messenger or Instagram message has
 * nothing but an opaque id. Falling back through what is actually known beats
 * printing an empty cell, and the id is still a handle a person can search for.
 */
export function leadDisplayName(lead: Pick<LeadRow, 'name' | 'handle' | 'email'>): string {
  const named = lead.name?.trim()
  if (named) return named

  const handle = lead.handle?.trim()
  if (handle) return handle

  return lead.email?.trim() || 'Unknown sender'
}
