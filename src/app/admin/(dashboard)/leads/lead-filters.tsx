'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/field'
import { channelLabel } from '@/components/admin/channel-badge'
import { LEAD_CHANNELS, LEAD_STATUSES } from '@/db/schema'

/**
 * Filters live in the URL rather than component state: the table is rendered
 * on the server, and a shareable/bookmarkable link is what an admin actually
 * wants when passing a filtered view to a colleague.
 */
export function LeadFilters({
  courseOptions,
}: {
  courseOptions: { value: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fieldId = React.useId()

  const search = searchParams.get('search') ?? ''
  const course = searchParams.get('course') ?? ''
  const status = searchParams.get('status') ?? ''
  const channel = searchParams.get('channel') ?? ''

  const [draft, setDraft] = React.useState(search)
  React.useEffect(() => setDraft(search), [search])

  const push = React.useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, value)
        else params.delete(key)
      }

      router.push(params.size > 0 ? `${pathname}?${params}` : pathname)
    },
    [pathname, router, searchParams],
  )

  const hasFilters = Boolean(search || course || status || channel)

  return (
    <Card className="mb-6 p-5">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          push({ search: draft.trim() })
        }}
        className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-search`}>Search</Label>
          <Input
            id={`${fieldId}-search`}
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Name, email, phone, handle or message"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-channel`}>Channel</Label>
          <Select
            id={`${fieldId}-channel`}
            value={channel}
            onChange={(event) => push({ channel: event.target.value })}
            options={[
              { value: '', label: 'All channels' },
              ...LEAD_CHANNELS.map((value) => ({ value, label: channelLabel(value) })),
            ]}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-course`}>Course</Label>
          <Select
            id={`${fieldId}-course`}
            value={course}
            onChange={(event) => push({ course: event.target.value })}
            options={[{ value: '', label: 'All courses' }, ...courseOptions]}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-status`}>Status</Label>
          <Select
            id={`${fieldId}-status`}
            value={status}
            onChange={(event) => push({ status: event.target.value })}
            options={[
              { value: '', label: 'All statuses' },
              ...LEAD_STATUSES.map((value) => ({
                value,
                label: value.charAt(0).toUpperCase() + value.slice(1),
              })),
            ]}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md">
            <Search aria-hidden />
            Search
          </Button>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setDraft('')
                router.push(pathname)
              }}
            >
              <X aria-hidden />
              Clear
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
