import { z } from 'zod'

/** Pakistani mobile/landline formats plus international E.164. */
const PHONE_REGEX = /^(?:\+?92|0)?3\d{9}$|^(?:\+?92|0)?\d{2,4}[- ]?\d{6,8}$|^\+\d{7,15}$/

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your full name')
    .max(80, 'Name is too long')
    .regex(/^[\p{L}\p{M}'. -]+$/u, 'Name can only contain letters, spaces, apostrophes and hyphens'),

  phone: z
    .string()
    .trim()
    .min(10, 'Please enter a valid phone number')
    .max(20, 'Please enter a valid phone number')
    .refine((value) => PHONE_REGEX.test(value.replace(/\s+/g, '')), {
      message: 'Enter a valid number, e.g. 0300 1234567',
    }),

  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address')
    .max(120, 'Email is too long'),

  /**
   * Shape only. The catalogue is in Postgres now and this schema is shared with
   * the browser bundle, so the slug is checked against live courses on the
   * server — see `resolveCourseChoice` in `@/lib/data/courses` callers.
   */
  course: z
    .string()
    .trim()
    .min(1, 'Please choose the course you are interested in')
    .max(80),

  message: z
    .string()
    .trim()
    .min(10, 'Please tell us a little more (at least 10 characters)')
    .max(1500, 'Message must be under 1500 characters'),

  /** Honeypot — real users never fill this. Must stay empty. */
  website: z.string().max(0).optional(),

  consent: z.literal(true, {
    errorMap: () => ({ message: 'Please accept the privacy policy to continue' }),
  }),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address')
    .max(120),
  website: z.string().max(0).optional(),
})

export type NewsletterValues = z.infer<typeof newsletterSchema>

export type CourseOption = { value: string; label: string }

/** Fallback used when a form is rendered before the catalogue is available. */
export const UNDECIDED_COURSE: CourseOption = {
  value: 'not-sure',
  label: 'Not sure yet — please advise me',
}

/* ---------------------------------------------------------------------------
 * Student accounts
 *
 * Shared between the browser and the server actions that write. The client
 * check is a convenience; the same schema re-parses server-side, which is the
 * one that counts — see `@/lib/student/actions`.
 * ------------------------------------------------------------------------ */

const passwordField = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(200, 'That password is too long')
  /*
   * Length, and nothing else. Composition rules ("one uppercase, one digit,
   * one symbol") are what produce Password1! across an entire cohort, and NIST
   * has advised against them since SP 800-63B. A long passphrase is stronger
   * and easier for a student on a phone keyboard to actually type.
   */
  .refine((value) => value.trim().length >= 8, 'Use at least 8 characters')

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Please enter your full name')
      .max(80, 'Name is too long')
      .regex(/^[\p{L}\p{M}'. -]+$/u, 'Name can only contain letters, spaces, apostrophes and hyphens'),

    email: z
      .string()
      .trim()
      .min(1, 'Please enter your email address')
      .email('Please enter a valid email address')
      .max(120, 'Email is too long')
      /* Lower-cased here so it matches the unique index, which compares text
         exactly — the same normalisation `adminUsers.email` documents. */
      .transform((value) => value.toLowerCase()),

    phone: z
      .string()
      .trim()
      .min(10, 'Please enter a valid phone number')
      .max(20, 'Please enter a valid phone number')
      .refine((value) => PHONE_REGEX.test(value.replace(/\s+/g, '')), {
        message: 'Enter a valid number, e.g. 0300 1234567',
      }),

    city: z.string().trim().max(120, 'City name is too long').optional(),

    password: passwordField,
    confirmPassword: z.string(),

    /** Honeypot — real users never fill this. Must stay empty. */
    website: z.string().max(0).optional(),

    consent: z.literal(true, {
      errorMap: () => ({ message: 'Please accept the terms to create an account' }),
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Those passwords do not match',
    path: ['confirmPassword'],
  })

export type SignupValues = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address')
    .email('Please enter a valid email address')
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Please enter your password'),
})

export type LoginValues = z.infer<typeof loginSchema>

/* ---------------------------------------------------------------------------
 * Checkout
 * ------------------------------------------------------------------------ */

export const PAYMENT_METHOD_VALUES = ['bank_transfer', 'jazzcash', 'easypaisa', 'cash'] as const

/**
 * The non-file half of a payment claim. The receipt image travels as `FormData`
 * — a `File` cannot round-trip through a zod-resolved react-hook-form value —
 * and is validated separately by `saveUploadedImage`.
 */
export const paymentProofSchema = z.object({
  method: z.enum(PAYMENT_METHOD_VALUES, {
    errorMap: () => ({ message: 'Choose how you paid' }),
  }),
  senderName: z
    .string()
    .trim()
    .min(2, 'Enter the name the payment was sent from')
    .max(120, 'That name is too long'),
  senderReference: z
    .string()
    .trim()
    .max(120, 'That reference is too long')
    .optional()
    .or(z.literal('')),
  note: z.string().trim().max(1000, 'Keep the note under 1000 characters').optional(),
})

export type PaymentProofValues = z.infer<typeof paymentProofSchema>
