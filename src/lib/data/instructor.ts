import 'server-only'

import { randomUUID } from 'node:crypto'

import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm'

import { getDb } from '@/db'
import {
  announcements,
  assignments,
  attendance,
  batches,
  certificates,
  classSessions,
  enrollments,
  materials,
  moduleProgress,
  portalUsers,
  quizAttempts,
  quizzes,
  submissions,
  type AnnouncementRow,
  type AssignmentRow,
  type AttendanceStatus,
  type BatchRow,
  type CertificateRow,
  type ClassSessionRow,
  type MaterialRow,
  type MaterialType,
  type QuizAttemptRow,
  type QuizQuestion,
  type QuizRow,
  type SubmissionRow,
} from '@/db/schema'
import { getCourses } from '@/lib/data/courses'
import { getBatchForInstructor, listBatchStudents, type EnrolledStudent } from '@/lib/data/portal'
import {
  certificateEligibility,
  certificateSerial,
  computeGrade,
  percent,
  tallyAttendance,
  type AttendanceTally,
  type CertificateEligibility,
  type Grade,
} from '@/lib/portal/grading'
import { PortalAccessError } from '@/lib/portal/guard'

/**
 * The instructor half of the portal.
 *
 * Same rule as `student.ts`, from the other side: the instructor id is a
 * parameter of every read and every write, and each one routes through
 * `getBatchForInstructor` before it touches a cohort. An instructor is trusted
 * with a great deal — attendance, marks, certificates — but only for the
 * batches assigned to them, and that boundary is enforced here rather than in
 * the pages that happen to render it.
 */

/* ---------------------------------------------------------------- Ownership */

/** Throws unless this instructor leads the batch. Every write starts here. */
async function ownedBatch(instructorId: string, batchId: string): Promise<BatchRow> {
  return getBatchForInstructor(batchId, instructorId)
}

async function ownedBatchIds(instructorId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ id: batches.id })
    .from(batches)
    .where(eq(batches.instructorId, instructorId))

  return rows.map((row) => row.id)
}

/* ------------------------------------------------------------------ Batches */

export type InstructorBatch = {
  batch: BatchRow
  studentCount: number
  /** Submitted but not yet marked — the number that becomes a to-do list. */
  ungraded: number
  /** Sessions in the past with no attendance saved. */
  unmarkedSessions: number
  nextSession: ClassSessionRow | null
}

export async function listInstructorBatches(instructorId: string): Promise<InstructorBatch[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(batches)
    .where(eq(batches.instructorId, instructorId))
    .orderBy(desc(batches.startDate))

  if (rows.length === 0) return []

  const ids = rows.map((row) => row.id)
  const now = new Date()

  const [counts, ungradedRows, unmarkedRows, upcoming] = await Promise.all([
    db
      .select({ batchId: enrollments.batchId, total: count() })
      .from(enrollments)
      .where(and(inArray(enrollments.batchId, ids), eq(enrollments.status, 'active')))
      .groupBy(enrollments.batchId),
    db
      .select({ batchId: submissions.batchId, total: count() })
      .from(submissions)
      .where(and(inArray(submissions.batchId, ids), eq(submissions.status, 'submitted')))
      .groupBy(submissions.batchId),
    db
      .select({ batchId: classSessions.batchId, total: count() })
      .from(classSessions)
      .where(
        and(
          inArray(classSessions.batchId, ids),
          lte(classSessions.scheduledAt, now),
          isNull(classSessions.attendanceMarkedAt),
          eq(classSessions.status, 'scheduled'),
        ),
      )
      .groupBy(classSessions.batchId),
    db
      .select()
      .from(classSessions)
      .where(
        and(
          inArray(classSessions.batchId, ids),
          gte(classSessions.scheduledAt, now),
          eq(classSessions.status, 'scheduled'),
        ),
      )
      .orderBy(asc(classSessions.scheduledAt)),
  ])

  const asMap = (source: { batchId: string; total: number }[]) =>
    new Map(source.map((row) => [row.batchId, Number(row.total)]))

  const studentCounts = asMap(counts)
  const ungraded = asMap(ungradedRows)
  const unmarked = asMap(unmarkedRows)

  return rows.map((batch) => ({
    batch,
    studentCount: studentCounts.get(batch.id) ?? 0,
    ungraded: ungraded.get(batch.id) ?? 0,
    unmarkedSessions: unmarked.get(batch.id) ?? 0,
    nextSession: upcoming.find((session) => session.batchId === batch.id) ?? null,
  }))
}

