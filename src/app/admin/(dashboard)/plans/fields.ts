import type { SimpleField } from '@/components/admin/simple-form'
import type { PlanFormValues } from '@/lib/admin/schemas'

export const planFields: SimpleField<PlanFormValues>[] = [
  { name: 'name', label: 'Plan name', required: true },
  {
    name: 'slug',
    label: 'Slug',
    required: true,
    hint: 'Used in the checkout URL. Changing it breaks any link already shared.',
  },
  {
    name: 'tagline',
    label: 'Tagline',
    required: true,
    full: true,
    placeholder: 'Every course, one monthly fee, cancel whenever you like',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 4,
    required: true,
    hint: 'Shown on the plan card and again in the checkout summary.',
  },
  {
    name: 'price',
    label: 'Price (PKR)',
    type: 'number',
    required: true,
    min: 1,
    hint: 'Charged once per billing interval. Whole rupees.',
  },
  {
    name: 'compareAtPrice',
    label: 'Compare-at price (PKR)',
    type: 'number',
    min: 0,
    hint: 'Optional strike-through anchor — e.g. 12x the monthly price. Leave blank for none.',
  },
  {
    name: 'interval',
    label: 'Billing interval',
    type: 'select',
    required: true,
    options: [
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' },
    ],
  },
  {
    name: 'badge',
    label: 'Badge',
    placeholder: 'Best value',
    hint: 'Optional pill on the plan card.',
  },
  {
    name: 'features',
    label: 'Features',
    type: 'textarea',
    rows: 6,
    required: true,
    hint: 'One per line. Each becomes a ticked bullet on /pricing.',
  },
  {
    name: 'featured',
    label: 'Highlight this plan on /pricing',
    type: 'checkbox',
    hint: 'Draws the emphasised card. Only one plan should have this.',
  },
  {
    name: 'active',
    label: 'On sale',
    type: 'checkbox',
    hint: 'Unticking withdraws it from /pricing without affecting existing subscriptions.',
  },
]
