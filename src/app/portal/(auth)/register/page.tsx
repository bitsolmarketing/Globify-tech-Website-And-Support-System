import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  PortalRegisterForm,
  type PortalRegisterState,
} from '@/components/portal/portal-register-form'
import { isDatabaseConfigured } from '@/db'
import { createPortalUser, getPortalUserByEmail } from '@/lib/data/portal'
import { portalRegisterSchema } from '@/lib/portal/schemas'
import { portalAuth, portalSignIn } from '@/portal-auth'

export const metadata: Metadata = {
  title: 'Create your account',
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

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

export default async function PortalRegisterPage() {
  const session = process.env.AUTH_SECRET?.trim() ? await portalAuth() : null
  if (session?.user) redirect('/portal')

  async function register(
    _prev: PortalRegisterState,
    formData: FormData,
  ): Promise<PortalRegisterState> {
    'use server'

    if (!isDatabaseConfigured()) {
      return { error: 'Registration is unavailable right now. Please try again shortly.' }
    }

    const parsed = portalRegisterSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone') ?? '',
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
      website: formData.get('website') ?? '',
    })

    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { error: issue.message, field: String(issue.path[0] ?? '') }
    }

    const { name, email, phone, password, website } = parsed.data

    /* The honeypot is filled only by bots. Answering with the same success
       path a person gets — rather than an error — keeps the signal useless to
       whoever is probing, while creating nothing. */
    if (website) redirect('/portal/login')

    const existing = await getPortalUserByEmail(email)
    if (existing) {
      return {
        error: 'An account already exists for that email. Try signing in instead.',
        field: 'email',
      }
    }

    try {
      await createPortalUser({ email, name, phone, password, role: 'student' })
    } catch (error) {
      /* Two people registering the same address at once both pass the check
         above; the unique index is what actually decides, and it must not
         surface as a driver error. */
      if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) {
        return {
          error: 'An account already exists for that email. Try signing in instead.',
          field: 'email',
        }
      }
      console.error('[portal] registration failed', error)
      return { error: 'We could not create your account. Please try again.' }
    }

    try {
      await portalSignIn('portal', { email, password, redirectTo: '/portal' })
    } catch (error) {
      if (isRedirect(error)) throw error
      /* The account exists either way, so send them to sign in rather than
         reporting a failure that would make them register a second time. */
      redirect('/portal/login')
    }

    return {}
  }

  return (
    <>
      <PortalRegisterForm action={register} />

      <p className="mt-6 text-center font-sans text-xs text-white/40">
        Instructor accounts are created by the Globify office.
      </p>
    </>
  )
}