/* -------------------------------------------------------------------- Roster */

export type RosterEntry = {
  student: EnrolledStudent
  attendance: AttendanceTally
  grade: Grade
  modulesCompleted: number
  modulesTotal: number
  progress: number
  submitted: number
  ungraded: number
  assignmentsTotal: number
  certificate: CertificateRow | null
  eligibility: CertificateEligibility
}

/**
 * The whole cohort with every derived number, in a fixed six queries.
 *
 * This is the page an instructor actually works from, so it carries the
 * eligibility verdict too — deciding who can be certified is otherwise a
 * per-student page visit, and a class of thirty makes that unusable.
 */
export async function getBatchRoster(
  instructorId: string,
  batchId: string,
): Promise<{ batch: BatchRow; entries: RosterEntry[] }> {
  const batch = await ownedBatch(instructorId, batchId)
  const db = getDb()

  const students = await listBatchStudents(batchId)
  if (students.length === 0) return { batch, entries: [] }

  const studentIds = students.map((row) => row.studentId)
  const enrollmentIds = students.map((row) => row.id)

  const [courses, attendanceRows, assignmentRows, submissionRows, quizRows, attemptRows, progressRows, certificateRows] =
    await Promise.all([
      getCourses(),
      db
        .select()
        .from(attendance)
        .where(and(eq(attendance.batchId, batchId), inArray(attendance.studentId, studentIds))),
      db
        .select()
        .from(assignments)
        .where(and(eq(assignments.batchId, batchId), isNotNull(assignments.publishedAt))),
      db
        .select()
        .from(submissions)
        .where(and(eq(submissions.batchId, batchId), inArray(submissions.studentId, studentIds))),
      db.select().from(quizzes).where(and(eq(quizzes.batchId, batchId), isNotNull(quizzes.publishedAt))),
      db
        .select()
        .from(quizAttempts)
        .where(and(eq(quizAttempts.batchId, batchId), inArray(quizAttempts.studentId, studentIds))),
      db.select().from(moduleProgress).where(inArray(moduleProgress.enrollmentId, enrollmentIds)),
      db.select().from(certificates).where(inArray(certificates.enrollmentId, enrollmentIds)),
    ])

  const curriculum = courses.find((course) => course.slug === batch.courseSlug)?.curriculum ?? []
  const certificateByEnrollment = new Map(certificateRows.map((row) => [row.enrollmentId, row]))

  const entries = students.map((student) => {
    const own = (rows: { studentId: string }[]) =>
      rows.filter((row) => row.studentId === student.studentId)

    const mySubmissions = own(submissionRows) as SubmissionRow[]
    const myAttempts = own(attemptRows) as QuizAttemptRow[]
    const submissionByAssignment = new Map(mySubmissions.map((row) => [row.assignmentId, row]))

    const bestByQuiz = new Map<string, QuizAttemptRow>()
    for (const attempt of myAttempts) {
      if (!attempt.submittedAt) continue
      const current = bestByQuiz.get(attempt.quizId)
      if (!current || attempt.score > current.score) bestByQuiz.set(attempt.quizId, attempt)
    }

    const grade = computeGrade({
      assignments: assignmentRows.map((assignment) => ({
        score: submissionByAssignment.get(assignment.id)?.score ?? null,
        maxScore: assignment.maxScore,
        weight: assignment.weight,
      })),
      quizzes: quizRows.map((quiz) => ({
        score: bestByQuiz.get(quiz.id)?.score ?? null,
        maxScore: bestByQuiz.get(quiz.id)?.maxScore ?? 0,
        weight: quiz.weight,
      })),
    })

    const attendanceTally = tallyAttendance(
      attendanceRows.filter((row) => row.studentId === student.studentId).map((row) => row.status),
    )

    const modulesCompleted = progressRows.filter((row) => row.enrollmentId === student.id).length
    const ungraded = mySubmissions.filter((row) => row.status === 'submitted').length

    return {
      student,
      attendance: attendanceTally,
      grade,
      modulesCompleted,
      modulesTotal: curriculum.length,
      progress: percent(modulesCompleted, curriculum.length),
      submitted: mySubmissions.length,
      ungraded,
      assignmentsTotal: assignmentRows.length,
      certificate: certificateByEnrollment.get(student.id) ?? null,
      eligibility: certificateEligibility({
        grade,
        attendanceRate: attendanceTally.rate,
        modulesCompleted,
        modulesTotal: curriculum.length,
        ungradedSubmissions: ungraded,
      }),
    }
  })

  return { batch, entries }
}

