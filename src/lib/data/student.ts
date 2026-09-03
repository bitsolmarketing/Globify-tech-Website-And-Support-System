import 'server-only'

import { randomUUID } from 'node:crypto'

import { and, asc, desc, eq, gt, inArray, isNotNull, or, sql } from 'drizzle-orm'

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
  type AttendanceRow,
  type BatchRow,
  type CertificateRow,
  type ClassSessionRow,
  type EnrollmentRow,
  type MaterialRow,
  type ModuleProgressRow,
  type QuizAnswer,
  type QuizAttemptRow,
  type QuizRow,
  type SubmissionRow,
} from '@/db/schema'
import type { Course } from '@/lib/courses'
import { getCourses } from '@/lib/data/courses'
import {
  computeGrade,
  percent,
  scoreQuizAttempt,
  tallyAttendance,
  type AttendanceTally,
  type Grade,
} from '@/lib/portal/grading'
import { PortalAccessError } from '@/lib/portal/guard'

/**
 * Everything a signed-in student can see, and nothing else.
 *
 * The rule the whole module is built around: a student id is a parameter of
 * every query, never a filter applied afterwards. There is no function here
 * that returns a row and leaves the ownership check to the page — a page that
 * forgot to check would then be a data leak, and pages are the easiest place
 * to forget.
 */

/* ------------------------------------------------------------- Ownership */

/** The enrolment, or `PortalAccessError` if this student has none. */
export async function requireEnrollment(
  studentId: string,
  batchId: string,
): Promise<EnrollmentRow> {
  const [row] = await getDb()
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.batchId, batchId), eq(enrollments.studentId, studentId)))
    .limit(1)

  if (!row || row.status === 'dropped') throw new PortalAccessError()
  return row
}

async function enrolledBatchIds(studentId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ batchId: enrollments.batchId })
    .from(enrollments)
    .where(
      and(eq(enrollments.studentId, studentId), inArray(enrollments.status, ['active', 'completed'])),
    )

  return rows.map((row) => row.batchId)
}

/* ---------------------------------------------------------------- Batches */

export type StudentBatch = {
  enrollment: EnrollmentRow
  batch: BatchRow
  instructorName: string
  curriculum: Course['curriculum']
  modulesTotal: number
  modulesCompleted: number
  /** Percentage of curriculum modules ticked off. */
  progress: number
  attendance: AttendanceTally
  grade: Grade
  nextSession: ClassSessionRow | null
  /** Published, not yet handed in, deadline still ahead. */
  openAssignments: number
  overdueAssignments: number
}

/**
 * Every batch this student is on, with the numbers their dashboard shows.
 *
 * Deliberately a fixed number of queries rather than one per batch: the naive
 * shape here is seven round trips *per cohort*, and a student on three courses
 * would pay twenty-one of them against a pooled connection.
 */
