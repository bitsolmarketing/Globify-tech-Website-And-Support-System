import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/admin/login-form'
import { auth, signIn } from '@/auth'
import { isDatabaseConfigured, pingDatabase } from '@/db'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export type LoginState = { error?: string }

/**
 * Both of these are needed before a sign-in can possibly succeed. Auth.js
 * answers a missing secret with an opaque "problem with the server
 * configuration" 500, so the gap is named on the page instead.
 */
function missingConfig(): string[] {
  const missing: string[] = []
  if (!isDatabaseConfigured()) missing.push('DATABASE_URL')
  if (!process.env.AUTH_SECRET?.trim()) missing.push('AUTH_SECRET')
  return missing
}

export default async function AdminLoginPage() {
  const missing = missingConfig()

  /* `auth()` needs AUTH_SECRET to verify the session cookie and throws when it
     is absent — which, unhandled, is exactly what turned a missing env var
     into a blank crash screen instead of the "not configured yet" message
     below. Skip the call entirely when the secret isn't there to check. */
  const session = missing.includes('AUTH_SECRET') ? null : await auth()
  if (session?.user) redirect('/admin')

  async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
    'use server'

    const blockers = missingConfig()
    if (blockers.length > 0) {
      return { error: `Sign-in is not configured yet — ${blockers.join(' and ')} missing.` }
    }

    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      await signIn('credentials', { email, password, redirectTo: '/admin' })
    } catch (error) {
      /* `signIn` signals a successful redirect by throwing NEXT_REDIRECT, so
         that has to be rethrown rather than reported as a failure. */
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
      if (
        typeof error === 'object' &&
        error !== null &&
        'digest' in error &&
        typeof error.digest === 'string' &&
        error.digest.startsWith('NEXT_REDIRECT')
      ) {
        throw error
      }

      /* Auth.js collapses every `authorize` failure into the same opaque
         CredentialsSignin, so a dead database and a typo arrive here looking
         identical. Probing once, only on the failure path, is what separates
         them — otherwise a broken DATABASE_URL presents for ever as "wrong
         password" and sends you hunting for the wrong problem. */
      const health = await pingDatabase()
      if (!health.ok) {
        console.error('[admin] sign-in blocked by database outage —', health.reason)
        return { error: `Sign-in is unavailable: ${health.reason}.` }
      }

      return { error: 'Those details did not match an admin account.' }
    }

    return {}
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-brand-950 px-4 py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-linear-to-br from-brand-950 via-brand-900 to-brand-950" />
        <div className="absolute inset-0 bg-grid-light opacity-40" />
        <div className="absolute -top-32 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-gold-500/12 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <p className="text-center font-sans text-lg font-extrabold tracking-tight text-white">
          Globify <span className="text-gold-400">Admin</span>
        </p>

        <LoginForm action={login} missingConfig={missing} />

        <p className="mt-6 text-center font-sans text-xs text-white/40">
          Authorised staff only. All sign-in attempts are logged.
        </p>
      </div>
    </div>
  )
}
