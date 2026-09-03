import { z } from 'zod'

import {
  ATTENDANCE_STATUSES,
  BATCH_STATUSES,
  ENROLLMENT_STATUSES,
  MATERIAL_TYPES,
  PORTAL_ROLES,
} from '@/db/schema'

/**
 * Validation for every portal form.
 *
 * Shared between the browser and the server actions, and re-parsed on the
 * server in every case — a client-side check is a courtesy to the person
 * typing, never a guarantee about what arrives.
 */

/** Pakistani mobile/landline formats plus international E.164. */
const PHONE_REGEX = /^(?:\+?92|0)?3\d{9}$|^(?:\+?92|0)?\d{2,4}[- ]?\d{6,8}$|^\+\d{7,15}$/

const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .refine((value) => value === '' || PHONE_REGEX.test(value.replace(/\s+/g, '')), {
    message: 'Enter a valid number, e.g. 0300 1234567',
  })
  .optional()

/**
 * Twelve characters, no composition rules.
 *
 * Length is the only requirement that reliably survives contact with people:
 * a mandated symbol produces `Password1!` and a mandated rotation produces
 * `Password2!`. Long passphrases are both stronger and likelier to be
 * remembered, so the minimum is set where a passphrase is natural.
 */
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters — a short phrase works well')
  .max(200, 'That password is too long')

export const portalRegisterSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Please enter your full name')
      .max(80, 'Name is too long')
      .regex(
        /^[\p{L}\p{M}'. -]+$/u,
        'Name can only contain letters, spaces, apostrophes and hyphens',
      ),
    email: z
      .string()
      .trim()
      .min(1, 'Please enter your email address')
      .email('Please enter a valid email address')
      .max(120, 'Email is too long'),
    phone: optionalPhone,
    password: passwordSchema,
    confirmPassword: z.string(),
    /** Honeypot — real users never fill this. Must stay empty. */
    website: z.string().max(0).optional(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Those two passwords do not match',
    path: ['confirmPassword'],
  })

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Those two passwords do not match',
    path: ['confirmPassword'],
  })

export const portalProfileSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(80),
  phone: optionalPhone,
  headline: z.string().trim().max(255).optional(),
  bio: z.string().trim().max(2000).optional(),
})

/* ------------------------------------------------------------------ Admin */

export const portalUserSchema = z.object({
  name: z.string().trim().min(2, 'Please enter a name').max(80),
  email: z.string().trim().email('Please enter a valid email address').max(120),
  role: z.enum(PORTAL_ROLES),
  phone: optionalPhone,
  headline: z.string().trim().max(255).optional(),
  /** Links an instructor to the public `authors` row shown on course pages. */
  authorSlug: z.string().trim().max(191).optional(),
  status: z.enum(['active', 'suspended']).default('active'),
})

export const batchSchema = z.object({
  courseId: z.string().trim().min(1, 'Choose the course this batch teaches'),
  code: z
    .string()
    .trim()
    .min(3, 'Give the batch a short code, e.g. FSD-2026-A')
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens only'),
  name: z.string().trim().min(3, 'Give the batch a name').max(191),
  instructorId: z.string().trim().min(1, 'Assign an instructor'),
  startDate: z.string().min(1, 'Choose a start date'),
  endDate: z.string().optional(),
  schedule: z.string().trim().max(255).optional(),
  mode: z.string().trim().max(64).default('On-campus'),
  capacity: z.coerce.number().int().min(0).max(500).default(0),
  meetingUrl: z.string().trim().url('Enter a full URL').max(500).or(z.literal('')).optional(),
  status: z.enum(BATCH_STATUSES).default('upcoming'),
  notes: z.string().trim().max(2000).optional(),
})

export const enrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES)

/* ------------------------------------------------------------- Instructor */

export const sessionSchema = z.object({
  title: z.string().trim().min(2, 'Give the class a title').max(255),
  topic: z.string().trim().max(2000).optional(),
  /** `datetime-local`, so a local wall-clock string rather than an ISO instant. */
  scheduledAt: z.string().min(1, 'Choose a date and time'),
  durationMinutes: z.coerce.number().int().min(15).max(600).default(120),
  meetingUrl: z.string().trim().url('Enter a full URL').max(500).or(z.literal('')).optional(),
})

export const attendanceMarkSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().trim().max(500).optional(),
})

