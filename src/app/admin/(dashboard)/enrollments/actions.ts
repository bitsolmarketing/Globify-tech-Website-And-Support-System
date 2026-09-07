'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'

import { getDb } from '@/db'
import { enrollments, payments, subscriptions, type EnrollmentStatus } from '@/db/schema'
import { requireAdmin, runAction, type ActionResult } from '@/lib/admin/guard'
import { intervalDurationDays } from '@/lib/plans'

/**
 * The review desk: where a claimed payment becomes real access.
 *
 * This is the only place in the application that can set an enrollment to
 * `active` or a subscription to anything but `pending`. Students can file a
 * claim and nothing more — see `src/app/(account)/actions.ts` — so every grant
 * of access in the system passes through one of the functions below, made by a
 * named administrator, and is stamped with who made it.
 *
 * Each grant is wrapped in a transaction because it is two writes that must not
 * come apart: marking the payment approved and opening the thing it paid for.
 * Half of that is a student who has been charged and has nothing, or access
 * nobody can account for.
 */

/** Approve a payment claim and open whatever it was for. */
export async function approvePayment(paymentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const db = getDb()

    await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1)
        /*
         * Locks the row for the length of the transaction. Two admins opening
         * the review queue at once is ordinary, and without this both could
         * read the same `submitted` claim and both extend the subscription —
         * one payment, two months of access. The second now waits, re-reads,
         * and finds it already approved.
         */
        .for('update')

      if (!payment) throw new Error('That payment no longer exists.')
      if (payment.status === 'approved') return

      await tx
        .update(payments)
        .set({
          status: 'approved',
          reviewedBy: admin.email,
          reviewedAt: new Date(),
          reviewNote: null,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId))

      if (payment.enrollmentId) {
        await tx
          .update(enrollments)
          .set({ status: 'active', activatedAt: new Date(), updatedAt: new Date() })
          .where(eq(enrollments.id, payment.enrollmentId))
      }

      if (payment.subscriptionId) {
        const [subscription] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, payment.subscriptionId))
          .limit(1)

        if (subscription) {
          /*
           * The term starts now, not when the student clicked buy. They may
           * have waited a day for this confirmation, and charging them for the
           * wait would be the site quietly keeping the difference.
           */
          const startedAt = new Date()
          const expiresAt = new Date(startedAt)
          expiresAt.setDate(expiresAt.getDate() + intervalDurationDays(subscription.interval))

          await tx
            .update(subscriptions)
            .set({ status: 'active', startedAt, expiresAt, updatedAt: new Date() })
            .where(eq(subscriptions.id, subscription.id))
        }
      }
    })

    sweep()
  })
}

/**
 * Reject a claim, with a reason.
 *
 * The reason is required, and it is shown to the student on their dashboard.
 * "Rejected" with no explanation, to someone who believes they have sent money,
 * produces a phone call the admissions team has to take anyway — and an
 * unexplained rejection is indistinguishable from a mistake.
 */
export async function rejectPayment(paymentId: string, reason: string): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()

    const note = reason.trim()
    if (note.length < 4) throw new Error('Give the student a reason for the rejection.')

    await getDb()
      .update(payments)
      .set({
        status: 'rejected',
        reviewNote: note.slice(0, 1000),
        reviewedBy: admin.email,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId))

    /* The enrollment is deliberately left `pending` rather than moved to
       `rejected`. The seat is still wanted; it is the payment that failed, and
       the student can upload a corrected receipt against the same row. */
    sweep()
  })
}

/**
 * Set an enrollment's status by hand.
 *
 * The escape hatch for everything the payment flow does not model: a student
 * who paid in cash before this system existed, a seat given as a scholarship, a
 * course someone has finished. `activatedAt` is filled in on the way to
 * `active` so the record still says when access began, however it was granted.
 */
export async function setEnrollmentStatus(
  id: string,
  status: EnrollmentStatus,
): Promise<ActionResult> {
  return runAction(async () => {
    await getDb()
      .update(enrollments)
      .set({
        status,
        ...(status === 'active' ? { activatedAt: new Date() } : {}),
        ...(status === 'completed' ? { completedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, id))

    sweep()
  })
}

/** Admin-only note against an enrollment. Never shown to the student. */
export async function saveEnrollmentNote(id: string, notes: string): Promise<ActionResult> {
  return runAction(async () => {
    await getDb()
      .update(enrollments)
      .set({ notes: notes.trim().slice(0, 2000) || null, updatedAt: new Date() })
      .where(eq(enrollments.id, id))

    sweep()
  })
}

/**
 * No `revalidateTag` here.
 *
 * None of these tables is read through the tagged data cache — per-student rows
 * must never share a cache entry — so there is no tag to drop. What does need
 * clearing is the rendered output of the screens that show this data, and the
 * student's own dashboard, which is otherwise free to serve the router cache
 * entry it already has.
 */
function sweep() {
  revalidatePath('/admin/enrollments')
  revalidatePath('/admin/students')
  revalidatePath('/admin')
  revalidatePath('/dashboard')
}
