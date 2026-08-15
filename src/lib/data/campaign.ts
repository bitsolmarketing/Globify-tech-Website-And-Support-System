import 'server-only'

import { cache } from 'react'
import { eq } from 'drizzle-orm'

import { getDb } from '@/db'
import { campaignSettings } from '@/db/schema'
import { campaign as seedCampaign, getCampaignDeadline, type CampaignSettings } from '@/lib/site'

import { dbRead, TAGS } from './cache'

/** The singleton row id — there is only ever one campaign. */
export const CAMPAIGN_ID = 'default'

export type Campaign = CampaignSettings & {
  /** Resolved: the admin's explicit deadline, else the rolling 14-August rule. */
  deadline: Date
  /** True when an admin pinned the date rather than using the rolling rule. */
  deadlineIsPinned: boolean
}

function resolve(settings: CampaignSettings, pinned: Date | null): Campaign {
  return {
    ...settings,
    deadline: pinned ?? getCampaignDeadline(new Date(), settings.timezoneOffset),
    deadlineIsPinned: pinned !== null,
  }
}

/**
 * Puts the pinned deadline back together after a trip through the data cache.
 *
 * `unstable_cache` persists what it stores as JSON, and JSON has no date type.
 * The driver hands this column over as a `Date`, `JSON.stringify` turns it into
 * an ISO string, and nothing turns it back — so the value is a real `Date` on
 * the first, uncached call and a `string` on every cache *hit* after it, while
 * drizzle's types promise `Date` throughout. TypeScript cannot see the seam,
 * because the lie is introduced at runtime by the cache rather than by any code
 * either side of it.
 *
 * That gap took the public site down. A `null` deadline is never affected —
 * `resolve` builds a fresh `Date` from the rolling 14-August rule, which never
 * goes near the cache — so the bug stayed invisible for as long as nobody had
 * pinned a date. The moment one was pinned in the admin, every page that calls a
 * `Date` method on the result rather than passing it to one of the `string |
 * Date` formatters in `lib/utils.ts` began throwing `deadline.getTime is not a
 * function`: the homepage, /courses, every course detail page, /success-stories,
 * /why-choose-us and the admin dashboard. The pages that merely *format* the
 * deadline kept working, which is what made it look like a handful of unrelated
 * pages rather than one value.
 *
 * Reviving it here rather than at each call site is deliberate: this is the one
 * place the cached row becomes a `Campaign`, so it is the only place that has to
 * be right, and every consumer gets the `Date` its types already claim.
 */
function revivePinnedDeadline(value: Date | string | null): Date | null {
  if (value === null) return null

  const date = value instanceof Date ? value : new Date(value)

  /* An unparseable string would otherwise propagate as an `Invalid Date`, which
     fails later and somewhere less obvious — `toISOString` throws, `getTime`
     returns NaN and the countdown silently renders zeros. Falling back to the
     rolling rule keeps the offer coherent instead. */
  return Number.isNaN(date.getTime()) ? null : date
}

const load = dbRead({
  key: 'campaign',
  tags: [TAGS.campaign],
  load: async () => {
    const [row] = await getDb()
      .select()
      .from(campaignSettings)
      .where(eq(campaignSettings.id, CAMPAIGN_ID))
      .limit(1)

    return row ?? null
  },
  fallback: () => null,
})

export const getCampaign = cache(async (): Promise<Campaign> => {
  const row = await load()
  if (!row) return resolve(seedCampaign, null)

  const { id: _id, deadline, updatedAt: _updatedAt, ...settings } = row
  return resolve(settings, revivePinnedDeadline(deadline))
})

/** Whole days left before the offer closes — used by the admin dashboard. */
export function daysRemaining(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000))
}
