/**
 * The grade book, as pure functions.
 *
 * No database and no `server-only`, deliberately: the student's own view of a
 * mark and the instructor's view of the same mark must be the same number, and
 * the only way to guarantee that is for both to call this. Keeping it free of
 * imports also means the rules can be read — and argued with — in one place.
 */

import type { AttendanceStatus, QuizAnswer, QuizQuestion } from '@/db/schema'

/* --------------------------------------------------------------- Weighting */

/**
 * How the final percentage is composed.
 *
 * Attendance is deliberately excluded from the mark. It is reported alongside
 * it and it gates the certificate, but a student who attends every class and
 * submits nothing has not passed the course, and blending the two hides that.
 */
export const GRADE_WEIGHTS = { assignments: 0.6, quizzes: 0.4 } as const

/** Attendance below this blocks certificate issue. */
export const MIN_ATTENDANCE_FOR_CERTIFICATE = 70

/** Final percentage below this blocks certificate issue. */
export const MIN_SCORE_FOR_CERTIFICATE = 50

/* ------------------------------------------------------------- Percentages */

/** Rounded percentage, guarding the empty case that would otherwise be NaN. */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

/** Clamp to 0–100 — a marker can type 120 out of 100 and mean it. */
export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/* -------------------------------------------------------------- Attendance */

/** Late still counts as attended; it is recorded separately for the record. */
const ATTENDED: AttendanceStatus[] = ['present', 'late']

export type AttendanceTally = {
  present: number
  late: number
  absent: number
  excused: number
  /** Sessions with a mark against them. Unmarked sessions are not counted. */
  marked: number
  /** Percentage of *non-excused* marked sessions that were attended. */
  rate: number
}

/**
 * Excused absences leave the denominator rather than counting against the
 * student — that is the whole difference between "excused" and "absent", and a
 * rate that ignores it makes the distinction cosmetic.
 */
export function tallyAttendance(statuses: AttendanceStatus[]): AttendanceTally {
  const present = statuses.filter((s) => s === 'present').length
  const late = statuses.filter((s) => s === 'late').length
  const absent = statuses.filter((s) => s === 'absent').length
  const excused = statuses.filter((s) => s === 'excused').length

  const counted = present + late + absent
  const attended = statuses.filter((s) => ATTENDED.includes(s)).length

  return {
    present,
    late,
    absent,
    excused,
    marked: statuses.length,
    rate: percent(attended, counted),
  }
}

/* ------------------------------------------------------------- Assignments */

export type ScoredItem = {
  /** Points awarded, or null when it has not been marked yet. */
  score: number | null
  maxScore: number
  /** Relative importance. 0 excludes the item from the average entirely. */
  weight: number
}

/**
 * Weighted mean of the *marked* items only.
 *
 * Unmarked work is skipped rather than scored zero. A student two days into a
 * course has submitted nothing and marked nothing, and showing them 0% would
 * be both wrong and demoralising; what is missing is shown as an outstanding
 * count instead. `null` means there is nothing to average yet.
 */
export function weightedPercent(items: ScoredItem[]): number | null {
  const marked = items.filter((item) => item.score !== null && item.maxScore > 0 && item.weight > 0)
  if (marked.length === 0) return null

  const totalWeight = marked.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) return null

  const earned = marked.reduce(
    (sum, item) => sum + ((item.score as number) / item.maxScore) * item.weight,
    0,
  )

  return clampPercent((earned / totalWeight) * 100)
}

/* ------------------------------------------------------------------ Quizzes */

/** Marks one attempt against the quiz it belongs to. */
export function scoreQuizAttempt(
  questions: QuizQuestion[],
  answers: QuizAnswer[],
): { score: number; maxScore: number; correct: number } {
  const byId = new Map(answers.map((answer) => [answer.questionId, answer.selectedIndex]))

  let score = 0
  let maxScore = 0
  let correct = 0

  for (const question of questions) {
    maxScore += question.points
    const selected = byId.get(question.id)
    if (selected !== undefined && selected !== null && selected === question.correctIndex) {
      score += question.points
      correct += 1
    }
  }

  return { score, maxScore, correct }
}

/* -------------------------------------------------------------- Final grade */

export type GradeInput = {
  assignments: ScoredItem[]
  quizzes: ScoredItem[]
}

