'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  FormSection,
  SaveButton,
  TextField,
  TextareaField,
} from '@/components/admin/form-fields'
import { FieldHint } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { campaignFormSchema, type CampaignFormValues } from '@/lib/admin/schemas'
import type { ActionResult } from '@/lib/admin/guard'

export function CampaignForm({
  defaultValues,
  onSubmitAction,
}: {
  defaultValues: CampaignFormValues
  onSubmitAction: (values: CampaignFormValues) => Promise<ActionResult>
}) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    mode: 'onBlur',
    defaultValues,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await onSubmitAction(values)

    if (!result.ok) {
      toast.error('Could not save the campaign', { description: result.error })
      return
    }

    toast.success('Campaign updated', {
      description: 'Prices, countdowns and badges across the site will refresh.',
    })
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-6 pb-24">
      <FormSection title="The offer" description="Discount, coupon and seat availability.">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            label="Discount %"
            required
            type="number"
            min={0}
            max={100}
            error={errors.discountPercent?.message}
            {...register('discountPercent')}
          />
          <TextField
            label="Coupon code"
            required
            placeholder="AZADI50"
            error={errors.couponCode?.message}
            {...register('couponCode')}
          />
          <TextField
            label="Emoji"
            required
            placeholder="🇵🇰"
            error={errors.emoji?.message}
            {...register('emoji')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Seats total"
            required
            type="number"
            min={1}
            error={errors.seatsTotal?.message}
            {...register('seatsTotal')}
          />
          <TextField
            label="Seats remaining"
            required
            type="number"
            min={0}
            hint="Drives the scarcity bar in the hero."
            error={errors.seatsRemaining?.message}
            {...register('seatsRemaining')}
          />
        </div>
      </FormSection>

      <FormSection
        title="Deadline"
        description="Leave the date blank to keep the rolling 14 August rule, which rolls to next year automatically once the date passes."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Pinned deadline"
            type="date"
            hint="Closes at 23:59:59 in the offset below."
            error={errors.deadline?.message}
            {...register('deadline')}
          />
          <TextField
            label="Timezone offset"
            required
            placeholder="+05:00"
            error={errors.timezoneOffset?.message}
            {...register('timezoneOffset')}
          />
        </div>
      </FormSection>

      <FormSection title="Copy" description="Used in the hero, the announcement bar and schema.">
        <TextField
          label="Campaign name"
          required
          placeholder="14 August Azadi Sale"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Headline"
          required
          error={errors.headline?.message}
          {...register('headline')}
        />
        <TextareaField
          label="Subheadline"
          required
          rows={3}
          error={errors.subheadline?.message}
          {...register('subheadline')}
        />
        <FieldHint>
          Course fees are stored undiscounted; every price on the site is derived from the discount
          percent above, so changing it reprices the whole catalogue at once.
        </FieldHint>
      </FormSection>

      <div className="flex justify-end">
        <SaveButton saving={isSubmitting}>Save campaign</SaveButton>
      </div>
    </form>
  )
}
