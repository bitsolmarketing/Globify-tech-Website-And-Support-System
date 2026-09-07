import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Info,
  ReceiptText,
  Sparkles,
  Upload,
} from 'lucide-react'

import {
  EnrollmentStatusBadge,
  PaymentStatusBadge,
  SubscriptionStatusBadge,
} from '@/components/account/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { isDatabaseConfigured } from '@/db'
import {
  getActiveSubscription,
  listStudentEnrollments,
  listStudentPayments,
  listStudentSubscriptions,
} from '@/lib/data/enrollments'
import { PAYMENT_METHOD_LABELS } from '@/lib/payments'
import { requireStudent } from '@/lib/student/guard'
import { formatDate, formatPKR } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Your dashboard',
  robots: { index: false, follow: false },
}

/** Reads per-student rows, so it must never be cached or pre-rendered. */
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const student = await requireStudent('/dashboard')

  /* Without a database there is nothing personal to show, and every query below
     would throw. Say so plainly rather than rendering an empty dashboard that
     looks like a student with no enrollments. */
  if (!isDatabaseConfigured()) {
    return (
      <Shell name={student.name}>
        <Card className="p-8 text-center">
          <p className="font-sans text-lg font-bold text-ink-900">Your dashboard is unavailable</p>
          <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-500">
            We cannot reach our records right now. Please try again shortly, or contact admissions
            and we will confirm your enrollment by hand.
          </p>
          <Button asChild variant="primary" size="md" className="mt-6">
            <Link href="/contact">Contact admissions</Link>
          </Button>
        </Card>
      </Shell>
    )
  }

  const [enrollments, subscription, subscriptions, payments] = await Promise.all([
    listStudentEnrollments(student.id),
    getActiveSubscription(student.id),
    listStudentSubscriptions(student.id),
    listStudentPayments(student.id),
  ])

  const pendingSubscription = subscriptions.find((row) => row.status === 'pending')
  const activeCount = enrollments.filter((row) => row.status === 'active').length

  return (
    <Shell name={student.name}>
      {/* ----------------------------------------------------- all-access -- */}
      {subscription ? (
        <Card className="mb-8 border-brand-200 bg-brand-50/60 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden className="size-4 text-brand-700" />
                <p className="font-sans text-sm font-bold tracking-wide text-brand-800 uppercase">
                  All-access
                </p>
              </div>
              <p className="mt-2 font-sans text-xl font-extrabold text-ink-900">
                {subscription.planName}
              </p>
              <p className="mt-1 text-[0.9375rem] text-ink-600">
                Every course is unlocked until {formatDate(subscription.expiresAt ?? new Date())}.
              </p>
            </div>
            <SubscriptionStatusBadge status={subscription.status} />
          </div>
        </Card>
      ) : pendingSubscription ? (
        <Card className="mb-8 border-gold-200 bg-gold-50/60 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-sans text-lg font-extrabold text-ink-900">
                {pendingSubscription.planName}
              </p>
              <p className="mt-1 text-[0.9375rem] text-ink-600">
                We are confirming your payment. Your plan starts as soon as it clears.
              </p>
            </div>
            <SubscriptionStatusBadge status={pendingSubscription.status} />
          </div>
        </Card>
      ) : null}

      {/* ---------------------------------------------------- enrollments -- */}
      <section aria-labelledby="enrollments-heading" className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="enrollments-heading"
            className="font-sans text-xl font-extrabold tracking-tight text-ink-900"
          >
            Your courses
            {activeCount > 0 && (
              <span className="ml-2 align-middle">
                <Badge variant="success" size="sm">
                  {activeCount} active
                </Badge>
              </span>
            )}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/courses">
              Browse catalogue
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>

        {enrollments.length === 0 ? (
          <Card className="p-8 text-center sm:p-10">
            <BookOpen aria-hidden className="mx-auto size-8 text-ink-300" />
            <p className="mt-4 font-sans text-lg font-bold text-ink-900">
              You have not enrolled in anything yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-500">
              Pick a course to pay for individually, or take an all-access plan and unlock the whole
              catalogue.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild variant="primary" size="md">
                <Link href="/courses">Browse courses</Link>
              </Button>
              <Button asChild variant="outline" size="md">
                <Link href="/pricing">See plans</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <ul className="grid gap-4">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id}>
                <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-sans text-base font-bold text-ink-900">
                        {enrollment.courseTitle}
                      </h3>
                      <EnrollmentStatusBadge status={enrollment.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-ink-500">
                      {enrollment.source === 'plan'
                        ? 'Included in your all-access plan'
                        : `Fee ${formatPKR(enrollment.amount)}`}
                      {' · '}
                      Started {formatDate(enrollment.createdAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/courses/${enrollment.courseSlug}`}>View course</Link>
                    </Button>

                    {/* The one action a pending enrollment actually needs. */}
                    {enrollment.status === 'pending' && enrollment.source === 'course' && (
                      <Button asChild variant="primary" size="sm">
                        <Link href={`/checkout/course/${enrollment.courseSlug}`}>
                          <Upload aria-hidden />
                          Send payment proof
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------- payments -- */}
      <section aria-labelledby="payments-heading">
        <h2
          id="payments-heading"
          className="mb-4 font-sans text-xl font-extrabold tracking-tight text-ink-900"
        >
          Payments
        </h2>

        {payments.length === 0 ? (
          <Card className="flex items-start gap-3 p-6">
            <ReceiptText aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-300" />
            <p className="text-[0.9375rem] leading-relaxed text-ink-500">
              No payments yet. When you send a fee, upload the receipt and it will appear here with
              its confirmation status.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {payments.map((payment) => (
              <li key={payment.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-sans text-base font-bold text-ink-900">
                          {formatPKR(payment.amount)}
                        </p>
                        <PaymentStatusBadge status={payment.status} />
                      </div>
                      <p className="mt-1.5 font-sans text-sm text-ink-500">
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                        {' · '}
                        {formatDate(payment.createdAt)}
                      </p>
                    </div>

                    <p className="shrink-0 font-mono text-xs text-ink-400">{payment.reference}</p>
                  </div>

                  {/* A rejection without a reason is the worst possible answer
                      to give someone who has sent money. */}
                  {payment.status === 'rejected' && payment.reviewNote && (
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[0.8125rem] leading-relaxed text-red-800">
                      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                      <span>{payment.reviewNote}</span>
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!subscription && (
        <Card className="mt-10 flex flex-col items-start gap-4 bg-brand-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="font-sans text-lg font-extrabold">Studying more than one course?</p>
            <p className="mt-1 text-[0.9375rem] text-white/70">
              An all-access plan unlocks the entire catalogue for one fee.
            </p>
          </div>
          <Button asChild variant="gold" size="md" className="shrink-0">
            <Link href="/pricing">
              <CreditCard aria-hidden />
              See plans
            </Link>
          </Button>
        </Card>
      )}
    </Shell>
  )
}

function Shell({ name, children }: { name: string; children: React.ReactNode }) {
  /* First name only. "Welcome back, Muhammad Ahmed Khan" reads like a form
     letter; the greeting is the one place the site should sound like a person. */
  const firstName = name.trim().split(/\s+/)[0] || 'there'

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
          Your enrollments, plan and payment history.
        </p>
      </header>

      {children}
    </div>
  )
}