export const materialSchema = z
  .object({
    title: z.string().trim().min(2, 'Give the material a title').max(255),
    description: z.string().trim().max(1000).optional(),
    type: z.enum(MATERIAL_TYPES).default('link'),
    url: z.string().trim().max(500).optional(),
    body: z.string().trim().max(20000).optional(),
    moduleIndex: z.coerce.number().int().min(0).max(200).optional(),
  })
  .refine((values) => values.type === 'note' || (values.url ?? '').length > 0, {
    message: 'A link, file or video needs a URL',
    path: ['url'],
  })
  .refine((values) => values.type !== 'note' || (values.body ?? '').length > 0, {
    message: 'A note needs some text',
    path: ['body'],
  })

export const announcementSchema = z.object({
  batchId: z.string().optional(),
  title: z.string().trim().min(3, 'Give the announcement a title').max(255),
  body: z.string().trim().min(3, 'Write the announcement').max(5000),
  pinned: z.coerce.boolean().default(false),
})

export const assignmentSchema = z.object({
  title: z.string().trim().min(3, 'Give the assignment a title').max(255),
  brief: z.string().trim().min(10, 'Write the brief students will work from').max(20000),
  attachmentUrl: z.string().trim().url('Enter a full URL').max(500).or(z.literal('')).optional(),
  dueAt: z.string().min(1, 'Choose a deadline'),
  maxScore: z.coerce.number().int().min(1).max(1000).default(100),
  weight: z.coerce.number().int().min(0).max(20).default(1),
  allowLate: z.coerce.boolean().default(true),
  publish: z.coerce.boolean().default(false),
})

/**
 * The create form carries the batch as a field, because an instructor with
 * three cohorts sets the same piece of work on whichever one is in front of
 * them. It is a convenience only — `createAssignment` re-checks that the batch
 * belongs to the caller, so a tampered value buys nothing.
 */
export const assignmentWithBatchSchema = assignmentSchema.extend({
  batchId: z.string().trim().min(1, 'Choose the batch this is for'),
})

export const gradeSchema = z
  .object({
    submissionId: z.string().min(1),
    status: z.enum(['graded', 'resubmit']),
    score: z.union([z.coerce.number().int().min(0).max(1000), z.literal('')]).optional(),
    feedback: z.string().trim().max(5000).optional(),
  })
  .refine((values) => values.status === 'resubmit' || typeof values.score === 'number', {
    message: 'Enter a mark',
    path: ['score'],
  })

/**
 * A quiz arrives as JSON from the question builder rather than as flat form
 * fields: the number of questions and the number of options per question are
 * both variable, and encoding that into `name="questions[3].options[2]"` makes
 * the server parse a shape the browser already had in hand.
 */
export const quizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().trim().min(3, 'Write the question').max(1000),
  options: z
    .array(z.string().trim().min(1, 'Options cannot be blank').max(500))
    .min(2, 'Give at least two options')
    .max(8, 'Eight options is the maximum'),
  correctIndex: z.coerce.number().int().min(0),
  points: z.coerce.number().int().min(1).max(100).default(1),
})

export const quizSchema = z.object({
  title: z.string().trim().min(3, 'Give the quiz a title').max(255),
  description: z.string().trim().max(2000).optional(),
  questions: z
    .array(quizQuestionSchema)
    .min(1, 'A quiz needs at least one question')
    .max(100, 'One hundred questions is the maximum')
    .superRefine((questions, ctx) => {
      questions.forEach((question, index) => {
        /* The answer key has to point at an option that exists. Caught here
           rather than at insert time, because a quiz stored with a correct
           index of 4 against three options marks every attempt wrong and
           nobody finds out until the results come in. */
        if (question.correctIndex >= question.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Question ${index + 1} has no answer selected`,
            path: [index, 'correctIndex'],
          })
        }
      })
    }),
  timeLimitMinutes: z.coerce.number().int().min(0).max(300).default(0),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(1),
  passScore: z.coerce.number().int().min(0).max(100).default(60),
  weight: z.coerce.number().int().min(0).max(20).default(1),
  dueAt: z.string().optional(),
  publish: z.coerce.boolean().default(false),
})

/** Same reasoning as `assignmentWithBatchSchema`. */
export const quizWithBatchSchema = quizSchema.extend({
  batchId: z.string().trim().min(1, 'Choose the batch this is for'),
})

export const submitAssignmentSchema = z
  .object({
    url: z.string().trim().url('Enter a full URL, e.g. https://github.com/…').max(500).or(z.literal('')).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((values) => (values.url ?? '') !== '' || (values.notes ?? '') !== '', {
    message: 'Add a link to your work, a note, or both',
    path: ['url'],
  })

export type PortalRegisterValues = z.infer<typeof portalRegisterSchema>
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
export type BatchValues = z.infer<typeof batchSchema>
export type AssignmentValues = z.infer<typeof assignmentSchema>
export type QuizValues = z.infer<typeof quizSchema>
