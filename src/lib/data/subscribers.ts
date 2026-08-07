import 'server-only'

import { randomUUID } from 'node:crypto'

import { count, desc, eq, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import { newsletterSubscribers, type SubscriberRow, type SubscriberStatus } from '@/db/schema'

/**
 * Re-subscribing is not an error: the unique index on the lower-cased email
 * absorbs the duplicate and flips a previously unsubscribed row back on.
 */
export async function createSubscriber(email: string, source = 'website-footer'): Promise<void> {
  await getDb()
    .insert(newsletterSubscribers)
    .values({ id: randomUUID(), email: email.trim().toLowerCase(), source })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: { status: 'subscribed', updatedAt: sql`now()` },
    })
}

export async function listSubscribers(limit = 5000): Promise<SubscriberRow[]> {
  return getDb()
    .select()
    .from(newsletterSubscribers)
    .orderBy(desc(newsletterSubscribers.createdAt))
    .limit(limit)
}

export async function countSubscribers(status: SubscriberStatus = 'subscribed'): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, status))

  return row?.value ?? 0
}

export async function setSubscriberStatus(id: string, status: SubscriberStatus): Promise<void> {
  await getDb()
    .update(newsletterSubscribers)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(newsletterSubscribers.id, id))
}

export async function deleteSubscriber(id: string): Promise<void> {
  await getDb().delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id))
}
