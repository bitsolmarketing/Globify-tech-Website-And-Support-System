import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { isDatabaseConfigured } from '@/db'
import { daysRemaining, getCampaign } from '@/lib/data/campaign'
import { formatDate } from '@/lib/utils'

import { updateCampaign } from './actions'
import { CampaignForm } from './campaign-form'

export const metadata: Metadata = { title: 'Campaign' }

export default async function AdminCampaignPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminPageHeader title="Campaign settings" />
        <EmptyState
          title="No database configured"
          description="Campaign settings live in Postgres. Set DATABASE_URL, run the migration and seed before editing them."
        />
      </>
    )
  }

  const campaign = await getCampaign()

  return (
    <>
      <AdminPageHeader
        title="Campaign settings"
        description="These values drive every price, countdown and offer badge on the public site."
        actions={
          <Badge variant={campaign.deadlineIsPinned ? 'brand' : 'neutral'} size="lg">
            {daysRemaining(campaign.deadline)} days left ·{' '}
            {campaign.deadlineIsPinned ? 'pinned' : 'rolling'} {formatDate(campaign.deadline)}
          </Badge>
        }
      />

      <CampaignForm
        onSubmitAction={updateCampaign}
        defaultValues={{
          name: campaign.name,
          emoji: campaign.emoji,
          discountPercent: campaign.discountPercent,
          headline: campaign.headline,
          subheadline: campaign.subheadline,
          couponCode: campaign.couponCode,
          timezoneOffset: campaign.timezoneOffset,
          seatsTotal: campaign.seatsTotal,
          seatsRemaining: campaign.seatsRemaining,
          deadline: campaign.deadlineIsPinned
            ? campaign.deadline.toISOString().slice(0, 10)
            : '',
        }}
      />
    </>
  )
}
