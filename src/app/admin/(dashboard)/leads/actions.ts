'use server'

import { revalidatePath } from 'next/cache'

import { runAction, type ActionResult } from '@/lib/admin/guard'
import { leadStatusSchema } from '@/lib/admin/schemas'
import { deleteLead, setLeadNotes, setLeadStatus } from '@/lib/data/leads'

/**
 * Leads are admin-only data, so these revalidate `/admin` paths but never the
 * public site — nothing on the marketing pages reads a lead.
 */
export async function updateLeadStatus(id: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    await setLeadStatus(id, leadStatusSchema.parse(status))
    revalidatePath('/admin/leads')
    revalidatePath('/admin')
  })
}

export async function updateLeadNotes(id: string, notes: string): Promise<ActionResult> {
  return runAction(async () => {
    await setLeadNotes(id, notes)
    revalidatePath('/admin/leads')
  })
}

export async function removeLead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteLead(id)
    revalidatePath('/admin/leads')
    revalidatePath('/admin')
  })
}
