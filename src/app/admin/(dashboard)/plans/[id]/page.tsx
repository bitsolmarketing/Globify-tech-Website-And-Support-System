import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { fromLines, type PlanFormValues } from '@/lib/admin/schemas'
import { getPlanRowById } from '@/lib/data/plans'
import { intervalLabel } from '@/lib/plans'
import { formatPKR } from '@/lib/utils'

import { deletePlan, updatePlan } from '../actions'
import { planFields } from '../fields'
import { PlanForm } from '../plan-form'

type Params = { id: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params
  const row = await getPlanRowById(id)
  return { title: row ? row.name : 'Plan' }
}

export default async function EditPlanPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  const row = await getPlanRowById(id)

  if (!row) notFound()

  async function save(values: PlanFormValues) {
    'use server'
    return updatePlan(id, values)
  }

  return (
    <>
      <AdminPageHeader
        title={row.name}
        description={`${formatPKR(row.price)} ${intervalLabel(row.interval)}`}
        backHref="/admin/plans"
        backLabel="All plans"
        actions={
          <DeleteButton
            label={`Delete plan: ${row.name}`}
            itemName="plan"
            redirectTo="/admin/plans"
            onDelete={deletePlan.bind(null, id)}
          />
        }
      />

      <PlanForm
        fields={planFields}
        sectionTitle="Plan details"
        defaultValues={{
          slug: row.slug,
          name: row.name,
          tagline: row.tagline,
          description: row.description,
          price: row.price,
          /* `null` means "no anchor" and the form models that as an empty
             string — `0` would render as a real strike-through price of zero. */
          compareAtPrice: row.compareAtPrice ?? '',
          interval: row.interval,
          features: fromLines(row.features),
          badge: row.badge ?? '',
          featured: row.featured,
          active: row.active,
        }}
        onSubmitAction={save}
        cancelHref="/admin/plans"
        submitLabel="Save plan"
        successMessage="Plan updated"
      />
    </>
  )
}
