'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import {
  createPortalUser,
  generateTempPassword,
  getPortalUserByEmail,
  setPortalPassword,
  updatePortalAccount,
} from '@/lib/data/portal'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { portalUserSchema } from '@/lib/portal/schemas'

/**
 * Admin management of portal accounts.
 *
 * `runAction` checks the *admin* session — a different cookie and a different
 * table from the portal's. That separation is the point: creating an instructor
 * is an administrative act, and nobody holding only a portal session can
 * perform it, however their own role is set.
 *
 * Passwords are never chosen here. The account is provisioned with a generated
 * one, flagged `mustChangePassword`, and the plaintext is handed back exactly
 * once so it can be passed on — it is not stored anywhere in readable form.
 */

export type ProvisionResult =
  | { ok: true; password: string; email: string }
  | { ok: false; error: string }

/**
 * `z.input`, not `z.infer`: `status` carries a `.default()`, so it is required
 * on the way *out* of the schema and optional on the way in. The provision form
 * has no status field — a brand new account is always active.
 */
export async function createPortalAccount(
  values: z.input<typeof portalUserSchema>,
): Promise<ProvisionResult> {
  try {
    const parsed = portalUserSchema.parse(values)

    const existing = await getPortalUserByEmail(parsed.email)
    if (existing) {
      return { ok: false, error: 'An account already exists for that email address.' }
    }

    const password = generateTempPassword()

    await createPortalUser({
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
      password,
      phone: parsed.phone,
      headline: parsed.headline,
      authorSlug: parsed.authorSlug,
      mustChangePassword: true,
    })

    revalidatePath('/admin/portal-users')

    return { ok: true, password, email: parsed.email }
  } catch (error) {
    console.error('[admin] could not create portal account', error)

    if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) {
      return { ok: false, error: 'An account already exists for that email address.' }
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not create the account.',
    }
  }
}

export async function updatePortalAccountAction(
  id: string,
  values: z.infer<typeof portalUserSchema>,
): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = portalUserSchema.parse(values)

    await updatePortalAccount(id, {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      status: parsed.status,
      authorSlug: parsed.authorSlug,
    })

    revalidatePath('/admin/portal-users')
    revalidatePath(`/admin/portal-users/${id}`)
  })
}

/**
 * Issue a new temporary password.
 *
 * Returns the plaintext so the office can read it out. The alternative — an
 * emailed reset link — needs a mail sender this project does not have, and a
 * spoken password that must be changed on first use is a reasonable stand-in
 * for a walk-in institute.
 */
export async function resetPortalPassword(id: string): Promise<ProvisionResult> {
  try {
    const password = generateTempPassword()
    await setPortalPassword(id, password, true)

    revalidatePath(`/admin/portal-users/${id}`)

    return { ok: true, password, email: '' }
  } catch (error) {
    console.error('[admin] could not reset portal password', error)
    return { ok: false, error: 'Could not reset the password.' }
  }
}

export async function setPortalAccountStatus(
  id: string,
  status: 'active' | 'suspended',
): Promise<ActionResult> {
  return runAction(async () => {
    await updatePortalAccount(id, { status })
    revalidatePath('/admin/portal-users')
    revalidatePath(`/admin/portal-users/${id}`)
  })
}
