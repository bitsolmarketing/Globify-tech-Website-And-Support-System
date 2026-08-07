import { z } from 'zod'

import { LEAD_STATUSES } from '@/db/schema'
import { courseCategories, type Course } from '@/lib/courses'

/**
 * Zod schemas shared by the admin forms (react-hook-form resolver) and the
 * server actions that persist them, exactly like `contactFormSchema` is shared
 * by the public form and `/api/contact`.
 *
 * Repeatable plain-string fields (skills, tools, outcomes, …) are edited as
 * one-item-per-line textareas and stay strings in the form. `toCourseInput`
 * below is the single place that splits them, so the browser and the server
 * can never disagree about how a list was parsed.
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugField = z
  .string()
  .trim()
  .min(2, 'Slug is required')
  .max(80, 'Slug is too long')
  .regex(SLUG_REGEX, 'Use lowercase letters, numbers and hyphens only')

/** Splits a textarea into a trimmed, blank-free list. */
export function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function fromLines(values: readonly string[]): string {
  return values.join('\n')
}

/** A textarea that must contain at least `min` non-empty lines. */
function lineList(min: number, label: string) {
  return z
    .string()
    .refine((value) => toLines(value).length >= min, `Add at least ${min} ${label}`)
}

/* ---------------------------------------------------------------------------
 * Courses
 * ------------------------------------------------------------------------ */

const COURSE_LEVELS = [
  'Beginner',
  'Beginner to Intermediate',
  'Intermediate',
  'Beginner to Advanced',
] as const satisfies readonly Course['level'][]

const COURSE_BADGES = [
  'Most Popular',
  'New Batch',
  'Highest Demand',
  'Fast Track',
] as const satisfies readonly NonNullable<Course['badge']>[]

export const courseLevels = COURSE_LEVELS
export const courseBadges = COURSE_BADGES

export const courseFormSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(3, 'Title is required').max(120),
  shortTitle: z.string().trim().min(2, 'Short title is required').max(60),
  category: z.enum(courseCategories as unknown as [string, ...string[]], {
    errorMap: () => ({ message: 'Choose a category' }),
  }),
  tagline: z.string().trim().min(5, 'Tagline is required').max(160),
  description: z
    .string()
    .trim()
    .min(50, 'Meta descriptions should be at least 50 characters')
    .max(200, 'Keep the meta description under 200 characters'),
  overview: lineList(1, 'overview paragraph'),
  image: z.string().trim().min(1, 'Image path is required').max(300),
  icon: z.string().trim().min(1, 'Icon name is required').max(60),
  duration: z.string().trim().min(1, 'Duration is required').max(40),
  durationWeeks: z.coerce.number().int().min(1).max(104),
  hoursPerWeek: z.coerce.number().int().min(1).max(60),
  level: z.enum(COURSE_LEVELS),
  originalFee: z.coerce.number().int().min(0).max(10_000_000),
  mode: lineList(1, 'delivery mode'),
  language: z.string().trim().min(1, 'Language is required').max(60),
  skills: lineList(1, 'skill'),
  tools: lineList(1, 'tool'),
  outcomes: lineList(1, 'outcome'),
  projects: lineList(1, 'project'),
  curriculum: z
    .array(
      z.object({
        module: z.string().trim().min(2, 'Module title is required').max(120),
        topics: lineList(1, 'topic'),
      }),
    )
    .min(1, 'Add at least one module'),
  careers: z
    .array(
      z.object({
        role: z.string().trim().min(2, 'Role is required').max(120),
        salary: z.string().trim().min(1, 'Salary range is required').max(80),
      }),
    )
    .min(1, 'Add at least one career outcome'),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(5, 'Question is required').max(250),
        answer: z.string().trim().min(10, 'Answer is required').max(2000),
      }),
    )
    .min(1, 'Add at least one FAQ'),
  instructorSlug: z.string().trim().min(1, 'Choose an instructor'),
  rating: z.coerce.number().min(0).max(5),
  reviews: z.coerce.number().int().min(0),
  enrolled: z.coerce.number().int().min(0),
  featured: z.boolean(),
  /** Empty string means "no badge" — `<select>` cannot hold null. */
  badge: z.union([z.enum(COURSE_BADGES), z.literal('')]),
})

export type CourseFormValues = z.infer<typeof courseFormSchema>

