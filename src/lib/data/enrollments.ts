import 'server-only'

import { and, count, desc, eq, gt, ilike, inArray, or, sql, type SQL } from 'drizzle-orm'

import { getDb } from '@/db'
import {
  enrollments,
  payments,
  students,
  subscriptions,
  type EnrollmentRow,
  type EnrollmentStatus,
  type PaymentRow,
  type PaymentStatus,
  type StudentRow,
  type SubscriptionRow,
} from '@/db/schema'

/**
 * Reads for the student dashboard and the admin review screens.
 *
 * Nothing here goes through `dbRead`. That helper wraps `unstable_cache`, whose
 * entries are keyed by argument and shared across every visitor — which is the
 * right thing for a catalogue and precisely the wrong thing for "what has this
 * person paid for". One student's dashboard landing in another's cache slot is
 * a data leak, not a stale render, so these queries pay the round trip every
 * time and the pages that call them stay dynamic.
 */

/* -------------------------------------------------------------- Student --- */

export async function listStudentEnrollments(studentId: string): Promise<EnrollmentRow[]> {
  return getDb()
    .select()
    .from(enrollments)
    .where(eq(enrollments.studentId, studentId))
    .orderBy(desc(enrollments.createdAt))
}

export async function getStudentEnrollment(
  studentId: string,
  courseSlug: string,
): Promise<EnrollmentRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.courseSlug, courseSlug)))
    .limit(1)

  return row
}

/**
 * The student's live all-access subscription, if they have one.
 *
 * `expiresAt > now()` is part of the predicate rather than a check on the
 * result, so a subscription whose term has run out stops granting access the
 * moment it does — without waiting for something to sweep the table and flip
 * `status` to `expired`. That sweep is a convenience for the admin list; this
 * is the query access actually depends on, and it cannot be out of date.
 */
export async function getActiveSubscription(
  studentId: string,
): Promise<SubscriptionRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.studentId, studentId),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.expiresAt, sql`now()`),
      ),
    )
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1)

  return row
}

/** Every subscription the student has ever bought — the billing history. */
export async function listStudentSubscriptions(studentId: string): Promise<SubscriptionRow[]> {
  return getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.studentId, studentId))
    .orderBy(desc(subscriptions.createdAt))
}

export async function listStudentPayments(studentId: string): Promise<PaymentRow[]> {
  return getDb()
    .select()
    .from(payments)
    .where(eq(payments.studentId, studentId))
    .orderBy(desc(payments.createdAt))
}

/**
 * Whether this student may open this course.
 *
 * Two independent grants, and either is sufficient: an approved per-course
 * enrollment, or a live all-access subscription. Keeping it in one function
 * means the dashboard, the course page and any future player all answer the
 * question identically — the alternative is three call sites that agree until
 * one of them is edited.
 */
export async function hasCourseAccess(studentId: string, courseSlug: string): Promise<boolean> {
  const [enrollment, subscription] = await Promise.all([
    getStudentEnrollment(studentId, courseSlug),
    getActiveSubscription(studentId),
  ])

  if (enrollment && (enrollment.status === 'active' || enrollment.status === 'completed')) {
    return true
  }

  return Boolean(subscription)
}

/* ---------------------------------------------------------------- Admin --- */

/** An enrollment with the person attached — what the admin table renders. */
export type EnrollmentWithStudent = {
  enrollment: EnrollmentRow
  student: Pick<StudentRow, 'id' | 'name' | 'email' | 'phone'> | null
  /** The most recent payment claim against this enrollment, if any. */
  payment: PaymentRow | null
}

export type EnrollmentFilters = {
  status?: EnrollmentStatus
  courseSlug?: string
  search?: string
}

