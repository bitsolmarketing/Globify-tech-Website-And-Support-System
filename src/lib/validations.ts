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
