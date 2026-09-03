import 'server-only'

import { notFound, redirect } from 'next/navigation'

import { portalAuth } from '@/portal-auth'
import { PORTAL_HOME } from '@/portal-auth.config'
import type { PortalRole } from '@/db/schema'

/**
 * The authorisation floor for everything under `/student` and `/instructor`.
 *
 * The middleware already gates these paths, but a server action is a POST to
 * its own endpoint and is reachable regardless of which page the caller was
 * on — so every action re-checks here rather than inheriting the page's
 * verdict. This is the same reasoning as `src/lib/admin/guard.ts`; the portal
 * needs its own copy because it reads a different session cookie.
 */

export type PortalPrincipal = {
  id: string
  email: string
  name: string
  role: PortalRole
}

/** Signed in as either role, or a redirect to the portal login. */
export async function requirePortalUser(): Promise<PortalPrincipal> {
  const session = await portalAuth()

  if (!session?.user?.id || !session.portalRole) redirect('/portal/login')

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    role: session.portalRole,
  }
}

/**
 * Signed in *and* holding the given role.
 *
 * A wrong-role visitor is sent to their own dashboard rather than shown a 403:
 * the overwhelmingly likely cause is a stale bookmark or a shared link, and
 * the middleware has already turned away anything that is not signed in.
 */
async function requireRole(role: PortalRole): Promise<PortalPrincipal> {
  const user = await requirePortalUser()
  if (user.role !== role) redirect(PORTAL_HOME[user.role])
  return user
}

export function requireStudent(): Promise<PortalPrincipal> {
  return requireRole('student')
}

export function requireInstructor(): Promise<PortalPrincipal> {
  return requireRole('instructor')
}

export type PortalActionResult = { ok: true; message?: string } | { ok: false; error: string }

/**
 * Uniform error handling for portal server actions, so a form never sees a raw
 * driver exception and a thrown authorisation failure never reads as a bug.
 *
 * `fn` receives the caller, already checked against `role`. Actions therefore
 * cannot forget to authorise: there is no way to get the principal without the
 * check having run.
 */
export async function runPortalAction(
  role: PortalRole,
  fn: (user: PortalPrincipal) => Promise<string | void>,
): Promise<PortalActionResult> {
  try {
    const user = await requireRole(role)
    const message = await fn(user)
    return typeof message === 'string' ? { ok: true, message } : { ok: true }
  } catch (error) {
    /* `redirect()` throws a control-flow signal that must not be swallowed. */
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }

    console.error('[portal] action failed', error)

    const message =
      error instanceof Error && /duplicate key|unique constraint/i.test(error.message)
        ? 'That record already exists.'
        : error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'

    return { ok: false, error: message }
  }
}

/**
 * Thrown by the data layer when a caller asks for a row that exists but is not
 * theirs — an instructor opening another instructor's batch, a student opening
 * someone else's submission.
 *
 * A distinct type so the pages can answer with `notFound()` rather than a
 * generic error, which is also the right answer for privacy: "not yours" and
 * "does not exist" should be indistinguishable from outside.
 */
export class PortalAccessError extends Error {
  constructor(message = 'Not found') {
    super(message)
    this.name = 'PortalAccessError'
  }
}

/**
 * Turns "not yours" into a 404 for a page.
 *
 * Every detail page wraps its load in this, so the URL of a batch, assignment
 * or quiz belonging to somebody else answers exactly as an invented id does.
 * Anything that is not an access failure is rethrown untouched — a dead
 * database must not present as a missing page.
 */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof PortalAccessError) notFound()
    throw error
  }
}