export async function listStudentBatches(studentId: string): Promise<StudentBatch[]> {
  const db = getDb()

  const enrolled = await db
    .select({ enrollment: enrollments, batch: batches, instructorName: portalUsers.name })
    .from(enrollments)
    .innerJoin(batches, eq(batches.id, enrollments.batchId))
    .leftJoin(portalUsers, eq(portalUsers.id, batches.instructorId))
    .where(
      and(eq(enrollments.studentId, studentId), inArray(enrollments.status, ['active', 'completed'])),
    )
    .orderBy(desc(batches.startDate))

  if (enrolled.length === 0) return []

  const batchIds = enrolled.map((row) => row.batch.id)
  const enrollmentIds = enrolled.map((row) => row.enrollment.id)
  const now = new Date()

  const [courses, progressRows, attendanceRows, sessionRows, assignmentRows, submissionRows, quizRows, attemptRows] =
    await Promise.all([
      getCourses(),
      db.select().from(moduleProgress).where(inArray(moduleProgress.enrollmentId, enrollmentIds)),
      db
        .select()
        .from(attendance)
        .where(and(inArray(attendance.batchId, batchIds), eq(attendance.studentId, studentId))),
      db
        .select()
        .from(classSessions)
        .where(
          and(
            inArray(classSessions.batchId, batchIds),
            gt(classSessions.scheduledAt, now),
            eq(classSessions.status, 'scheduled'),
          ),
        )
        .orderBy(asc(classSessions.scheduledAt)),
      db
        .select()
        .from(assignments)
        .where(and(inArray(assignments.batchId, batchIds), isNotNull(assignments.publishedAt))),
      db
        .select()
        .from(submissions)
        .where(and(inArray(submissions.batchId, batchIds), eq(submissions.studentId, studentId))),
      db
        .select()
        .from(quizzes)
        .where(and(inArray(quizzes.batchId, batchIds), isNotNull(quizzes.publishedAt))),
      db
        .select()
        .from(quizAttempts)
        .where(and(inArray(quizAttempts.batchId, batchIds), eq(quizAttempts.studentId, studentId))),
    ])

  const submissionByAssignment = new Map(submissionRows.map((row) => [row.assignmentId, row]))
  const bestAttempt = bestAttemptByQuiz(attemptRows)

  return enrolled.map(({ enrollment, batch, instructorName }) => {
    const curriculum = courses.find((course) => course.slug === batch.courseSlug)?.curriculum ?? []
    const completed = progressRows.filter((row) => row.enrollmentId === enrollment.id).length

    const batchAssignments = assignmentRows.filter((row) => row.batchId === batch.id)
    const batchQuizzes = quizRows.filter((row) => row.batchId === batch.id)

    const outstanding = batchAssignments.filter(
      (assignment) => !submissionByAssignment.has(assignment.id),
    )

    return {
      enrollment,
      batch,
      instructorName: instructorName ?? 'Unassigned',
      curriculum,
      modulesTotal: curriculum.length,
      modulesCompleted: completed,
      progress: percent(completed, curriculum.length),
      attendance: tallyAttendance(
        attendanceRows.filter((row) => row.batchId === batch.id).map((row) => row.status),
      ),
      grade: computeGrade({
        assignments: batchAssignments.map((assignment) => ({
          score: submissionByAssignment.get(assignment.id)?.score ?? null,
          maxScore: assignment.maxScore,
          weight: assignment.weight,
        })),
        quizzes: batchQuizzes.map((quiz) => ({
          score: bestAttempt.get(quiz.id)?.score ?? null,
          maxScore: bestAttempt.get(quiz.id)?.maxScore ?? 0,
          weight: quiz.weight,
        })),
      }),
      nextSession: sessionRows.find((row) => row.batchId === batch.id) ?? null,
      openAssignments: outstanding.filter((assignment) => assignment.dueAt > now).length,
      overdueAssignments: outstanding.filter((assignment) => assignment.dueAt <= now).length,
    }
  })
}

/**
 * The best attempt per quiz.
 *
 * "Best", not "latest": a student allowed three attempts is being invited to
 * improve, and marking them on the last one would punish a careless retry of
 * something they had already passed.
 */
function bestAttemptByQuiz(rows: QuizAttemptRow[]): Map<string, QuizAttemptRow> {
  const best = new Map<string, QuizAttemptRow>()

  for (const row of rows) {
    if (!row.submittedAt) continue
    const current = best.get(row.quizId)
    if (!current || row.score > current.score) best.set(row.quizId, row)
  }

  return best
}

export type StudentBatchDetail = StudentBatch & {
  completedModuleIndexes: number[]
  moduleRows: ModuleProgressRow[]
  sessions: ClassSessionRow[]
  materials: MaterialRow[]
  announcements: AnnouncementRow[]
}

/** One batch, in full — the page behind a card on the dashboard. */
export async function getStudentBatch(
  studentId: string,
  batchId: string,
): Promise<StudentBatchDetail> {
  const enrollment = await requireEnrollment(studentId, batchId)
  const summaries = await listStudentBatches(studentId)
  const summary = summaries.find((row) => row.batch.id === batchId)
  if (!summary) throw new PortalAccessError()

  const db = getDb()
  const [moduleRows, sessions, materialRows, announcementRows] = await Promise.all([
    db.select().from(moduleProgress).where(eq(moduleProgress.enrollmentId, enrollment.id)),
    db
      .select()
      .from(classSessions)
      .where(eq(classSessions.batchId, batchId))
      .orderBy(asc(classSessions.scheduledAt)),
    db
      .select()
      .from(materials)
      .where(eq(materials.batchId, batchId))
      .orderBy(asc(materials.sortOrder), desc(materials.createdAt)),
    db
      .select()
      .from(announcements)
      .where(eq(announcements.batchId, batchId))
      .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
      .limit(10),
  ])

  return {
    ...summary,
    completedModuleIndexes: moduleRows.map((row) => row.moduleIndex),
    moduleRows,
    sessions,
    materials: materialRows,
    announcements: announcementRows,
  }
}

