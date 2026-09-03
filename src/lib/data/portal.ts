import 'server-only'

import { randomUUID } from 'node:crypto'

import bcrypt from 'bcryptjs'
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import {
  batches,
  courses as coursesTable,
  enrollments,
  portalUsers,
  type BatchRow,
  type BatchStatus,
  type EnrollmentRow,
  type PortalRole,
  type PortalUserRow,
} from '@/db/schema'
import type { Course } from '@/lib/courses'
import { getCourses } from '@/lib/data/courses'
import { PortalAccessError } from '@/lib/portal/guard'

/**
 * Everything both wings of the portal need: accounts, batches, enrolments.
 *
 * Nothing here is wrapped in `unstable_cache`. The admin and marketing reads
 * can be, because they return the same rows to everybody; a portal read is
 * scoped to one signed-in person, and a cache keyed on the query alone would
 * hand one student's grades to the next. `react`'s `cache` is used instead
 * where a value is read twice in one render — it is per-request by
 * construction and cannot outlive the requester.
 */

/* ------------------------------------------------------------------ Passwords */

/** Cost 12, matching the admin seed. */
const BCRYPT_ROUNDS = 12

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * A temporary password for an admin-provisioned account.
 *
 * Read aloud over the phone as often as it is copied, so the alphabet drops
 * the characters that are ambiguous when spoken or printed. The account is
 * flagged `mustChangePassword`, so this value is only ever valid once.
 */
export function generateTempPassword(length = 12): string {
  const bytes = new Uint32Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => TEMP_ALPHABET[byte % TEMP_ALPHABET.length]).join('')
}

/* ------------------------------------------------------------------ Accounts */

export type NewPortalUser = {
  email: string
  name: string
  role: PortalRole
  password: string
  phone?: string | null
  headline?: string | null
  bio?: string | null
  authorSlug?: string | null
  mustChangePassword?: boolean
}

export async function createPortalUser(input: NewPortalUser): Promise<PortalUserRow> {
  const [row] = await getDb()
    .insert(portalUsers)
    .values({
      id: randomUUID(),
      /* Lower-cased here and in `authorize`, because Postgres compares text
         exactly and the unique index would otherwise let the same person
         register twice with a capital letter. */
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: await hashPassword(input.password),
      phone: input.phone?.trim() || null,
      headline: input.headline?.trim() || null,
      bio: input.bio?.trim() || null,
      authorSlug: input.authorSlug?.trim() || null,
      mustChangePassword: input.mustChangePassword ?? false,
    })
    .returning()

  return row
}

export async function getPortalUser(id: string): Promise<PortalUserRow | undefined> {
  const [row] = await getDb().select().from(portalUsers).where(eq(portalUsers.id, id)).limit(1)
  return row
}

export async function getPortalUserByEmail(email: string): Promise<PortalUserRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(portalUsers)
    .where(eq(portalUsers.email, email.trim().toLowerCase()))
    .limit(1)
  return row
}

