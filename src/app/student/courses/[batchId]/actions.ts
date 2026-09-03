'use server'

import { revalidatePath } from 'next/cache'

import { setModuleProgress } from '@/lib/data/student'
import { runPortalAction, type PortalActionResult } from '@/lib/portal/guard'

/**
 * Tick or untick one curriculum module.
 *
 * `runPortalAction('student', …)` re-authorises inside the action rather than
 * trusting the page that rendered the checkbox — a server action is a POST to
 * its own endpoint and is reachable without ever loading that page. The
 * student id comes from the session it verifies, never from the form, so the
 * only enrolment this can touch is the caller's own.
 */
export async function toggleModuleAction(
  batchId: string,
  moduleIndex: number,
  moduleTitle: string,
  completed: boolean,
): Promise<PortalActionResult> {
  return runPortalAction('student', async (user) => {
    await setModuleProgress(user.id, batchId, moduleIndex, moduleTitle, completed)
    revalidatePath(`/student/courses/${batchId}`)
    revalidatePath('/student')
  })
}