/**
 * Tick or untick a curriculum module.
 *
 * The module title is stored alongside the index so the record still reads
 * correctly if the syllabus is later reordered — the index alone would quietly
 * start pointing at a different topic.
 */
export async function setModuleProgress(
  studentId: string,
  batchId: string,
  moduleIndex: number,
  moduleTitle: string,
  completed: boolean,
): Promise<void> {
  const enrollment = await requireEnrollment(studentId, batchId)
  const db = getDb()

  if (!completed) {
    await db
      .delete(moduleProgress)
      .where(
        and(
          eq(moduleProgress.enrollmentId, enrollment.id),
          eq(moduleProgress.moduleIndex, moduleIndex),
        ),
      )
    return
  }

  await db
    .insert(moduleProgress)
    .values({ id: randomUUID(), enrollmentId: enrollment.id, moduleIndex, moduleTitle })
    .onConflictDoUpdate({
      target: [moduleProgress.enrollmentId, moduleProgress.moduleIndex],
      set: { moduleTitle, completedAt: sql`now()` },
    })
}

/* ------------------------------------------------------------ Assignments */

export type StudentAssignment = {
  assignment: AssignmentRow
  batch: BatchRow
  submission: SubmissionRow | null
  /** Derived once here so the list and the detail page agree on the wording. */
  state: 'not-submitted' | 'overdue' | 'submitted' | 'graded' | 'resubmit'
}

export async function listStudentAssignments(
  studentId: string,
  batchId?: string,
): Promise<StudentAssignment[]> {
  const ids = batchId ? [batchId] : await enrolledBatchIds(studentId)
  if (batchId) await requireEnrollment(studentId, batchId)
  if (ids.length === 0) return []

  const db = getDb()
  const [rows, submissionRows] = await Promise.all([
    db
      .select({ assignment: assignments, batch: batches })
      .from(assignments)
      .innerJoin(batches, eq(batches.id, assignments.batchId))
      .where(and(inArray(assignments.batchId, ids), isNotNull(assignments.publishedAt)))
      .orderBy(asc(assignments.dueAt)),
    db
      .select()
      .from(submissions)
      .where(and(inArray(submissions.batchId, ids), eq(submissions.studentId, studentId))),
  ])

  const byAssignment = new Map(submissionRows.map((row) => [row.assignmentId, row]))
  const now = new Date()

  return rows.map(({ assignment, batch }) => {
    const submission = byAssignment.get(assignment.id) ?? null
    return { assignment, batch, submission, state: assignmentState(assignment, submission, now) }
  })
}

function assignmentState(
  assignment: AssignmentRow,
  submission: SubmissionRow | null,
  now: Date,
): StudentAssignment['state'] {
  if (!submission) return assignment.dueAt <= now ? 'overdue' : 'not-submitted'
  if (submission.status === 'graded') return 'graded'
  if (submission.status === 'resubmit') return 'resubmit'
  return 'submitted'
}

export async function getStudentAssignment(
  studentId: string,
  assignmentId: string,
): Promise<StudentAssignment> {
  const [row] = await getDb()
    .select({ assignment: assignments, batch: batches })
    .from(assignments)
    .innerJoin(batches, eq(batches.id, assignments.batchId))
    .where(eq(assignments.id, assignmentId))
    .limit(1)

  /* An unpublished assignment is treated as absent rather than forbidden: a
     draft the instructor has not released should not be discoverable at all. */
  if (!row || !row.assignment.publishedAt) throw new PortalAccessError()
  await requireEnrollment(studentId, row.assignment.batchId)

  const [submission] = await getDb()
    .select()
    .from(submissions)
    .where(
      and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId)),
    )
    .limit(1)

  return {
    assignment: row.assignment,
    batch: row.batch,
    submission: submission ?? null,
    state: assignmentState(row.assignment, submission ?? null, new Date()),
  }
}

