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
  return resolve(settings, deadline)
})

/** Whole days left before the offer closes — used by the admin dashboard. */
export function daysRemaining(deadline: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000))
}