/* ----------------------------------------------------------------- Sessions */

export async function listSessions(
  instructorId: string,
  batchId: string,
): Promise<ClassSessionRow[]> {
  await ownedBatch(instructorId, batchId)
  return getDb()
    .select()
    .from(classSessions)
    .where(eq(classSessions.batchId, batchId))
    .orderBy(desc(classSessions.scheduledAt))
}

export type NewSession = {
  title: string
  topic?: string | null
  scheduledAt: Date
  durationMinutes: number
  meetingUrl?: string | null
}

export async function createSession(
  instructorId: string,
  batchId: string,
  input: NewSession,
): Promise<ClassSessionRow> {
  await ownedBatch(instructorId, batchId)

  const [row] = await getDb()
    .insert(classSessions)
    .values({
      id: randomUUID(),
      batchId,
      title: input.title.trim(),
      topic: input.topic?.trim() || null,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      meetingUrl: input.meetingUrl?.trim() || null,
    })
    .returning()

  return row
}

export async function updateSession(
  instructorId: string,
  sessionId: string,
  patch: Partial<NewSession> & { status?: ClassSessionRow['status']; recordingUrl?: string | null },
): Promise<void> {
  const session = await ownedSession(instructorId, sessionId)

  const values: Record<string, unknown> = {}
  if (patch.title !== undefined) values.title = patch.title.trim()
  if (patch.topic !== undefined) values.topic = patch.topic?.trim() || null
  if (patch.scheduledAt !== undefined) values.scheduledAt = patch.scheduledAt
  if (patch.durationMinutes !== undefined) values.durationMinutes = patch.durationMinutes
  if (patch.meetingUrl !== undefined) values.meetingUrl = patch.meetingUrl?.trim() || null
  if (patch.recordingUrl !== undefined) values.recordingUrl = patch.recordingUrl?.trim() || null
  if (patch.status !== undefined) values.status = patch.status

  if (Object.keys(values).length === 0) return
  await getDb().update(classSessions).set(values).where(eq(classSessions.id, session.id))
}

export async function deleteSession(instructorId: string, sessionId: string): Promise<void> {
  const session = await ownedSession(instructorId, sessionId)
  const db = getDb()

  /* Attendance rows would otherwise outlive the class they describe and go on
     counting toward every student's rate — with no session left to explain
     where the marks came from. */
  await db.delete(attendance).where(eq(attendance.sessionId, session.id))
  await db.delete(classSessions).where(eq(classSessions.id, session.id))
}

async function ownedSession(instructorId: string, sessionId: string): Promise<ClassSessionRow> {
  const [row] = await getDb()
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1)

  if (!row) throw new PortalAccessError()
  await ownedBatch(instructorId, row.batchId)
  return row
}

/* --------------------------------------------------------------- Attendance */

export type AttendanceSheet = {
  session: ClassSessionRow
  batch: BatchRow
  rows: { student: EnrolledStudent; status: AttendanceStatus | null; note: string | null }[]
}

export async function getAttendanceSheet(
  instructorId: string,
  sessionId: string,
): Promise<AttendanceSheet> {
  const session = await ownedSession(instructorId, sessionId)
  const batch = await ownedBatch(instructorId, session.batchId)

  const [students, records] = await Promise.all([
    listBatchStudents(session.batchId),
    getDb().select().from(attendance).where(eq(attendance.sessionId, sessionId)),
  ])

  const byStudent = new Map(records.map((row) => [row.studentId, row]))

  return {
    session,
    batch,
    rows: students.map((student) => ({
      student,
      status: byStudent.get(student.studentId)?.status ?? null,
      note: byStudent.get(student.studentId)?.note ?? null,
    })),
  }
}

/**
 * Save a whole register in one go.
 *
 * Written as an upsert per student inside a transaction rather than
 * delete-then-insert: a register is edited far more often than it is first
 * taken — a student turns up late, an absence is later excused — and the
 * delete-first shape leaves a window where the class has no attendance at all.
 */
