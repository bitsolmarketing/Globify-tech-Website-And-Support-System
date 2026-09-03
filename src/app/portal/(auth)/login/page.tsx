import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { PortalLoginForm, type PortalLoginState } from '@/components/portal/portal-login-form'
import { isDatabaseConfigured, pingDatabase } from '@/db'
import { portalAuth, portalSignIn } from '@/portal-auth'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

function missingConfig(): string[] {
  const missing: string[] = []
  if (!isDatabaseConfigured()) missing.push('DATABASE_URL')
  if (!process.env.AUTH_SECRET?.trim()) missing.push('AUTH_SECRET')
  return missing
}

/** Auth.js throws NEXT_REDIRECT to signal success, so it must be rethrown. */
function isRedirect(error: unknown): boolean {
  if (error instanceof Error && error.message === 'NEXT_REDIRECT') return true
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  )
}

export default async function PortalLoginPage() {
  const missing = missingConfig()

  /* `portalAuth()` needs AUTH_SECRET to verify the cookie and throws without
     it — which would turn a missing env var into a blank crash screen instead
     of the message below. */
  const session = missing.includes('AUTH_SECRET') ? null : await portalAuth()
  if (session?.user) redirect('/portal')

  async function login(_prev: PortalLoginState, formData: FormData): Promise<PortalLoginState> {
    'use server'

    const blockers = missingConfig()
    if (blockers.length > 0) {
      return { error: `Sign-in is not configured yet — ${blockers.join(' and ')} missing.` }
    }

    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    try {
      /* Always `/portal`, never a role path: which dashboard this person gets
         is a fact about their account, and it is not known until the session
         exists. `/portal` is the router that answers it. */
      await portalSignIn('portal', { email, password, redirectTo: '/portal' })
    } catch (error) {
      if (isRedirect(error)) throw error

      /* Auth.js collapses every `authorize` failure into the same opaque
         CredentialsSignin, so a dead database and a typo arrive here looking
         identical. Probing once, only on the failure path, separates them. */
      const health = await pingDatabase()
      if (!health.ok) {
        console.error('[portal] sign-in blocked by database outage —', health.reason)
        return { error: `Sign-in is unavailable: ${health.reason}.` }
      }

      /* One message for a wrong password, an unknown address and a suspended
         account alike — telling them apart tells an outsider which addresses
         are real. Suspended users are told what happened after they get in. */
      return { error: 'Those details did not match an account.' }
    }

    return {}
  }

  return (
    <>
      <PortalLoginForm action={login} missingConfig={missing} />

      <p className="mt-6 text-center font-sans text-xs text-white/40">
        Staff looking for the site admin? That is a separate sign-in at /admin.
      </p>
    </>
  )
}
