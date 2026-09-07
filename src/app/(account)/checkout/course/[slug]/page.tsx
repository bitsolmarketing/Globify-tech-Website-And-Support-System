import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, Sparkles } from 'lucide-react'

import { EnrollmentStatusBadge } from '@/components/account/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { discountedFee, savings } from '@/lib/courses'
import { getCampaign } from '@/lib/data/campaign'
import { getCourseBySlug } from '@/lib/data/courses'
import { getActiveSubscription, getStudentEnrollment } from '@/lib/data/enrollments'
import { requireStudent } from '@/lib/student/guard'
import { formatPKR } from '@/lib/utils'

import { CheckoutForm, ReserveSeatButton } from '../../checkout-form'
import { PaymentInstructions } from '../../payment-instructions'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export default async function CourseCheckoutPage({ params }: { params: Params }) {
  const { slug } = await params
  const student = await requireStudent(`/checkout/course/${slug}`)

  const [course, campaign] = await Promise.all([getCourseBySlug(slug), getCampaign()])
  if (!course) notFound()

  const [enrollment, subscription] = await Promise.all([
    getStudentEnrollment(student.id, slug),
    getActiveSubscription(student.id),
  ])

  const amount = discountedFee(course, campaign.discountPercent)
  const saved = savings(course, campaign.discountPercent)

  /* Already paid for, one way or the other. Showing a payment form to someone
     who has access is how a student pays twice. */
  const alreadyEnrolled =
    enrollment && (enrollment.status === 'active' || enrollment.status === 'completed')

  if (alreadyEnrolled || subscription) {
    return (
      <Wrapper title={course.title}>
        <Card className="p-7 text-center sm:p-9">
          <CheckCircle2 aria-hidden className="mx-auto size-10 text-emerald-600" />
          <h2 className="mt-4 font-sans text-xl font-extrabold tracking-tight text-ink-900">
            {alreadyEnrolled ? 'You are already enrolled' : 'Included in your plan'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-600">
            {alreadyEnrolled
              ? 'There is nothing more to pay for this course.'
              : `Your ${subscription?.planName} subscription already covers this course — no separate fee is needed.`}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="md">
              <Link href="/dashboard">Go to your dashboard</Link>
            </Button>
            <Button asChild variant="outline" size="md">
              <Link href={`/courses/${course.slug}`}>View the course</Link>
            </Button>
          </div>
        </Card>
      </Wrapper>
    )
  }

  return (
    <Wrapper title={course.title}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-6">
          <PaymentInstructions amount={amount} what={course.title} />
          <CheckoutForm purpose="course" slug={course.slug} amount={amount} what={course.title} />
        </div>

        {/* ------------------------------------------------------ summary -- */}
        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Card className="p-6">
            <p className="font-sans text-xs font-bold tracking-[0.08em] text-ink-500 uppercase">
              Order summary
            </p>

            <h2 className="mt-3 font-sans text-lg font-extrabold tracking-tight text-ink-900">
              {course.title}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {course.duration} · {course.level}
            </p>

            <dl className="mt-5 grid gap-2.5 border-t border-hairline pt-5 text-[0.9375rem]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-500">Standard fee</dt>
                <dd
                  className={saved > 0 ? 'text-ink-400 line-through' : 'font-semibold text-ink-900'}
                >
                  {formatPKR(course.originalFee)}
                </dd>
              </div>

              {saved > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-500">
                    {campaign.name} ({campaign.discountPercent}% off)
                  </dt>
                  <dd className="font-semibold text-emerald-700">−{formatPKR(saved)}</dd>
                </div>
              )}

              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-hairline pt-3">
                <dt className="font-sans font-bold text-ink-900">Total</dt>
                <dd className="font-sans text-xl font-extrabold text-brand-900">
                  {formatPKR(amount)}
                </dd>
              </div>
            </dl>

            {enrollment?.status === 'pending' && (
              <div className="mt-5 rounded-xl bg-gold-50 p-4 ring-1 ring-gold-200 ring-inset">
                <div className="flex items-center gap-2">
                  <Clock aria-hidden className="size-4 text-gold-700" />
                  <EnrollmentStatusBadge status={enrollment.status} />
                </div>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-gold-900">
                  Your seat is reserved. Send the fee and upload the receipt to have it confirmed.
                </p>
              </div>
            )}

            {!enrollment && (
              <div className="mt-5">
                <ReserveSeatButton slug={course.slug} />
              </div>
            )}
          </Card>

          <Card className="bg-brand-950 p-5 text-white">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-4 text-gold-400" />
              <p className="font-sans text-sm font-bold">Taking more than one course?</p>
            </div>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-white/70">
              An all-access plan unlocks the whole catalogue for a single fee.
            </p>
            <Button asChild variant="gold" size="sm" className="mt-4 w-full">
              <Link href="/pricing">Compare plans</Link>
            </Button>
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
          Enrollment
        </p>
        <h1 className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h1>
      </header>

      {children}
    </div>
  )
}