export async function saveAttendance(
  instructorId: string,
  sessionId: string,
  marks: { studentId: string; status: AttendanceStatus; note?: string | null }[],
): Promise<void> {
  const session = await ownedSession(instructorId, sessionId)

  /* Only students actually on this batch, so a tampered form cannot mark
     someone who is not in the room. */
  const allowed = new Set((await listBatchStudents(session.batchId)).map((row) => row.studentId))
  const valid = marks.filter((mark) => allowed.has(mark.studentId))
  if (valid.length === 0) return

  const db = getDb()

  await db.transaction(async (tx) => {
    for (const mark of valid) {
      await tx
        .insert(attendance)
        .values({
          id: randomUUID(),
          sessionId,
          batchId: session.batchId,
          studentId: mark.studentId,
          status: mark.status,
          note: mark.note?.trim() || null,
          markedById: instructorId,
        })
        .onConflictDoUpdate({
          target: [attendance.sessionId, attendance.studentId],
          set: {
            status: mark.status,
            note: mark.note?.trim() || null,
            markedById: instructorId,
            updatedAt: sql`now()`,
          },
        })
    }

    /* Taking the register is also what marks the class as having happened —
       the two are the same event, and leaving `status` alone would keep the
       session on the "not yet marked" list for ever. */
    await tx
      .update(classSessions)
      .set({ attendanceMarkedAt: new Date(), status: 'held' })
      .where(eq(classSessions.id, sessionId))
  })
}

/* ---------------------------------------------------------------- Materials */

export async function listMaterials(
  instructorId: string,
  batchId: string,
): Promise<MaterialRow[]> {
  await ownedBatch(instructorId, batchId)
  return getDb()
    .select()
    .from(materials)
    .where(eq(materials.batchId, batchId))
    .orderBy(asc(materials.sortOrder), desc(materials.createdAt))
}

export async function createMaterial(
  instructorId: string,
  batchId: string,
  input: {
    title: string
    description?: string | null
    type: MaterialType
    url?: string | null
    body?: string | null
    moduleIndex?: number | null
  },
): Promise<void> {
  await ownedBatch(instructorId, batchId)

  await getDb().insert(materials).values({
    id: randomUUID(),
    batchId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    url: input.url?.trim() || null,
    body: input.body?.trim() || null,
    moduleIndex: input.moduleIndex ?? null,
    uploadedById: instructorId,
  })
}

export async function deleteMaterial(instructorId: string, materialId: string): Promise<void> {
  const [row] = await getDb().select().from(materials).where(eq(materials.id, materialId)).limit(1)
  if (!row) throw new PortalAccessError()
  await ownedBatch(instructorId, row.batchId)
  await getDb().delete(materials).where(eq(materials.id, materialId))
}

/* ------------------------------------------------------------ Announcements */

export async function listInstructorAnnouncements(
  instructorId: string,
  batchId?: string,
): Promise<(AnnouncementRow & { batchName: string | null })[]> {
  if (batchId) await ownedBatch(instructorId, batchId)

  const rows = await getDb()
    .select({ announcement: announcements, batchName: batches.name })
    .from(announcements)
    .leftJoin(batches, eq(batches.id, announcements.batchId))
    .where(
      batchId
        ? eq(announcements.batchId, batchId)
        : eq(announcements.authorId, instructorId),
    )
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(50)

  return rows.map((row) => ({ ...row.announcement, batchName: row.batchName }))
}

export async function createAnnouncement(
  instructor: { id: string; name: string },
  input: { batchId: string | null; title: string; body: string; pinned?: boolean },
): Promise<void> {
  if (input.batchId) await ownedBatch(instructor.id, input.batchId)

  await getDb().insert(announcements).values({
    id: randomUUID(),
    batchId: input.batchId,
    authorId: instructor.id,
    authorName: instructor.name,
    title: input.title.trim(),
    body: input.body.trim(),
    pinned: input.pinned ?? false,
  })
}

export async function deleteAnnouncement(instructorId: string, id: string): Promise<void> {
  const [row] = await getDb().select().from(announcements).where(eq(announcements.id, id)).limit(1)
  if (!row || row.authorId !== instructorId) throw new PortalAccessError()
  await getDb().delete(announcements).where(eq(announcements.id, id))
}

/* -------------------------------------------------------------- Assignments */

export type InstructorAssignment = {
  assignment: AssignmentRow
  batch: BatchRow
  submitted: number
  graded: number
  cohortSize: number
}

