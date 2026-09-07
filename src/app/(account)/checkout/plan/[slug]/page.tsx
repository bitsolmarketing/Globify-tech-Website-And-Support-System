import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getActiveSubscription } from '@/lib/data/enrollments'
import { getPlanBySlug } from '@/lib/data/plans'
import { intervalLabel } from '@/lib/plans'
import { requireStudent } from '@/lib/student/guard'
import { formatDate, formatPKR } from '@/lib/utils'

import { CheckoutForm } from '../../checkout-form'
import { PaymentInstructions } from '../../payment-instructions'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export default async function PlanCheckoutPage({ params }: { params: Params }) {
  const { slug } = await params
  const student = await requireStudent(`/checkout/plan/${slug}`)

  const plan = await getPlanBySlug(slug)

  /* An inactive plan is not for sale. Treating it as missing rather than
     showing a disabled page keeps a stale link from looking like a bug. */
  if (!plan || !plan.active) notFound()

  const subscription = await getActiveSubscription(student.id)

  if (subscription) {
    return (
      <Wrapper title={plan.name}>
        <Card className="p-7 text-center sm:p-9">
          <CheckCircle2 aria-hidden className="mx-auto size-10 text-emerald-600" />
          <h2 className="mt-4 font-sans text-xl font-extrabold tracking-tight text-ink-900">
            You already have an active plan
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-600">
            Your {subscription.planName} runs until{' '}
            {formatDate(subscription.expiresAt ?? new Date())}. To change plans, talk to admissions
            first so nothing you have paid for is lost.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="md">
              <Link href="/dashboard">Go to your dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="md">
              <Link href="/contact">Contact admissions</Link>
            </Button>
          </div>
        </Card>
      </Wrapper>
    )
  }

  return (
    <Wrapper title={plan.name}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-6">
          <PaymentInstructions amount={plan.price} what={plan.name} />
          <CheckoutForm purpose="plan" slug={plan.slug} amount={plan.price} what={plan.name} />
        </div>

        <aside className="lg:sticky lg:top-24">
          <Card className="p-6">
            <p className="font-sans text-xs font-bold tracking-[0.08em] text-ink-500 uppercase">
              Order summary
            </p>

            <h2 className="mt-3 font-sans text-lg font-extrabold tracking-tight text-ink-900">
              {plan.name}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">{plan.tagline}</p>

            <div className="mt-5 flex items-baseline gap-2 border-t border-hairline pt-5">
              <span className="font-sans text-2xl font-extrabold text-brand-900">
                {formatPKR(plan.price)}
              </span>
              <span className="text-sm text-ink-500">{intervalLabel(plan.interval)}</span>
            </div>

            <ul className="mt-5 grid gap-2.5 border-t border-hairline pt-5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[0.875rem] text-ink-600">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <p className="mt-5 border-t border-hairline pt-5 text-[0.8125rem] leading-relaxed text-ink-500">
              Your plan starts once we confirm the payment, and runs for{' '}
              {plan.interval === 'monthly' ? '30 days' : '12 months'} from that date — not from
              today, so nothing is lost while we check.
            </p>
          </Card>
        </aside>
      </div>
    </Wrapper>
  )
}

function Wrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="font-sans text-xs font-bold tracking-[0.08em] text-brand-700 uppercase">
          All-access plan
        </p>
        <h1 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h1>
      </header>

      {children}
    </div>
  )
}
