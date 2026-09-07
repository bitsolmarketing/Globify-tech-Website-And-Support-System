import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { getStudentSession } from '@/lib/student/guard'

import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: 'Create your account',
  description:
    'Create a Globify Tech Institute account to enrol in a course, track your application and manage your fee payments.',
  robots: { index: true, follow: true },
}

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ next?: string }>

function safeNext(value: string | undefined): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value
  return '/dashboard'
}

const REASONS = [
  'Enrol in any course and track your application status',
  'Upload your fee receipt and see when it is confirmed',
  'Keep every enrollment and payment in one place',
]

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams
  const target = safeNext(next)

  if (await getStudentSession()) redirect(target)

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-start lg:gap-12">
      <div className="order-2 lg:order-1 lg:pt-6">
        <h2 className="font-sans text-xl font-extrabold tracking-tight text-ink-900">
          Why create an account?
        </h2>
        <ul className="mt-5 grid gap-4">
          {REASONS.map((reason) => (
            <li key={reason} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="text-[0.9375rem] leading-relaxed text-ink-600">{reason}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 rounded-xl bg-white p-5 text-[0.875rem] leading-relaxed text-ink-600 ring-1 ring-hairline">
          Creating an account does not commit you to anything. You choose a course and confirm the
          fee afterwards, and our admissions team confirms every payment by hand before your seat is
          activated.
        </p>
      </div>

      <Card className="order-1 p-7 shadow-lift sm:p-9 lg:order-2">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-ink-900">
          Create your account
        </h1>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
          It takes about a minute.
        </p>

        <SignupForm next={target} />

        <p className="mt-7 border-t border-hairline pt-6 text-center font-sans text-sm text-ink-600">
          Already have an account?{' '}
          <Link
            href={`/login${next ? `?next=${encodeURIComponent(target)}` : ''}`}
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}
