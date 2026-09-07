import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, MessageCircle, Sparkles } from 'lucide-react'

import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal } from '@/components/shared/reveal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { discountedFee } from '@/lib/courses'
import { getCampaign } from '@/lib/data/campaign'
import { getCourses } from '@/lib/data/courses'
import { getPlans } from '@/lib/data/plans'
import { buildMetadata } from '@/lib/metadata'
import { intervalLabel, planSavings } from '@/lib/plans'
import { breadcrumbSchema, graph, webPageSchema } from '@/lib/schema'
import { contactInfo } from '@/lib/site'
import { cn, formatPKR } from '@/lib/utils'

const TITLE = 'Pricing & Plans'
const DESCRIPTION =
  'Pay for a single course, or take an all-access plan and unlock every Globify Tech Institute course. Transparent fees in PKR, with the current campaign discount applied.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/pricing',
  image: `/api/og?title=${encodeURIComponent('Pricing & plans')}&eyebrow=${encodeURIComponent('Pricing')}`,
  keywords: [
    'Globify course fees',
    'IT course fees Faisalabad',
    'all access plan Pakistan',
    'IT institute fee structure',
  ],
})

const CRUMBS = [{ name: 'Pricing', href: '/pricing' }]

export default async function PricingPage() {
  const [plans, courses, campaign] = await Promise.all([getPlans(), getCourses(), getCampaign()])

  /* What the whole catalogue costs bought one course at a time — the honest
     comparison for an all-access plan, and computed rather than asserted so it
     cannot go stale when a course is added or repriced. */
  const catalogueTotal = courses.reduce(
    (total, course) => total + discountedFee(course, campaign.discountPercent),
    0,
  )

  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Two ways to <span className="text-gold-400">learn with us</span>
          </>
        }
        description="Pay for the one course you want, or unlock everything with a plan. Every fee below is in Pakistani rupees and includes the current campaign discount."
        crumbs={CRUMBS}
      />

      {/* ------------------------------------------------------------ plans */}
      {plans.length > 0 && (
        <section className="section-y bg-white" aria-labelledby="plans-heading">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="brand" size="md">
                <Sparkles aria-hidden />
                All-access
              </Badge>
              <h2
                id="plans-heading"
                className="mt-4 font-sans text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl"
              >
                Every course, one subscription
              </h2>
              <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-600">
                Best if you want more than one skill. The whole catalogue costs{' '}
                {formatPKR(catalogueTotal)} bought course by course.
              </p>
            </div>

            <div
              className={cn(
                'mx-auto mt-12 grid gap-6',
                plans.length === 1 ? 'max-w-md' : 'max-w-4xl sm:grid-cols-2',
              )}
            >
              {plans.map((plan, index) => {
                const saved = planSavings(plan)

                return (
                  <Reveal key={plan.slug} delay={index * 0.08}>
                    <Card
                      className={cn(
                        'flex h-full flex-col p-7 sm:p-8',
                        plan.featured
                          ? 'border-brand-300 shadow-lift ring-2 ring-brand-600/20'
                          : 'shadow-soft',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-sans text-xl font-extrabold tracking-tight text-ink-900">
                            {plan.name}
                          </h3>
                          <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
                            {plan.tagline}
                          </p>
                        </div>
                        {plan.badge && (
                          <Badge variant="solid-gold" size="sm" className="shrink-0">
                            {plan.badge}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-sans text-4xl font-extrabold tracking-tight text-brand-900">
                          {formatPKR(plan.price)}
                        </span>
                        <span className="text-sm font-medium text-ink-500">
                          {intervalLabel(plan.interval)}
                        </span>
                      </div>

                      {saved > 0 && (
                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                          Saves {formatPKR(saved)} against {formatPKR(plan.compareAtPrice ?? 0)}
                        </p>
                      )}

                      <p className="mt-5 text-[0.9375rem] leading-relaxed text-ink-600">
                        {plan.description}
                      </p>

                      <ul className="mt-6 grid flex-1 gap-3 border-t border-hairline pt-6">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3">
                            <span
                              aria-hidden
                              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"
                            >
                              <Check className="size-3.5" strokeWidth={3} />
                            </span>
                            <span className="text-[0.9375rem] leading-relaxed text-ink-700">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        asChild
                        variant={plan.featured ? 'gold' : 'outline'}
                        size="lg"
                        className="mt-7 w-full"
                      >
                        {/* Straight to checkout. Anyone not signed in is caught
                            by the middleware and returned here afterwards. */}
                        <Link href={`/checkout/plan/${plan.slug}`}>
                          Choose {plan.name}
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    </Card>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------- per-course fees */}
      <section className="section-y bg-ink-50/60" aria-labelledby="courses-heading">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="neutral" size="md">
              Single course
            </Badge>
            <h2
              id="courses-heading"
              className="mt-4 font-sans text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl"
            >
              Or pay for just the one you want
            </h2>
            <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-600">
              One fee, the full course, no subscription.
              {campaign.discountPercent > 0 && (
                <>
                  {' '}
                  Prices below already include the {campaign.discountPercent}% {campaign.name}{' '}
                  discount.
                </>
              )}
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-hairline">
            {/* Wide content scrolls inside the card, never the page. */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left font-sans text-sm">
                <thead className="border-b border-hairline bg-ink-50/60">
                  <tr>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-500 uppercase"
                    >
                      Course
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-[0.6875rem] font-bold tracking-[0.08em] text-ink-500 uppercase whitespace-nowrap"
                    >
                      Duration
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3.5 text-right text-[0.6875rem] font-bold tracking-[0.08em] text-ink-500 uppercase"
                    >
                      Fee
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      <span className="sr-only">Enrol</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-hairline">
                  {courses.map((course) => {
                    const fee = discountedFee(course, campaign.discountPercent)

                    return (
                      <tr key={course.slug} className="transition-colors hover:bg-ink-50/50">
                        <th scope="row" className="px-5 py-4 font-normal">
                          <Link
                            href={`/courses/${course.slug}`}
                            className="font-sans font-bold text-ink-900 underline-offset-4 hover:text-brand-800 hover:underline"
                          >
                            {course.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-ink-500">{course.category}</p>
                        </th>

                        <td className="px-5 py-4 whitespace-nowrap text-ink-600">
                          {course.duration}
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {fee < course.originalFee && (
                            <span className="mr-2 text-xs text-ink-400 line-through">
                              {formatPKR(course.originalFee)}
                            </span>
                          )}
                          <span className="font-sans font-extrabold text-brand-900">
                            {formatPKR(fee)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Button asChild variant="secondary" size="sm">
                            <Link href={`/checkout/course/${course.slug}`}>Enrol</Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-[0.875rem] leading-relaxed text-ink-500">
            Fees are paid by bank transfer, JazzCash, Easypaisa or in cash at the campus. Our
            admissions team confirms every payment by hand before a seat is activated — you will
            never be charged automatically.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------------- CTA */}
      <section className="section-y bg-white">
        <div className="container-page">
          <Card className="mx-auto flex max-w-3xl flex-col items-center gap-5 bg-brand-950 p-8 text-center text-white sm:p-10">
            <h2 className="font-sans text-2xl font-extrabold tracking-tight sm:text-3xl">
              Not sure which is right for you?
            </h2>
            <p className="max-w-xl text-[1.0625rem] leading-relaxed text-white/70">
              Tell us what you want to do for a living and we will tell you honestly whether one
              course or the full catalogue makes more sense.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild variant="gold" size="lg">
                <Link href="/contact">
                  Talk to admissions
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline-light" size="lg">
                <a
                  href={`https://wa.me/${contactInfo.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden />
                  WhatsApp us
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <JsonLd
        id="pricing-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/pricing' }),
          breadcrumbSchema(CRUMBS),
        )}
      />
    </>
  )
}
