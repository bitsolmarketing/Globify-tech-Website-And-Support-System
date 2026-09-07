import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Card } from '@/components/ui/card'
import { getStudentSession } from '@/lib/student/guard'

import { StudentLoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Globify Tech Institute account to manage your enrollments.',
  robots: { index: false, follow: true },
}

/** Reads the session cookie, so it can never be statically rendered. */
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ next?: string }>

/**
 * Only a same-site path is ever honoured as a continuation. `next` is
 * attacker-writable — it arrives in the query string — and a redirect that may
 * name a host is an open redirect. `//evil.example` is rejected along with
 * absolute URLs: browsers read a protocol-relative path as one.
 */
function safeNext(value: string | undefined): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value
  return '/dashboard'
}

export default async function StudentLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams
  const target = safeNext(next)

  /* Already signed in: honour the continuation rather than showing a form for a
     session they already have. */
  if (await getStudentSession()) redirect(target)

  return (
    <div className="mx-auto grid w-full max-w-md px-4 py-12 sm:py-16">
      <Card className="p-7 shadow-lift sm:p-9">
        <h1 className="font-sans text-2xl font-extrabold tracking-tight text-ink-900">
          Welcome back
        </h1>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
          Sign in to see your courses, enrollment status and payment history.
        </p>

        <StudentLoginForm next={target} />

        <p className="mt-7 border-t border-hairline pt-6 text-center font-sans text-sm text-ink-600">
          New to Globify?{' '}
          <Link
            href={`/signup${next ? `?next=${encodeURIComponent(target)}` : ''}`}
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </Card>

      <p className="mt-6 text-center font-sans text-xs text-ink-400">
        Staff sign-in is at{' '}
        <Link href="/admin/login" className="underline-offset-4 hover:underline">
          /admin
        </Link>
        .
      </p>
    </div>
  )
}
