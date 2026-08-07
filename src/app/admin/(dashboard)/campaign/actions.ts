'use server'

import { eq } from 'drizzle-orm'

import { getDb } from '@/db'
import { campaignSettings } from '@/db/schema'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { campaignFormSchema, type CampaignFormValues } from '@/lib/admin/schemas'
import { CAMPAIGN_ID } from '@/lib/data/campaign'
import { revalidateCampaign } from '@/lib/data/revalidate'

export async function updateCampaign(values: CampaignFormValues): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = campaignFormSchema.parse(values)

    /* An empty deadline means "use the rolling 14-August rule". A supplied date
       is pinned at 23:59:59 in the campaign's own timezone offset, matching how
       `getCampaignDeadline` builds the default. */
    const deadline =
      parsed.deadline === ''
        ? null
        : new Date(`${parsed.deadline}T23:59:59${parsed.timezoneOffset}`)

    if (deadline && Number.isNaN(deadline.getTime())) {
      throw new Error('That deadline and timezone offset do not form a valid date.')
    }

    await getDb()
      .update(campaignSettings)
      .set({
        name: parsed.name,
        emoji: parsed.emoji,
        discountPercent: parsed.discountPercent,
        headline: parsed.headline,
        subheadline: parsed.subheadline,
        couponCode: parsed.couponCode,
        timezoneOffset: parsed.timezoneOffset,
        seatsTotal: parsed.seatsTotal,
        seatsRemaining: parsed.seatsRemaining,
        deadline,
        updatedAt: new Date(),
      })
      .where(eq(campaignSettings.id, CAMPAIGN_ID))

    /* Prices, countdowns and badges appear on every page, so this sweeps the
       whole tree — see the note in `revalidate.ts`. */
    revalidateCampaign()
  })
}