export type Grade = {
  /** null until at least one piece of work has been marked. */
  score: number | null
  letter: string | null
  assignments: number | null
  quizzes: number | null
}

/**
 * Blends the two components at `GRADE_WEIGHTS`, renormalising when one of them
 * is empty.
 *
 * Renormalising matters: a batch whose first quiz has not happened yet would
 * otherwise cap every student at 60%, and the number people see mid-course is
 * the one they act on.
 */
export function computeGrade({ assignments, quizzes }: GradeInput): Grade {
  const assignmentScore = weightedPercent(assignments)
  const quizScore = weightedPercent(quizzes)

  let score: number | null = null

  if (assignmentScore !== null && quizScore !== null) {
    score = clampPercent(
      assignmentScore * GRADE_WEIGHTS.assignments + quizScore * GRADE_WEIGHTS.quizzes,
    )
  } else if (assignmentScore !== null) {
    score = assignmentScore
  } else if (quizScore !== null) {
    score = quizScore
  }

  return {
    score,
    letter: score === null ? null : letterGrade(score),
    assignments: assignmentScore,
    quizzes: quizScore,
  }
}

const GRADE_BANDS: { min: number; letter: string }[] = [
  { min: 90, letter: 'A+' },
  { min: 85, letter: 'A' },
  { min: 80, letter: 'B+' },
  { min: 75, letter: 'B' },
  { min: 70, letter: 'C+' },
  { min: 65, letter: 'C' },
  { min: 50, letter: 'D' },
  { min: 0, letter: 'F' },
]

export function letterGrade(score: number): string {
  return GRADE_BANDS.find((band) => score >= band.min)?.letter ?? 'F'
}

/* ------------------------------------------------------------- Certificates */

export type CertificateEligibility =
  | { eligible: true; score: number; grade: string }
  | { eligible: false; reasons: string[] }

/**
 * Everything that must be true before a certificate can be issued, answered as
 * a list of what is not, so the instructor sees the whole gap at once instead
 * of fixing one blocker to discover the next.
 */
export function certificateEligibility(input: {
  grade: Grade
  attendanceRate: number
  modulesCompleted: number
  modulesTotal: number
  ungradedSubmissions: number
}): CertificateEligibility {
  const reasons: string[] = []

  if (input.grade.score === null) {
    reasons.push('No marked work yet')
  } else if (input.grade.score < MIN_SCORE_FOR_CERTIFICATE) {
    reasons.push(
      `Final score is ${input.grade.score}% — ${MIN_SCORE_FOR_CERTIFICATE}% is the minimum`,
    )
  }

  if (input.attendanceRate < MIN_ATTENDANCE_FOR_CERTIFICATE) {
    reasons.push(
      `Attendance is ${input.attendanceRate}% — ${MIN_ATTENDANCE_FOR_CERTIFICATE}% is the minimum`,
    )
  }

  if (input.modulesTotal > 0 && input.modulesCompleted < input.modulesTotal) {
    reasons.push(
      `${input.modulesTotal - input.modulesCompleted} of ${input.modulesTotal} modules still open`,
    )
  }

  if (input.ungradedSubmissions > 0) {
    reasons.push(
      `${input.ungradedSubmissions} submission${
        input.ungradedSubmissions === 1 ? '' : 's'
      } still to mark`,
    )
  }

  if (reasons.length > 0 || input.grade.score === null || input.grade.letter === null) {
    return { eligible: false, reasons }
  }

  return { eligible: true, score: input.grade.score, grade: input.grade.letter }
}

/* ------------------------------------------------------------------ Serials */

const SERIAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * `GT-2026-7K4M9QX2` — a year for readability, then eight characters from an
 * alphabet with no `0/O` or `1/I` so it survives being read aloud or copied off
 * a printed certificate.
 *
 * Random rather than sequential because the serial is the only credential a
 * verifier presents; a counter would let anyone enumerate every graduate.
 */
export function certificateSerial(random: () => number = Math.random): string {
  const year = new Date().getUTCFullYear()
  let body = ''
  for (let i = 0; i < 8; i += 1) {
    body += SERIAL_ALPHABET[Math.floor(random() * SERIAL_ALPHABET.length)]
  }
  return `GT-${year}-${body}`
}
