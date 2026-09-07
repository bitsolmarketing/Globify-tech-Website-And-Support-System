import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'

import { createPlan } from '../actions'
import { planFields } from '../fields'
import { PlanForm } from '../plan-form'

export const metadata: Metadata = { title: 'New plan' }

export default function NewPlanPage() {
  return (
    <>
      <AdminPageHeader title="New plan" backHref="/admin/plans" backLabel="All plans" />

      <PlanForm
        fields={planFields}
        sectionTitle="Plan details"
        sectionDescription="Appears on /pricing and in the checkout summary. Nothing is charged automatically — students pay by transfer and an admin confirms it."
        defaultValues={{
          slug: '',
          name: '',
          tagline: '',
          description: '',
          price: 0,
          compareAtPrice: '',
          interval: 'monthly',
          features: '',
          badge: '',
          featured: false,
          /* New plans start hidden. A half-written plan appearing on the public
             pricing page the moment it is saved is not a useful default. */
          active: false,
        }}
        onSubmitAction={createPlan}
        cancelHref="/admin/plans"
        submitLabel="Create plan"
        successMessage="Plan created"
      />
    </>
  )
}