/**
 * Hand in, or replace an earlier hand-in.
 *
 * Re-submitting after a mark has been given clears the mark and returns the
 * row to `submitted`. The alternative — keeping the old score against the new
 * work — is the one behaviour that would silently misreport a grade.
 */
export async function submitAssignment(
  studentId: string,
  assignmentId: string,
  input: { url?: string | null; notes?: string | null },
): Promise<void> {
  const { assignment } = await getStudentAssignment(studentId, assignmentId)
  const now = new Date()
  const late = now > assignment.dueAt

  if (late && !assignment.allowLate) {
    throw new Error('The deadline has passed and this assignment does not accept late work.')
  }

  await getDb()
    .insert(submissions)
    .values({
      id: randomUUID(),
      assignmentId,
      batchId: assignment.batchId,
      studentId,
      url: input.url?.trim() || null,
      notes: input.notes?.trim() || null,
      submittedAt: now,
      late,
    })
    .onConflictDoUpdate({
      target: [submissions.assignmentId, submissions.studentId],
      set: {
        url: input.url?.trim() || null,
        notes: input.notes?.trim() || null,
        submittedAt: now,
        late,
        status: 'submitted',
        score: null,
        feedback: null,
        gradedById: null,
        gradedAt: null,
        updatedAt: sql`now()`,
      },
    })
}

/* ----------------------------------------------------------------- Quizzes */

export type StudentQuiz = {
  quiz: QuizRow
  batch: BatchRow
  attempts: QuizAttemptRow[]
  best: QuizAttemptRow | null
  attemptsLeft: number
  passed: boolean
}

export async function listStudentQuizzes(
  studentId: string,
  batchId?: string,
): Promise<StudentQuiz[]> {
  const ids = batchId ? [batchId] : await enrolledBatchIds(studentId)
  if (batchId) await requireEnrollment(studentId, batchId)
  if (ids.length === 0) return []

  const db = getDb()
  const [rows, attempts] = await Promise.all([
    db
      .select({ quiz: quizzes, batch: batches })
      .from(quizzes)
      .innerJoin(batches, eq(batches.id, quizzes.batchId))
      .where(and(inArray(quizzes.batchId, ids), isNotNull(quizzes.publishedAt)))
      .orderBy(asc(quizzes.dueAt), desc(quizzes.createdAt)),
    db
      .select()
      .from(quizAttempts)
      .where(and(inArray(quizAttempts.batchId, ids), eq(quizAttempts.studentId, studentId))),
  ])

  return rows.map(({ quiz, batch }) => describeQuiz(quiz, batch, attempts))
}

function describeQuiz(quiz: QuizRow, batch: BatchRow, allAttempts: QuizAttemptRow[]): StudentQuiz {
  const attempts = allAttempts
    .filter((row) => row.quizId === quiz.id)
    .sort((a, b) => a.attemptNumber - b.attemptNumber)

  const submitted = attempts.filter((row) => row.submittedAt)
  const best = submitted.reduce<QuizAttemptRow | null>(
    (winner, row) => (!winner || row.score > winner.score ? row : winner),
    null,
  )

  return {
    quiz,
    batch,
    attempts,
    best,
    attemptsLeft: Math.max(0, quiz.maxAttempts - submitted.length),
    passed: best !== null && percent(best.score, best.maxScore) >= quiz.passScore,
  }
}

export async function getStudentQuiz(studentId: string, quizId: string): Promise<StudentQuiz> {
  const [row] = await getDb()
    .select({ quiz: quizzes, batch: batches })
    .from(quizzes)
    .innerJoin(batches, eq(batches.id, quizzes.batchId))
    .where(eq(quizzes.id, quizId))
    .limit(1)

  if (!row || !row.quiz.publishedAt) throw new PortalAccessError()
  await requireEnrollment(studentId, row.quiz.batchId)

  const attempts = await getDb()
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, studentId)))

  return describeQuiz(row.quiz, row.batch, attempts)
}

/**
 * Mark and record one attempt.
 *
 * Marking happens here, on the server, against `quizzes.questions` — the
 * correct answers are never sent to the browser, so the paper the student
 * receives genuinely does not contain the answer key.
 */