/** Form shape -> the shape the `courses` table and the `Course` type expect. */
export function toCourseInput(values: CourseFormValues) {
  return {
    slug: values.slug,
    title: values.title,
    shortTitle: values.shortTitle,
    category: values.category as Course['category'],
    tagline: values.tagline,
    description: values.description,
    overview: toLines(values.overview),
    image: values.image,
    icon: values.icon,
    duration: values.duration,
    durationWeeks: values.durationWeeks,
    hoursPerWeek: values.hoursPerWeek,
    level: values.level,
    originalFee: values.originalFee,
    mode: toLines(values.mode),
    language: values.language,
    skills: toLines(values.skills),
    tools: toLines(values.tools),
    outcomes: toLines(values.outcomes),
    projects: toLines(values.projects),
    curriculum: values.curriculum.map((entry) => ({
      module: entry.module,
      topics: toLines(entry.topics),
    })),
    careers: values.careers,
    faqs: values.faqs,
    instructorSlug: values.instructorSlug,
    rating: values.rating,
    reviews: values.reviews,
    enrolled: values.enrolled,
    featured: values.featured,
    badge: values.badge === '' ? null : values.badge,
  }
}

export function courseToFormValues(course: Course): CourseFormValues {
  return {
    slug: course.slug,
    title: course.title,
    shortTitle: course.shortTitle,
    category: course.category,
    tagline: course.tagline,
    description: course.description,
    overview: fromLines(course.overview),
    image: course.image,
    icon: course.icon,
    duration: course.duration,
    durationWeeks: course.durationWeeks,
    hoursPerWeek: course.hoursPerWeek,
    level: course.level,
    originalFee: course.originalFee,
    mode: fromLines(course.mode),
    language: course.language,
    skills: fromLines(course.skills),
    tools: fromLines(course.tools),
    outcomes: fromLines(course.outcomes),
    projects: fromLines(course.projects),
    curriculum: course.curriculum.map((entry) => ({
      module: entry.module,
      topics: fromLines(entry.topics),
    })),
    careers: course.careers.map((entry) => ({ ...entry })),
    faqs: course.faqs.map((entry) => ({ ...entry })),
    instructorSlug: course.instructorSlug,
    rating: course.rating,
    reviews: course.reviews,
    enrolled: course.enrolled,
    featured: course.featured,
    badge: course.badge ?? '',
  }
}

/** A brand-new course starts with one empty row in each repeatable group. */
export const emptyCourseFormValues: CourseFormValues = {
  slug: '',
  title: '',
  shortTitle: '',
  category: courseCategories[0],
  tagline: '',
  description: '',
  overview: '',
  image: '/images/generated/courses/placeholder.webp',
  icon: 'Sparkles',
  duration: '3 Months',
  durationWeeks: 12,
  hoursPerWeek: 6,
  level: 'Beginner',
  originalFee: 25000,
  mode: 'On-Campus\nLive Online\nHybrid',
  language: 'Urdu + English',
  skills: '',
  tools: '',
  outcomes: '',
  projects: '',
  curriculum: [{ module: '', topics: '' }],
  careers: [{ role: '', salary: '' }],
  faqs: [{ question: '', answer: '' }],
  instructorSlug: '',
  rating: 4.8,
  reviews: 0,
  enrolled: 0,
  featured: false,
  badge: '',
}

/* ---------------------------------------------------------------------------
 * Blog posts
 * ------------------------------------------------------------------------ */

export const postFormSchema = z.object({
  slug: slugField,
  title: z.string().trim().min(5, 'Title is required').max(160),
  description: z
    .string()
    .trim()
    .min(50, 'Meta descriptions should be at least 50 characters')
    .max(300),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker'),
  updated: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]),
  author: z.string().trim().min(1, 'Choose an author'),
  category: z.string().trim().min(2, 'Category is required').max(80),
  tags: lineList(1, 'tag'),
  image: z.string().trim().min(1, 'Image path is required').max(300),
  imageAlt: z.string().trim().min(5, 'Alt text is required').max(250),
  featured: z.boolean(),
  published: z.boolean(),
  body: z.string().min(50, 'The article body looks empty'),
  faqs: z.array(
    z.object({
      question: z.string().trim().min(5, 'Question is required').max(250),
      answer: z.string().trim().min(10, 'Answer is required').max(2000),
    }),
  ),
})

export type PostFormValues = z.infer<typeof postFormSchema>

export function toPostInput(values: PostFormValues) {
  return {
    slug: values.slug,
    title: values.title,
    description: values.description,
    date: values.date,
    updated: values.updated === '' ? null : values.updated,
    author: values.author,
    category: values.category,
    tags: toLines(values.tags),
    image: values.image,
    imageAlt: values.imageAlt,
    featured: values.featured,
    published: values.published,
    body: values.body,
    faqs: values.faqs,
  }
}