export async function listPortalUsers(role?: PortalRole): Promise<PortalUserRow[]> {
  const query = getDb().select().from(portalUsers)
  const rows = role ? await query.where(eq(portalUsers.role, role)) : await query
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export type PortalProfilePatch = {
  name?: string
  phone?: string | null
  headline?: string | null
  bio?: string | null
  avatarUrl?: string | null
}

/**
 * The subset of the account a person may edit about themselves.
 *
 * `role`, `status` and `email` are absent on purpose: they are the three
 * fields that decide what the account can reach, and none of them belongs to
 * an endpoint the account holder controls.
 */
export async function updatePortalProfile(id: string, patch: PortalProfilePatch): Promise<void> {
  const values: Record<string, unknown> = {}
  if (patch.name !== undefined) values.name = patch.name.trim()
  if (patch.phone !== undefined) values.phone = patch.phone?.trim() || null
  if (patch.headline !== undefined) values.headline = patch.headline?.trim() || null
  if (patch.bio !== undefined) values.bio = patch.bio?.trim() || null
  if (patch.avatarUrl !== undefined) values.avatarUrl = patch.avatarUrl || null

  if (Object.keys(values).length === 0) return

  await getDb().update(portalUsers).set(values).where(eq(portalUsers.id, id))
}

/** Admin-side account edits — the fields `updatePortalProfile` refuses. */
export async function updatePortalAccount(
  id: string,
  patch: { name?: string; email?: string; role?: PortalRole; status?: 'active' | 'suspended'; authorSlug?: string | null },
): Promise<void> {
  const values: Record<string, unknown> = {}
  if (patch.name !== undefined) values.name = patch.name.trim()
  if (patch.email !== undefined) values.email = patch.email.trim().toLowerCase()
  if (patch.role !== undefined) values.role = patch.role
  if (patch.status !== undefined) values.status = patch.status
  if (patch.authorSlug !== undefined) values.authorSlug = patch.authorSlug?.trim() || null

  if (Object.keys(values).length === 0) return

  await getDb().update(portalUsers).set(values).where(eq(portalUsers.id, id))
}

/**
 * Change a password. `mustChange` is what separates the two callers: an admin
 * reset sets it, so the generated value cannot become permanent, and the
 * account holder choosing their own clears it.
 */
export async function setPortalPassword(
  id: string,
  plain: string,
  mustChange = false,
): Promise<void> {
  await getDb()
    .update(portalUsers)
    .set({ passwordHash: await hashPassword(plain), mustChangePassword: mustChange })
    .where(eq(portalUsers.id, id))
}

/** Verifies the current password before allowing a self-service change. */
export async function verifyPortalPassword(id: string, plain: string): Promise<boolean> {
  const user = await getPortalUser(id)
  if (!user) return false
  return bcrypt.compare(plain, user.passwordHash)
}

/* ------------------------------------------------------------------- Batches */

export type BatchWithInstructor = BatchRow & {
  instructorName: string
  instructorEmail: string
  /** Active enrolments only — the number that means "students in the room". */
  studentCount: number
}

/**
 * One query, one join, one grouped count. The alternative — list batches then
 * count each — is the N+1 that makes an eight-batch admin page eight round
 * trips to a pooled database.
 */
export async function listBatches(filter?: {
  instructorId?: string
  status?: BatchStatus
}): Promise<BatchWithInstructor[]> {
  const conditions = [
    filter?.instructorId ? eq(batches.instructorId, filter.instructorId) : undefined,
    filter?.status ? eq(batches.status, filter.status) : undefined,
  ].filter(Boolean)

  const rows = await getDb()
    .select({
      batch: batches,
      instructorName: portalUsers.name,
      instructorEmail: portalUsers.email,
    })
    .from(batches)
    .leftJoin(portalUsers, eq(portalUsers.id, batches.instructorId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(batches.startDate))

  const counts = await countActiveEnrollments(rows.map((row) => row.batch.id))

  return rows.map((row) => ({
    ...row.batch,
    instructorName: row.instructorName ?? 'Unassigned',
    instructorEmail: row.instructorEmail ?? '',
    studentCount: counts.get(row.batch.id) ?? 0,
  }))
}

async function countActiveEnrollments(batchIds: string[]): Promise<Map<string, number>> {
  if (batchIds.length === 0) return new Map()

  const rows = await getDb()
    .select({ batchId: enrollments.batchId, total: count() })
    .from(enrollments)
    .where(and(inArray(enrollments.batchId, batchIds), eq(enrollments.status, 'active')))
    .groupBy(enrollments.batchId)

  return new Map(rows.map((row) => [row.batchId, Number(row.total)]))
}

export async function getBatch(id: string): Promise<BatchRow | undefined> {
  const [row] = await getDb().select().from(batches).where(eq(batches.id, id)).limit(1)
  return row
}

/**
 * A batch the given instructor is actually allowed to open.
 *
 * Every instructor page funnels through this rather than through `getBatch`,
 * so a batch id typed into the address bar cannot expose another instructor's
 * cohort. It throws rather than returning undefined because the caller must
 * not be able to forget the check by ignoring a return value.
 */
export async function getBatchForInstructor(id: string, instructorId: string): Promise<BatchRow> {
  const batch = await getBatch(id)
  if (!batch || batch.instructorId !== instructorId) throw new PortalAccessError()
  return batch
}

export type NewBatch = {
  courseId: string
  courseSlug: string
  courseTitle: string
  code: string
  name: string
  instructorId: string
  startDate: string
  endDate?: string | null
  schedule?: string | null
  mode?: string
  capacity?: number
  meetingUrl?: string | null
  status?: BatchStatus
  notes?: string | null
}

export async function createBatch(input: NewBatch): Promise<BatchRow> {
  const [row] = await getDb()
    .insert(batches)
    .values({
      id: randomUUID(),
      ...input,
      code: input.code.trim().toUpperCase(),
      endDate: input.endDate || null,
      schedule: input.schedule?.trim() || null,
      meetingUrl: input.meetingUrl?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .returning()

  return row
}

export async function updateBatch(id: string, patch: Partial<NewBatch>): Promise<void> {
  const values: Record<string, unknown> = { ...patch }
  if (patch.code !== undefined) values.code = patch.code.trim().toUpperCase()
  if (Object.keys(values).length === 0) return
  await getDb().update(batches).set(values).where(eq(batches.id, id))
}

/* --------------------------------------------------------------- Enrolments */

export type EnrolledStudent = EnrollmentRow & {
  studentName: string
  studentEmail: string
  studentPhone: string | null
  avatarUrl: string | null
}

export async function listBatchStudents(
  batchId: string,
  includeDropped = false,
): Promise<EnrolledStudent[]> {
  const conditions = [eq(enrollments.batchId, batchId)]
  if (!includeDropped) conditions.push(inArray(enrollments.status, ['active', 'completed']))

  const rows = await getDb()
    .select({
      enrollment: enrollments,
      studentName: portalUsers.name,
      studentEmail: portalUsers.email,
      studentPhone: portalUsers.phone,
      avatarUrl: portalUsers.avatarUrl,
    })
    .from(enrollments)
    .innerJoin(portalUsers, eq(portalUsers.id, enrollments.studentId))
    .where(and(...conditions))
    .orderBy(asc(portalUsers.name))

  return rows.map((row) => ({
    ...row.enrollment,
    studentName: row.studentName,
    studentEmail: row.studentEmail,
    studentPhone: row.studentPhone,
    avatarUrl: row.avatarUrl,
  }))
}

/** The ids alone — what the attendance and grade queries actually need. */
export async function listBatchStudentIds(batchId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ id: enrollments.studentId })
    .from(enrollments)
    .where(and(eq(enrollments.batchId, batchId), inArray(enrollments.status, ['active', 'completed'])))

  return rows.map((row) => row.id)
}

export async function getEnrollment(
  batchId: string,
  studentId: string,
): Promise<EnrollmentRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.batchId, batchId), eq(enrollments.studentId, studentId)))
    .limit(1)

  return row
}