export async function listEnrollments(
  filters: EnrollmentFilters = {},
): Promise<EnrollmentWithStudent[]> {
  const db = getDb()

  const conditions: SQL[] = []
  if (filters.status) conditions.push(eq(enrollments.status, filters.status))
  if (filters.courseSlug) conditions.push(eq(enrollments.courseSlug, filters.courseSlug))

  if (filters.search) {
    const term = `%${filters.search.trim()}%`
    const match = or(
      ilike(students.name, term),
      ilike(students.email, term),
      ilike(enrollments.courseTitle, term),
    )
    if (match) conditions.push(match)
  }

  const rows = await db
    .select({ enrollment: enrollments, student: students })
    .from(enrollments)
    /* Left, not inner: an enrollment whose student row went missing is a bug
       worth seeing in the list rather than one silently filtered out of it. */
    .leftJoin(students, eq(students.id, enrollments.studentId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(enrollments.createdAt))
    .limit(500)

  return attachPayments(rows)
}

/**
 * Pulls the latest payment claim for a page of enrollments in one query.
 *
 * The obvious alternative — a payment lookup per row — is the N+1 that turns a
 * 200-row admin table into 201 round trips. One `IN` and a map does it once.
 */
async function attachPayments(
  rows: { enrollment: EnrollmentRow; student: StudentRow | null }[],
): Promise<EnrollmentWithStudent[]> {
  const ids = rows.map((row) => row.enrollment.id)

  const claims =
    ids.length > 0
      ? await getDb()
          .select()
          .from(payments)
          .where(inArray(payments.enrollmentId, ids))
          .orderBy(desc(payments.createdAt))
      : []

  /* Ordered newest first, so the first write for an id wins and later (older)
     claims for the same enrollment are skipped. */
  const latest = new Map<string, PaymentRow>()
  for (const claim of claims) {
    if (claim.enrollmentId && !latest.has(claim.enrollmentId)) {
      latest.set(claim.enrollmentId, claim)
    }
  }

  return rows.map(({ enrollment, student }) => ({
    enrollment,
    student: student
      ? { id: student.id, name: student.name, email: student.email, phone: student.phone }
      : null,
    payment: latest.get(enrollment.id) ?? null,
  }))
}

export async function countEnrollmentsByStatus(): Promise<Record<string, number>> {
  const rows = await getDb()
    .select({ status: enrollments.status, total: count() })
    .from(enrollments)
    .groupBy(enrollments.status)

  return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)]))
}

/** Payment claims waiting on a human. The number the admin nav badges. */
export async function countPendingPayments(): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(payments)
    .where(eq(payments.status, 'submitted'))

  return Number(row?.total ?? 0)
}

export type PaymentWithStudent = {
  payment: PaymentRow
  student: Pick<StudentRow, 'id' | 'name' | 'email' | 'phone'> | null
  enrollment: EnrollmentRow | null
  subscription: SubscriptionRow | null
}

export async function listPayments(status?: PaymentStatus): Promise<PaymentWithStudent[]> {
  const rows = await getDb()
    .select({
      payment: payments,
      student: students,
      enrollment: enrollments,
      subscription: subscriptions,
    })
    .from(payments)
    .leftJoin(students, eq(students.id, payments.studentId))
    .leftJoin(enrollments, eq(enrollments.id, payments.enrollmentId))
    .leftJoin(subscriptions, eq(subscriptions.id, payments.subscriptionId))
    .where(status ? eq(payments.status, status) : undefined)
    .orderBy(desc(payments.createdAt))
    .limit(500)

  return rows.map((row) => ({
    payment: row.payment,
    student: row.student
      ? {
          id: row.student.id,
          name: row.student.name,
          email: row.student.email,
          phone: row.student.phone,
        }
      : null,
    enrollment: row.enrollment,
    subscription: row.subscription,
  }))
}

export async function getPaymentById(id: string): Promise<PaymentRow | undefined> {
  const [row] = await getDb().select().from(payments).where(eq(payments.id, id)).limit(1)
  return row
}

/* ------------------------------------------------------------- Students --- */

export type StudentWithCounts = {
  student: StudentRow
  activeEnrollments: number
  totalEnrollments: number
}

export async function listStudents(search?: string): Promise<StudentWithCounts[]> {
  const db = getDb()

  const term = search?.trim()
  const where = term
    ? or(
        ilike(students.name, `%${term}%`),
        ilike(students.email, `%${term}%`),
        ilike(students.phone, `%${term}%`),
      )
    : undefined

  const rows = await db
    .select({
      student: students,
      totalEnrollments: sql<number>`count(${enrollments.id})`,
      activeEnrollments: sql<number>`count(*) filter (where ${enrollments.status} = 'active')`,
    })
    .from(students)
    .leftJoin(enrollments, eq(enrollments.studentId, students.id))
    .where(where)
    .groupBy(students.id)
    .orderBy(desc(students.createdAt))
    .limit(500)

  return rows.map((row) => ({
    student: row.student,
    /* `count()` comes back as a string from the driver on some builds — the
       aggregate is bigint in Postgres and node-postgres will not narrow it to
       a JS number on its own. */
    totalEnrollments: Number(row.totalEnrollments),
    activeEnrollments: Number(row.activeEnrollments),
  }))
}

export async function getStudentById(id: string): Promise<StudentRow | undefined> {
  const [row] = await getDb().select().from(students).where(eq(students.id, id)).limit(1)
  return row
}

export async function countStudents(): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(students)
  return Number(row?.total ?? 0)
}
