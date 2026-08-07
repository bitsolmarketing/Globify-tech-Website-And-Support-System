'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { SUBSCRIBER_STATUSES } from '@/db/schema'
import { runAction, type ActionResult } from '@/lib/admin/guard'
import { deleteSubscriber, setSubscriberStatus } from '@/lib/data/subscribers'

const statusSchema = z.enum(SUBSCRIBER_STATUSES)

export async function toggleSubscriberStatus(id: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    await setSubscriberStatus(id, statusSchema.parse(status))
    revalidatePath('/admin/subscribers')
    revalidatePath('/admin')
  })
}

export async function removeSubscriber(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteSubscriber(id)
    revalidatePath('/admin/subscribers')
    revalidatePath('/admin')
  })
}