/**
 * Enrol a student, or revive an enrolment they had dropped.
 *
 * `ON CONFLICT` rather than a read-then-write: two admins converting the same
 * lead at the same time would otherwise both see "not enrolled" and one of the
 * inserts would fail on the unique index with a driver error nobody can act on.
 */
export async function enrollStudent(input: {
  batchId: string
  studentId: string
  leadId?: string | null
}): Promise<void> {
  await getDb()
    .insert(enrollments)
    .values({
      id: randomUUID(),
      batchId: input.batchId,
      studentId: input.studentId,
      leadId: input.leadId ?? null,
    })
    .onConflictDoUpdate({
      target: [enrollments.batchId, enrollments.studentId],
      set: { status: 'active', completedAt: null, updatedAt: sql`now()` },
    })
}

export async function setEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentRow['status'],
): Promise<void> {
  await getDb()
    .update(enrollments)
    .set({ status, completedAt: status === 'completed' ? new Date() : null })
    .where(eq(enrollments.id, enrollmentId))
}

/* ------------------------------------------------------ Course cross-lookups */

/**
 * The curriculum a batch teaches.
 *
 * Read through `getCourses()` rather than joining `courses`, so the portal
 * sees exactly what the public course page sees — including the seed-data
 * fallback that keeps a database-less clone working.
 */
export async function getBatchCourse(batch: BatchRow): Promise<Course | undefined> {
  const all = await getCourses()
  return all.find((course) => course.slug === batch.courseSlug)
}

export async function getBatchCurriculum(batch: BatchRow): Promise<Course['curriculum']> {
  return (await getBatchCourse(batch))?.curriculum ?? []
}

/** Course picker for the admin batch form — id included, which the seed lacks. */
export async function listCourseOptions(): Promise<
  { id: string; slug: string; title: string }[]
> {
  return getDb()
    .select({ id: coursesTable.id, slug: coursesTable.slug, title: coursesTable.title })
    .from(coursesTable)
    .orderBy(asc(coursesTable.title))
}
