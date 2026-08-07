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

/** Uniform error handling so a form never sees a raw driver exception. */
export async function runAction(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await requireAdmin()
    await fn()
    return { ok: true }
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
