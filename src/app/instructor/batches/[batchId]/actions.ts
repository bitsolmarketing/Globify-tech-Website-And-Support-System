'use server'

import { revalidatePath } from 'next/cache'

import {
  deleteMaterial,
  deleteSession,
  issueCertificate,
  updateSession,
} from '@/lib/data/instructor'
import { runPortalAction, type PortalActionResult } from '@/lib/portal/guard'

/**
 * The mutations reachable from the batch page.
 *
 * Every one goes through `runPortalAction('instructor', …)`, which re-reads the
 * session and hands back the caller — so the instructor id these functions pass
 * to the data layer is always the signed-in one and never a form field. The
 * data layer then checks that instructor owns the batch. Two independent
 * checks, and neither is skippable from here.
 */

export async function deleteSessionAction(
  batchId: string,
  sessionId: string,
): Promise<PortalActionResult> {
  return runPortalAction('instructor', async (user) => {
    await deleteSession(user.id, sessionId)
    revalidatePath(`/instructor/batches/${batchId}`)
    revalidatePath('/instructor/attendance')
  })
}

export async function cancelSessionAction(
  batchId: string,
  sessionId: string,
): Promise<PortalActionResult> {
  return runPortalAction('instructor', async (user) => {
    await updateSession(user.id, sessionId, { status: 'cancelled' })
    revalidatePath(`/instructor/batches/${batchId}`)
    revalidatePath('/instructor/attendance')
  })
}

export async function deleteMaterialAction(
  batchId: string,
  materialId: string,
): Promise<PortalActionResult> {
  return runPortalAction('instructor', async (user) => {
    await deleteMaterial(user.id, materialId)
    revalidatePath(`/instructor/batches/${batchId}`)
  })
}

export async function issueCertificateAction(
  batchId: string,
  studentId: string,
): Promise<PortalActionResult> {
  return runPortalAction('instructor', async (user) => {
    const certificate = await issueCertificate(user.id, batchId, studentId)

    revalidatePath(`/instructor/batches/${batchId}`)
    revalidatePath('/instructor/certificates')

    return `Certificate ${certificate.serial} issued`
  })
}