/* ---------------------------------------------------------------------------
 * Testimonials / FAQs / Gallery / Authors
 * ------------------------------------------------------------------------ */

export const testimonialFormSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  role: z.string().trim().min(2, 'Role is required').max(80),
  course: z.string().trim().min(2, 'Course name is required').max(120),
  courseSlug: slugField,
  city: z.string().trim().min(2, 'City is required').max(60),
  avatar: z.string().trim().min(1, 'Avatar path is required').max(300),
  rating: z.coerce.number().int().min(1).max(5),
  quote: z.string().trim().min(20, 'Quote is required').max(600),
  story: z.string().trim().max(2000),
  outcome: z.string().trim().min(3, 'Outcome is required').max(120),
  featured: z.boolean(),
})

export type TestimonialFormValues = z.infer<typeof testimonialFormSchema>

export const faqFormSchema = z.object({
  question: z.string().trim().min(8, 'Question is required').max(250),
  answer: z.string().trim().min(10, 'Answer is required').max(2500),
  category: z.string().trim().min(2, 'Category is required').max(80),
  showOnHomepage: z.boolean(),
})

export type FaqFormValues = z.infer<typeof faqFormSchema>

export const galleryFormSchema = z.object({
  src: z.string().trim().min(1, 'Image path is required').max(300),
  alt: z.string().trim().min(10, 'Alt text is required').max(250),
  caption: z.string().trim().min(3, 'Caption is required').max(160),
  category: z.enum(['Campus', 'Classes', 'Events', 'Students']),
  width: z.coerce.number().int().min(1).max(10_000),
  height: z.coerce.number().int().min(1).max(10_000),
})

export type GalleryFormValues = z.infer<typeof galleryFormSchema>

export const authorFormSchema = z.object({
  slug: slugField,
  name: z.string().trim().min(2, 'Name is required').max(80),
  role: z.string().trim().min(2, 'Role is required').max(120),
  credentials: z.string().trim().min(2, 'Credentials are required').max(160),
  bio: z.string().trim().min(20, 'Short bio is required').max(600),
  longBio: lineList(1, 'biography paragraph'),
  avatar: z.string().trim().min(1, 'Avatar path is required').max(300),
  expertise: lineList(1, 'expertise area'),
  yearsExperience: z.coerce.number().int().min(0).max(70),
  linkedin: z.string().trim().max(300),
  twitter: z.string().trim().max(300),
  github: z.string().trim().max(300),
  email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]),
})

export type AuthorFormValues = z.infer<typeof authorFormSchema>

export function toAuthorInput(values: AuthorFormValues) {
  return {
    slug: values.slug,
    name: values.name,
    role: values.role,
    credentials: values.credentials,
    bio: values.bio,
    longBio: toLines(values.longBio),
    avatar: values.avatar,
    expertise: toLines(values.expertise),
    yearsExperience: values.yearsExperience,
    social: {
      ...(values.linkedin ? { linkedin: values.linkedin } : {}),
      ...(values.twitter ? { twitter: values.twitter } : {}),
      ...(values.github ? { github: values.github } : {}),
      ...(values.email ? { email: values.email } : {}),
    },
  }
}

/* ---------------------------------------------------------------------------
 * Campaign + leads
 * ------------------------------------------------------------------------ */

export const campaignFormSchema = z.object({
  name: z.string().trim().min(3, 'Campaign name is required').max(80),
  emoji: z.string().trim().min(1, 'Add an emoji').max(8),
  discountPercent: z.coerce
    .number()
    .int()
    .min(0, 'Discount cannot be negative')
    .max(100, 'Discount cannot exceed 100%'),
  headline: z.string().trim().min(10, 'Headline is required').max(160),
  subheadline: z.string().trim().min(10, 'Subheadline is required').max(400),
  couponCode: z
    .string()
    .trim()
    .min(3, 'Coupon code is required')
    .max(24)
    .regex(/^[A-Z0-9_-]+$/, 'Use uppercase letters, numbers, hyphens and underscores'),
  timezoneOffset: z
    .string()
    .trim()
    .regex(/^[+-]\d{2}:\d{2}$/, 'Use an offset such as +05:00'),
  seatsTotal: z.coerce.number().int().min(1).max(100_000),
  seatsRemaining: z.coerce.number().int().min(0).max(100_000),
  /** Blank falls back to the rolling "14 August" rule. */
  deadline: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]),
})
  .refine((values) => values.seatsRemaining <= values.seatsTotal, {
    message: 'Seats remaining cannot exceed the total',
    path: ['seatsRemaining'],
  })

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

export const leadStatusSchema = z.enum(LEAD_STATUSES)