export async function listInstructorAssignments(
  instructorId: string,
  batchId?: string,
): Promise<InstructorAssignment[]> {
  const ids = batchId ? [(await ownedBatch(instructorId, batchId)).id] : await ownedBatchIds(instructorId)
  if (ids.length === 0) return []

  const db = getDb()
  const [rows, tallies, cohortSizes] = await Promise.all([
    db
      .select({ assignment: assignments, batch: batches })
      .from(assignments)
      .innerJoin(batches, eq(batches.id, assignments.batchId))
      .where(inArray(assignments.batchId, ids))
      .orderBy(desc(assignments.dueAt)),
    db
      .select({
        assignmentId: submissions.assignmentId,
        status: submissions.status,
        total: count(),
      })
      .from(submissions)
      .where(inArray(submissions.batchId, ids))
      .groupBy(submissions.assignmentId, submissions.status),
    db
      .select({ batchId: enrollments.batchId, total: count() })
      .from(enrollments)
      .where(and(inArray(enrollments.batchId, ids), eq(enrollments.status, 'active')))
      .groupBy(enrollments.batchId),
  ])

  const sizes = new Map(cohortSizes.map((row) => [row.batchId, Number(row.total)]))

  return rows.map(({ assignment, batch }) => {
    const mine = tallies.filter((row) => row.assignmentId === assignment.id)
    return {
      assignment,
      batch,
      submitted: mine.reduce((sum, row) => sum + Number(row.total), 0),
      graded: mine
        .filter((row) => row.status === 'graded')
        .reduce((sum, row) => sum + Number(row.total), 0),
      cohortSize: sizes.get(batch.id) ?? 0,
    }
  })
}

export type NewAssignment = {
  title: string
  brief: string
  attachmentUrl?: string | null
  dueAt: Date
  maxScore: number
  weight: number
  allowLate: boolean
  publish: boolean
}

export async function createAssignment(
  instructorId: string,
  batchId: string,
  input: NewAssignment,
): Promise<AssignmentRow> {
  await ownedBatch(instructorId, batchId)

  const [row] = await getDb()
    .insert(assignments)
    .values({
      id: randomUUID(),
      batchId,
      title: input.title.trim(),
      brief: input.brief.trim(),
      attachmentUrl: input.attachmentUrl?.trim() || null,
      dueAt: input.dueAt,
      maxScore: input.maxScore,
      weight: input.weight,
      allowLate: input.allowLate,
      publishedAt: input.publish ? new Date() : null,
      createdById: instructorId,
    })
    .returning()

  return row
}

export async function updateAssignment(
  instructorId: string,
  assignmentId: string,
  input: Partial<NewAssignment>,
): Promise<void> {
  const assignment = await ownedAssignment(instructorId, assignmentId)

  const values: Record<string, unknown> = {}
  if (input.title !== undefined) values.title = input.title.trim()
  if (input.brief !== undefined) values.brief = input.brief.trim()
  if (input.attachmentUrl !== undefined) values.attachmentUrl = input.attachmentUrl?.trim() || null
  if (input.dueAt !== undefined) values.dueAt = input.dueAt
  if (input.maxScore !== undefined) values.maxScore = input.maxScore
  if (input.weight !== undefined) values.weight = input.weight
  if (input.allowLate !== undefined) values.allowLate = input.allowLate
  if (input.publish !== undefined) {
    /* Re-publishing keeps the original timestamp: it is the date students were
       told about, and resetting it would reorder their list for no reason. */
    values.publishedAt = input.publish ? (assignment.publishedAt ?? new Date()) : null
  }

  if (Object.keys(values).length === 0) return
  await getDb().update(assignments).set(values).where(eq(assignments.id, assignmentId))
}

export async function deleteAssignment(instructorId: string, assignmentId: string): Promise<void> {
  await ownedAssignment(instructorId, assignmentId)
  const db = getDb()
  await db.delete(submissions).where(eq(submissions.assignmentId, assignmentId))
  await db.delete(assignments).where(eq(assignments.id, assignmentId))
}

async function ownedAssignment(
  instructorId: string,
  assignmentId: string,
): Promise<AssignmentRow> {
  const [row] = await getDb()
    .select()
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1)

  if (!row) throw new PortalAccessError()
  await ownedBatch(instructorId, row.batchId)
  return row
}

