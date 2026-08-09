'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import { ChannelBadge, leadDisplayName } from '@/components/admin/channel-badge'
import { DeleteButton } from '@/components/admin/delete-button'
import { Select } from '@/components/ui/field'
import { Td, Tr } from '@/components/admin/table'
import { toast } from '@/components/ui/toaster'
import { LEAD_STATUSES, type LeadRow, type LeadStatus } from '@/db/schema'
import { formatDate } from '@/lib/utils'

import { removeLead, updateLeadStatus } from './actions'

const STATUS_OPTIONS = LEAD_STATUSES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

export function LeadTableRow({ lead }: { lead: LeadRow }) {
  const router = useRouter()
  const [expanded, setExpanded] = React.useState(false)
  const [status, setStatus] = React.useState<LeadStatus>(lead.status)
  const [pending, startTransition] = React.useTransition()

  const displayName = leadDisplayName(lead)

  function onStatusChange(next: LeadStatus) {
    const previous = status
    setStatus(next)

    startTransition(async () => {
      const result = await updateLeadStatus(lead.id, next)

      if (!result.ok) {
        setStatus(previous)
        toast.error('Could not update status', { description: result.error })
        return
      }

      toast.success(`${displayName} marked ${next}`)
      router.refresh()
    })
  }

  return (
    <>
      <Tr>
        <Td>
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="flex items-start gap-2 text-left"
          >
            <ChevronDown
              aria-hidden
              className={`mt-1 size-3.5 shrink-0 text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
            <span>
              <span className="block font-semibold text-ink-900">{displayName}</span>
              {/* Whichever identifier we actually have. A chat lead has no
                  email, and printing nothing there reads as missing data
                  rather than as a channel that does not collect it. */}
              <span className="block font-sans text-xs text-ink-400">
                {lead.email ?? lead.handle ?? '—'}
              </span>
            </span>
          </button>
        </Td>

        <Td className="whitespace-nowrap">
          {lead.phone ? (
            <a href={`tel:${lead.phone}`} className="hover:text-brand-800">
              {lead.phone}
            </a>
          ) : (
            <span className="text-ink-400">—</span>
          )}
        </Td>

        <Td className="hidden lg:table-cell">
          <ChannelBadge channel={lead.channel} />
        </Td>

        <Td className="hidden md:table-cell">{lead.courseTitle}</Td>

        <Td>
          {/* The select is the control; the badge would just duplicate it. */}
          <Select
            aria-label={`Status for ${lead.name}`}
            value={status}
            disabled={pending}
            onChange={(event) => onStatusChange(event.target.value as LeadStatus)}
            options={STATUS_OPTIONS}
            className="h-9 min-w-[8.5rem] text-[0.8125rem]"
          />
        </Td>

        <Td className="hidden whitespace-nowrap lg:table-cell">{formatDate(lead.createdAt)}</Td>

        <Td>
          <div className="flex justify-end">
            <DeleteButton
              label={`Delete lead from ${displayName}`}
              itemName={`Lead from ${displayName}`}
              onDelete={removeLead.bind(null, lead.id)}
            />
          </div>
        </Td>
      </Tr>

      {expanded && (
        <Tr className="hover:bg-transparent">
          <Td colSpan={7} className="bg-ink-50/60">
            <div className="grid gap-3 py-1">
              <div>
                <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
                  {lead.channel === 'website' ? 'Message' : 'Latest message'}
                </p>
                <p className="mt-1.5 max-w-3xl leading-relaxed whitespace-pre-wrap text-ink-700">
                  {lead.message ?? (
                    <span className="text-ink-400">
                      No text — the last thing they sent was an image, audio or a sticker.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-2 font-sans text-xs text-ink-500">
                <span className="lg:hidden">
                  Channel: {lead.channel}
                </span>
                <span>
                  Course slug: <span className="font-mono">{lead.courseSlug}</span>
                </span>
                {lead.handle && (
                  <span>
                    Handle: <span className="font-mono">{lead.handle}</span>
                  </span>
                )}
                <span>Source: {lead.source}</span>
                {lead.campaign && <span>Campaign: {lead.campaign}</span>}
                <span>Last message: {formatDate(lead.updatedAt)}</span>
              </div>
            </div>
          </Td>
        </Tr>
      )}
    </>
  )
}
