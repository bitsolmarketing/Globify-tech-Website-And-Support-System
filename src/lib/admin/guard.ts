import 'server-only'

import { auth } from '@/auth'

/**
 * Every mutating server action calls this first.
 *
 * Middleware protects the `/admin` *pages*, but a server action is a POST to
 * its own endpoint and is reachable regardless of which page the caller was
 * on — so authorisation has to be re-checked here, not inherited.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error('Not authorised. Please sign in again.')
  }

  return { id: session.user.id, email: session.user.email ?? '' }
}

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * The same contract as `ActionResult`, for the actions that have something to
 * hand back — how many recipients a filter matched, how far a send got. A form
 * that has to call the action and then re-fetch to find out what it did has a
 * window in between where it shows the previous answer.
 */
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Uniform error handling so a form never sees a raw driver exception. */
export async function runDataAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    await requireAdmin()
    return { ok: true, data: await fn() }
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

    console.error('[admin] action failed', error)

    const message =
      error instanceof Error && /duplicate key|unique constraint/i.test(error.message)
        ? 'That slug is already taken. Choose a different one.'
        : error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'

    return { ok: false, error: message }
  }
}

/**
 * The common case: an action that either worked or did not.
 *
 * Defined in terms of `runDataAction` rather than beside it, so there is one
 * place that decides how an authorisation failure, a redirect signal and a
 * duplicate-key error are each handled. Two copies of that logic drift, and the
 * drift shows up as one form reporting a real error while another says
 * "something went wrong".
 */
export async function runAction(fn: () => Promise<void>): Promise<ActionResult> {
  const result = await runDataAction(fn)
  return result.ok ? { ok: true } : result
}