export type MarkingSheet = {
  assignment: AssignmentRow
  batch: BatchRow
  rows: { student: EnrolledStudent; submission: SubmissionRow | null }[]
}

/** Everyone on the batch, submitted or not — the gaps are the point. */
export async function getMarkingSheet(
  instructorId: string,
  assignmentId: string,
): Promise<MarkingSheet> {
  const assignment = await ownedAssignment(instructorId, assignmentId)
  const batch = await ownedBatch(instructorId, assignment.batchId)

  const [students, submitted] = await Promise.all([
    listBatchStudents(assignment.batchId),
    getDb().select().from(submissions).where(eq(submissions.assignmentId, assignmentId)),
  ])

  const byStudent = new Map(submitted.map((row) => [row.studentId, row]))

  return {
    assignment,
    batch,
    rows: students.map((student) => ({
      student,
      submission: byStudent.get(student.studentId) ?? null,
    })),
  }
}

/**
 * Record a mark.
 *
 * `resubmit` is a distinct outcome rather than a low score: it tells the
 * student the work is expected again, and it deliberately leaves the score
 * null so an unfinished piece does not drag the average while it is being
 * redone.
 */
export async function gradeSubmission(
  instructorId: string,
  submissionId: string,
  input: { score: number | null; feedback?: string | null; status: 'graded' | 'resubmit' },
): Promise<void> {
  const [row] = await getDb()
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!row) throw new PortalAccessError()
  const assignment = await ownedAssignment(instructorId, row.assignmentId)

  if (input.status === 'graded') {
    if (input.score === null) throw new Error('A mark is required.')
    if (input.score < 0 || input.score > assignment.maxScore) {
      throw new Error(`The mark must be between 0 and ${assignment.maxScore}.`)
    }
  }

  await getDb()
    .update(submissions)
    .set({
      status: input.status,
      score: input.status === 'graded' ? input.score : null,
      feedback: input.feedback?.trim() || null,
      gradedById: instructorId,
      gradedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId))
}

/* ------------------------------------------------------------------ Quizzes */

export type InstructorQuiz = {
  quiz: QuizRow
  batch: BatchRow
  attempted: number
  cohortSize: number
  averageScore: number | null
}

export async function listInstructorQuizzes(
  instructorId: string,
  batchId?: string,
): Promise<InstructorQuiz[]> {
  const ids = batchId ? [(await ownedBatch(instructorId, batchId)).id] : await ownedBatchIds(instructorId)
  if (ids.length === 0) return []

  const db = getDb()
  const [rows, attempts, cohortSizes] = await Promise.all([
    db
      .select({ quiz: quizzes, batch: batches })
      .from(quizzes)
      .innerJoin(batches, eq(batches.id, quizzes.batchId))
      .where(inArray(quizzes.batchId, ids))
      .orderBy(desc(quizzes.createdAt)),
    db
      .select()
      .from(quizAttempts)
      .where(and(inArray(quizAttempts.batchId, ids), isNotNull(quizAttempts.submittedAt))),
    db
      .select({ batchId: enrollments.batchId, total: count() })
      .from(enrollments)
      .where(and(inArray(enrollments.batchId, ids), eq(enrollments.status, 'active')))
      .groupBy(enrollments.batchId),
  ])

  const sizes = new Map(cohortSizes.map((row) => [row.batchId, Number(row.total)]))

  return rows.map(({ quiz, batch }) => {
    const best = bestPerStudent(attempts.filter((row) => row.quizId === quiz.id))

    return {
      quiz,
      batch,
      attempted: best.length,
      cohortSize: sizes.get(batch.id) ?? 0,
      averageScore:
        best.length === 0
          ? null
          : Math.round(
              best.reduce((sum, row) => sum + percent(row.score, row.maxScore), 0) / best.length,
            ),
    }
  })
}

function bestPerStudent(rows: QuizAttemptRow[]): QuizAttemptRow[] {
  const best = new Map<string, QuizAttemptRow>()
  for (const row of rows) {
    const current = best.get(row.studentId)
    if (!current || row.score > current.score) best.set(row.studentId, row)
  }
  return [...best.values()]
}

export type NewQuiz = {
  title: string
  description?: string | null
  questions: QuizQuestion[]
  timeLimitMinutes: number
  maxAttempts: number
  passScore: number
  weight: number
  dueAt: Date | null
  publish: boolean
}

