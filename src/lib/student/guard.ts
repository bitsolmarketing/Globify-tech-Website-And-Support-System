import 'server-only'

import { redirect } from 'next/navigation'

import { auth } from '@/auth'

/**
 * The student-side mirror of `@/lib/admin/guard`, and it exists for the same
 * reason: middleware protects *pages*, but a server action is its own POST
 * endpoint reachable from anywhere, so every mutation re-checks rather than
 * inherits.
 *
 * The role is checked in both directions. An admin session must not satisfy a
 * student guard any more than the reverse — not because staff are untrusted,
 * but because an action that silently accepts either identity has no single
 * `studentId` to attribute its writes to, and would file an enrollment against
 * an admin user id that no `students` row will ever match.
 */
export type StudentSession = { id: string; email: string; name: string }

export async function getStudentSession(): Promise<StudentSession | null> {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== 'student') return null

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
  }
}

/**
 * For pages and actions that have no meaning without a student.
 *
 * `next` is carried through so a deep link survives the round trip to the login
 * form — the same continuation the middleware sets, repeated here because a
 * server action reaching this point never went through the middleware at all.
 */
export async function requireStudent(next?: string): Promise<StudentSession> {
  const student = await getStudentSession()
  if (student) return student

  const target = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
  redirect(target)
}

export type StudentActionResult = { ok: true } | { ok: false; error: string }

/**
 * Uniform error handling for student-facing mutations, matching `runAction` in
 * the admin guard — a form never sees a raw driver exception, and `redirect()`
 * keeps working through it.
 */
export async function runStudentAction(
  fn: (student: StudentSession) => Promise<void>,
): Promise<StudentActionResult> {
  try {
    const student = await getStudentSession()
    if (!student) return { ok: false, error: 'Please sign in to continue.' }

    await fn(student)
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

    console.error('[student] action failed', error)

    /*
     * Driver messages are not shown to students. An admin reading "duplicate
     * key value violates unique constraint" can act on it; a student cannot,
     * and the constraint names leak the schema to the public internet.
     */
    const message =
      error instanceof Error && /duplicate key|unique constraint/i.test(error.message)
        ? 'You have already started this — check your dashboard.'
        : 'Something went wrong. Please try again, or contact us on WhatsApp.'

    return { ok: false, error: message }
  }
}