export async function submitQuizAttempt(
  studentId: string,
  quizId: string,
  answers: QuizAnswer[],
): Promise<{ score: number; maxScore: number; passed: boolean }> {
  const state = await getStudentQuiz(studentId, quizId)

  if (state.attemptsLeft <= 0) {
    throw new Error('You have used every attempt for this quiz.')
  }

  if (state.quiz.dueAt && new Date() > state.quiz.dueAt) {
    throw new Error('This quiz has closed.')
  }

  const { score, maxScore } = scoreQuizAttempt(state.quiz.questions, answers)
  const attemptNumber = state.attempts.length + 1
  const now = new Date()

  await getDb()
    .insert(quizAttempts)
    .values({
      id: randomUUID(),
      quizId,
      batchId: state.quiz.batchId,
      studentId,
      attemptNumber,
      answers,
      score,
      maxScore,
      startedAt: now,
      submittedAt: now,
    })

  return { score, maxScore, passed: percent(score, maxScore) >= state.quiz.passScore }
}

/* -------------------------------------------------------------- Attendance */

export type StudentAttendanceRow = {
  session: ClassSessionRow
  batch: BatchRow
  record: AttendanceRow | null
}

export async function getStudentAttendance(
  studentId: string,
  batchId?: string,
): Promise<{ rows: StudentAttendanceRow[]; tally: AttendanceTally }> {
  const ids = batchId ? [batchId] : await enrolledBatchIds(studentId)
  if (batchId) await requireEnrollment(studentId, batchId)
  if (ids.length === 0) return { rows: [], tally: tallyAttendance([]) }

  const db = getDb()
  const [sessionRows, records] = await Promise.all([
    db
      .select({ session: classSessions, batch: batches })
      .from(classSessions)
      .innerJoin(batches, eq(batches.id, classSessions.batchId))
      .where(and(inArray(classSessions.batchId, ids), eq(classSessions.status, 'held')))
      .orderBy(desc(classSessions.scheduledAt)),
    db
      .select()
      .from(attendance)
      .where(and(inArray(attendance.batchId, ids), eq(attendance.studentId, studentId))),
  ])

  const bySession = new Map(records.map((row) => [row.sessionId, row]))

  return {
    rows: sessionRows.map(({ session, batch }) => ({
      session,
      batch,
      record: bySession.get(session.id) ?? null,
    })),
    tally: tallyAttendance(records.map((row) => row.status)),
  }
}

/* ----------------------------------------------------------- Announcements */

/**
 * Batch notices plus portal-wide ones.
 *
 * A null `batch_id` means "everyone", so the filter is an `OR` rather than an
 * `IN` — otherwise a portal-wide notice would reach nobody, which is the
 * failure mode nobody notices until an exam date goes unread.
 */
export async function listStudentAnnouncements(
  studentId: string,
  limit = 20,
): Promise<(AnnouncementRow & { batchName: string | null })[]> {
  const ids = await enrolledBatchIds(studentId)

  const rows = await getDb()
    .select({ announcement: announcements, batchName: batches.name })
    .from(announcements)
    .leftJoin(batches, eq(batches.id, announcements.batchId))
    .where(
      ids.length > 0
        ? or(inArray(announcements.batchId, ids), sql`${announcements.batchId} is null`)
        : sql`${announcements.batchId} is null`,
    )
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(limit)

  return rows.map((row) => ({ ...row.announcement, batchName: row.batchName }))
}

/* ------------------------------------------------------------ Certificates */

export async function listStudentCertificates(
  studentId: string,
): Promise<(CertificateRow & { batchName: string | null })[]> {
  const rows = await getDb()
    .select({ certificate: certificates, batchName: batches.name })
    .from(certificates)
    .leftJoin(batches, eq(batches.id, certificates.batchId))
    .where(eq(certificates.studentId, studentId))
    .orderBy(desc(certificates.issuedAt))

  return rows.map((row) => ({ ...row.certificate, batchName: row.batchName }))
}

/**
 * Public certificate lookup by serial.
 *
 * The only read in this file that takes no student id, because it answers a
 * question asked by someone who is not signed in — an employer checking a
 * credential. It returns the certificate and nothing adjacent to it: no email,
 * no grades, no batch roster.
 */
export async function verifyCertificate(serial: string): Promise<CertificateRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(certificates)
    .where(eq(certificates.serial, serial.trim().toUpperCase()))
    .limit(1)

  if (!row || row.revokedAt) return undefined
  return row
}