export async function createQuiz(
  instructorId: string,
  batchId: string,
  input: NewQuiz,
): Promise<QuizRow> {
  await ownedBatch(instructorId, batchId)

  const [row] = await getDb()
    .insert(quizzes)
    .values({
      id: randomUUID(),
      batchId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      questions: input.questions,
      timeLimitMinutes: input.timeLimitMinutes,
      maxAttempts: input.maxAttempts,
      passScore: input.passScore,
      weight: input.weight,
      dueAt: input.dueAt,
      publishedAt: input.publish ? new Date() : null,
      createdById: instructorId,
    })
    .returning()

  return row
}

export async function updateQuiz(
  instructorId: string,
  quizId: string,
  input: Partial<NewQuiz>,
): Promise<void> {
  const quiz = await ownedQuiz(instructorId, quizId)

  const values: Record<string, unknown> = {}
  if (input.title !== undefined) values.title = input.title.trim()
  if (input.description !== undefined) values.description = input.description?.trim() || null
  if (input.questions !== undefined) values.questions = input.questions
  if (input.timeLimitMinutes !== undefined) values.timeLimitMinutes = input.timeLimitMinutes
  if (input.maxAttempts !== undefined) values.maxAttempts = input.maxAttempts
  if (input.passScore !== undefined) values.passScore = input.passScore
  if (input.weight !== undefined) values.weight = input.weight
  if (input.dueAt !== undefined) values.dueAt = input.dueAt
  if (input.publish !== undefined) {
    values.publishedAt = input.publish ? (quiz.publishedAt ?? new Date()) : null
  }

  if (Object.keys(values).length === 0) return
  await getDb().update(quizzes).set(values).where(eq(quizzes.id, quizId))
}

export async function deleteQuiz(instructorId: string, quizId: string): Promise<void> {
  await ownedQuiz(instructorId, quizId)
  const db = getDb()
  await db.delete(quizAttempts).where(eq(quizAttempts.quizId, quizId))
  await db.delete(quizzes).where(eq(quizzes.id, quizId))
}

async function ownedQuiz(instructorId: string, quizId: string): Promise<QuizRow> {
  const [row] = await getDb().select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1)
  if (!row) throw new PortalAccessError()
  await ownedBatch(instructorId, row.batchId)
  return row
}

export type QuizResults = {
  quiz: QuizRow
  batch: BatchRow
  rows: { student: EnrolledStudent; best: QuizAttemptRow | null; attempts: number }[]
  /** Per-question pass rate, which is what reveals a badly worded question. */
  questionStats: { question: QuizQuestion; correct: number; answered: number }[]
}

export async function getQuizResults(
  instructorId: string,
  quizId: string,
): Promise<QuizResults> {
  const quiz = await ownedQuiz(instructorId, quizId)
  const batch = await ownedBatch(instructorId, quiz.batchId)

  const [students, attempts] = await Promise.all([
    listBatchStudents(quiz.batchId),
    getDb()
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.quizId, quizId), isNotNull(quizAttempts.submittedAt))),
  ])

  const rows = students.map((student) => {
    const mine = attempts.filter((row) => row.studentId === student.studentId)
    const best = mine.reduce<QuizAttemptRow | null>(
      (winner, row) => (!winner || row.score > winner.score ? row : winner),
      null,
    )
    return { student, best, attempts: mine.length }
  })

  const questionStats = quiz.questions.map((question) => {
    let correct = 0
    let answered = 0

    for (const row of rows) {
      const answer = row.best?.answers.find((entry) => entry.questionId === question.id)
      if (!answer || answer.selectedIndex === null) continue
      answered += 1
      if (answer.selectedIndex === question.correctIndex) correct += 1
    }

    return { question, correct, answered }
  })

  return { quiz, batch, rows, questionStats }
}

/* ------------------------------------------------------------- Certificates */

/**
 * Issue a certificate for one enrolment.
 *
 * The eligibility check is re-run here against fresh data rather than trusting
 * what the roster page showed: the page may have been open for an hour, and a
 * mark changed since then would otherwise certify a score that no longer
 * exists. The grade is frozen onto the row at this moment — a certificate must
 * not change retrospectively when a later mark is amended.
 */
