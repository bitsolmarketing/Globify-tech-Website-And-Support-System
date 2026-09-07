/**
 * All-access plan types and the seed catalogue.
 *
 * Mirrors the arrangement in `@/lib/courses`: this `Plan` type is the source of
 * truth for the `plans` table — the Drizzle columns in `src/db/schema.ts` are
 * typed from it — and the array below is both the payload for
 * `npm run db:seed` and the fallback /pricing renders from when `DATABASE_URL`
 * is unset. Live reads go through `@/lib/data/plans`.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE PRICES BELOW ARE PLACEHOLDERS.
 *
 * Nobody has told this repo what an all-access subscription should cost, and
 * inventing a number and letting it render as fact is exactly the failure mode
 * the rest of this codebase avoids (see the `rating`/`reviews`/`enrolled`
 * zeroes in `@/lib/courses`). They are set to something defensible rather than
 * something arbitrary — the yearly plan is priced at roughly one premium
 * course, against a catalogue whose seven courses total Rs 300,000 — but they
 * are still a commercial decision that has not been made.
 *
 * An admin overwrites them at /admin/plans, which is why they live in a table
 * rather than in this file. Until someone does, /pricing shows the plans only
 * if `active` is true, and the seed ships them active so the page is not empty
 * in staging. Turn them off there if the institute is not ready to sell one.
 * ────────────────────────────────────────────────────────────────────────────
 */

export const PLAN_INTERVALS = ['monthly', 'yearly'] as const
export type PlanInterval = (typeof PLAN_INTERVALS)[number]

export type Plan = {
  slug: string
  name: string
  tagline: string
  description: string
  /** Rupees, charged once per `interval`. */
  price: number
  /** Optional strike-through anchor. Omitted when there is nothing to compare. */
  compareAtPrice?: number
  interval: PlanInterval
  features: string[]
  badge?: string
  featured: boolean
  active: boolean
}

export const plans: Plan[] = [
  {
    slug: 'all-access-monthly',
    name: 'All-Access Monthly',
    tagline: 'Every course, one monthly fee, cancel whenever you like',
    description:
      'Unlocks the full Globify catalogue for as long as your subscription runs. Best if you want to sample several tracks before committing to one, or you are studying part-time around a job.',
    price: 6000,
    interval: 'monthly',
    features: [
      'Access to all 7 professional courses',
      'Live instructor-led sessions',
      'Course materials and project briefs',
      'Cancel any time — no lock-in',
    ],
    featured: false,
    active: true,
  },
  {
    slug: 'all-access-yearly',
    name: 'All-Access Yearly',
    tagline: 'A full year of every course, for less than the price of two',
    description:
      'The same catalogue access billed once for twelve months. This is the plan for someone who intends to finish more than one track — the whole catalogue costs less than two courses bought separately.',
    price: 45000,
    compareAtPrice: 72000,
    interval: 'yearly',
    features: [
      'Everything in All-Access Monthly',
      'Twelve months of access',
      'Priority seat in every new batch',
      'Completion certificate for each course finished',
    ],
    badge: 'Best value',
    featured: true,
    active: true,
  },
]

/** What a yearly plan saves against paying the monthly rate for a year. */
export function planSavings(plan: Pick<Plan, 'price' | 'compareAtPrice'>): number {
  if (!plan.compareAtPrice || plan.compareAtPrice <= plan.price) return 0
  return plan.compareAtPrice - plan.price
}

/** "per month" / "per year" — the suffix shown next to a price. */
export function intervalLabel(interval: PlanInterval): string {
  return interval === 'monthly' ? 'per month' : 'per year'
}

/** "monthly" / "yearly" as an adjective, for sentences rather than price tags. */
export function intervalAdjective(interval: PlanInterval): string {
  return interval === 'monthly' ? 'Monthly' : 'Yearly'
}

/** How long an approved subscription of this interval should run. */
export function intervalDurationDays(interval: PlanInterval): number {
  return interval === 'monthly' ? 30 : 365
}