export async function issueCertificate(
  instructorId: string,
  batchId: string,
  studentId: string,
): Promise<CertificateRow> {
  const { batch, entries } = await getBatchRoster(instructorId, batchId)
  const entry = entries.find((row) => row.student.studentId === studentId)

  if (!entry) throw new PortalAccessError()
  if (entry.certificate) throw new Error('This student already has a certificate for this batch.')
  if (!entry.eligibility.eligible) {
    throw new Error(`Not eligible yet — ${entry.eligibility.reasons.join('; ')}.`)
  }

  const db = getDb()
  const [row] = await db
    .insert(certificates)
    .values({
      id: randomUUID(),
      enrollmentId: entry.student.id,
      studentId,
      batchId,
      serial: certificateSerial(),
      studentName: entry.student.studentName,
      courseTitle: batch.courseTitle,
      finalScore: entry.eligibility.score,
      grade: entry.eligibility.grade,
      issuedById: instructorId,
    })
    .returning()

  /* Completing the course and being certified for it are the same event. */
  await db
    .update(enrollments)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(enrollments.id, entry.student.id))

  return row
}

export async function revokeCertificate(
  instructorId: string,
  certificateId: string,
): Promise<void> {
  const [row] = await getDb()
    .select()
    .from(certificates)
    .where(eq(certificates.id, certificateId))
    .limit(1)

  if (!row) throw new PortalAccessError()
  await ownedBatch(instructorId, row.batchId)

  /* Revoked, never deleted. The serial has been printed and shared; a verifier
     presenting it must be told it was withdrawn, not that it never existed. */
  await getDb()
    .update(certificates)
    .set({ revokedAt: new Date() })
    .where(eq(certificates.id, certificateId))
}

export async function listInstructorCertificates(
  instructorId: string,
): Promise<(CertificateRow & { batchName: string | null })[]> {
  const ids = await ownedBatchIds(instructorId)
  if (ids.length === 0) return []

  const rows = await getDb()
    .select({ certificate: certificates, batchName: batches.name })
    .from(certificates)
    .leftJoin(batches, eq(batches.id, certificates.batchId))
    .where(inArray(certificates.batchId, ids))
    .orderBy(desc(certificates.issuedAt))

  return rows.map((row) => ({ ...row.certificate, batchName: row.batchName }))
}

/* ---------------------------------------------------------------- Dashboard */

export type InstructorDashboard = {
  batches: InstructorBatch[]
  activeStudents: number
  ungradedTotal: number
  unmarkedTotal: number
  upcoming: (ClassSessionRow & { batchName: string })[]
  recentSubmissions: (SubmissionRow & { studentName: string; assignmentTitle: string })[]
}

export async function getInstructorDashboard(instructorId: string): Promise<InstructorDashboard> {
  const batchList = await listInstructorBatches(instructorId)
  const ids = batchList.map((row) => row.batch.id)

  if (ids.length === 0) {
    return {
      batches: [],
      activeStudents: 0,
      ungradedTotal: 0,
      unmarkedTotal: 0,
      upcoming: [],
      recentSubmissions: [],
    }
  }

  const db = getDb()
  const now = new Date()

  const [upcomingRows, recent] = await Promise.all([
    db
      .select({ session: classSessions, batchName: batches.name })
      .from(classSessions)
      .innerJoin(batches, eq(batches.id, classSessions.batchId))
      .where(
        and(
          inArray(classSessions.batchId, ids),
          gte(classSessions.scheduledAt, now),
          eq(classSessions.status, 'scheduled'),
        ),
      )
      .orderBy(asc(classSessions.scheduledAt))
      .limit(6),
    db
      .select({
        submission: submissions,
        studentName: portalUsers.name,
        assignmentTitle: assignments.title,
      })
      .from(submissions)
      .innerJoin(portalUsers, eq(portalUsers.id, submissions.studentId))
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .where(and(inArray(submissions.batchId, ids), eq(submissions.status, 'submitted')))
      .orderBy(desc(submissions.submittedAt))
      .limit(8),
  ])

  return {
    batches: batchList,
    activeStudents: batchList.reduce((sum, row) => sum + row.studentCount, 0),
    ungradedTotal: batchList.reduce((sum, row) => sum + row.ungraded, 0),
    unmarkedTotal: batchList.reduce((sum, row) => sum + row.unmarkedSessions, 0),
    upcoming: upcomingRows.map((row) => ({ ...row.session, batchName: row.batchName })),
    recentSubmissions: recent.map((row) => ({
      ...row.submission,
      studentName: row.studentName,
      assignmentTitle: row.assignmentTitle,
    })),
  }
}
