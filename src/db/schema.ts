/**
 * Drizzle schema for the Globify admin.
 *
 * The existing TypeScript types stay the source of truth: every nested shape
 * (`curriculum`, `careers`, `faqs`, `social`, …) is a `jsonb` column stamped
 * with `.$type<>()` from `@/lib/courses`, `@/lib/authors` and `@/lib/content`.
 * Change the type and the column stops compiling — the two cannot drift.
 *
 * These are type-only imports, so nothing from the seed data files is bundled
 * into drizzle-kit or the server runtime.
 */
import type { Author } from '@/lib/authors'
import type { GalleryItem, Testimonial } from '@/lib/content'
import type { Course, CourseCategory } from '@/lib/courses'
import type { PostFrontmatter } from '@/lib/blog'

import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

/* ---------------------------------------------------------------------------
 * Shared column helpers
 * ------------------------------------------------------------------------ */

const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

/** Preserves the hand-tuned ordering of the original hardcoded arrays. */
const sortOrder = integer('sort_order').notNull().default(0)

/* ---------------------------------------------------------------------------
 * Auth — a single admin user, seeded from env vars
 * ------------------------------------------------------------------------ */

export const adminUsers = pgTable(
  'admin_users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    /** bcrypt hash — never the plaintext. */
    passwordHash: text('password_hash').notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('admin_users_email_key').on(table.email)],
)

/* ---------------------------------------------------------------------------
 * Courses
 * ------------------------------------------------------------------------ */

export const courses = pgTable(
  'courses',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    shortTitle: text('short_title').notNull(),
    category: text('category').$type<CourseCategory>().notNull(),
    tagline: text('tagline').notNull(),
    /** ~155 chars — used verbatim as the meta description. */
    description: text('description').notNull(),
    overview: jsonb('overview').$type<string[]>().notNull(),
    image: text('image').notNull(),
    icon: text('icon').notNull(),
    duration: text('duration').notNull(),
    durationWeeks: integer('duration_weeks').notNull(),
    hoursPerWeek: integer('hours_per_week').notNull(),
    level: text('level').$type<Course['level']>().notNull(),
    originalFee: integer('original_fee').notNull(),
    mode: jsonb('mode').$type<string[]>().notNull(),
    language: text('language').notNull(),
    skills: jsonb('skills').$type<string[]>().notNull(),
    tools: jsonb('tools').$type<string[]>().notNull(),
    outcomes: jsonb('outcomes').$type<string[]>().notNull(),
    curriculum: jsonb('curriculum').$type<Course['curriculum']>().notNull(),
    careers: jsonb('careers').$type<Course['careers']>().notNull(),
    projects: jsonb('projects').$type<string[]>().notNull(),
    instructorSlug: text('instructor_slug').notNull(),
    rating: doublePrecision('rating').notNull(),
    reviews: integer('reviews').notNull(),
    enrolled: integer('enrolled').notNull(),
    featured: boolean('featured').notNull().default(false),
    badge: text('badge').$type<NonNullable<Course['badge']>>(),
    faqs: jsonb('faqs').$type<Course['faqs']>().notNull(),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('courses_slug_key').on(table.slug),
    index('courses_category_idx').on(table.category),
  ],
)

/* ---------------------------------------------------------------------------
 * Authors / instructors
 * ------------------------------------------------------------------------ */

export const authors = pgTable(
  'authors',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    credentials: text('credentials').notNull(),
    bio: text('bio').notNull(),
    longBio: jsonb('long_bio').$type<string[]>().notNull(),
    avatar: text('avatar').notNull(),
    expertise: jsonb('expertise').$type<string[]>().notNull(),
    yearsExperience: integer('years_experience').notNull(),
    social: jsonb('social').$type<Author['social']>().notNull(),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('authors_slug_key').on(table.slug)],
)

/* ---------------------------------------------------------------------------
 * Blog posts — front-matter as columns, MDX body as text
 * ------------------------------------------------------------------------ */

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    /** Front-matter dates are plain `YYYY-MM-DD` strings — keep them that way. */
    date: date('date', { mode: 'string' }).notNull(),
    updated: date('updated', { mode: 'string' }),
    /** Author slug — matches `authors.slug`. */
    author: text('author').notNull(),
    category: text('category').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull(),
    image: text('image').notNull(),
    imageAlt: text('image_alt').notNull(),
    featured: boolean('featured').notNull().default(false),
    faqs: jsonb('faqs').$type<NonNullable<PostFrontmatter['faqs']>>().notNull(),
    /** Raw markdown body, exactly as it lived under the MDX front-matter. */
    body: text('body').notNull(),
    /** Drafts stay out of the public site but remain editable in the admin. */
    published: boolean('published').notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('posts_slug_key').on(table.slug),
    index('posts_date_idx').on(table.date),
  ],
)

/* ---------------------------------------------------------------------------
 * Testimonials
 * ------------------------------------------------------------------------ */

export const testimonials = pgTable('testimonials', {
  /** Keeps the original `ts-1` ids from content.ts; new rows get a uuid. */
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  course: text('course').notNull(),
  courseSlug: text('course_slug').notNull(),
  city: text('city').notNull(),
  avatar: text('avatar').notNull(),
  rating: integer('rating').$type<Testimonial['rating']>().notNull(),
  quote: text('quote').notNull(),
  /** Longer narrative shown on the Success Stories page. */
  story: text('story'),
  outcome: text('outcome').notNull(),
  featured: boolean('featured').notNull().default(false),
  sortOrder,
  createdAt,
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * FAQs
 * ------------------------------------------------------------------------ */

export const faqs = pgTable(
  'faqs',
  {
    id: text('id').primaryKey(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: text('category').notNull(),
    /** Replaces the hardcoded `homepageFaqs` question whitelist. */
    showOnHomepage: boolean('show_on_homepage').notNull().default(false),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [index('faqs_category_idx').on(table.category)],
)

/* ---------------------------------------------------------------------------
 * Gallery
 * ------------------------------------------------------------------------ */

export const galleryItems = pgTable('gallery_items', {
  id: text('id').primaryKey(),
  src: text('src').notNull(),
  alt: text('alt').notNull(),
  caption: text('caption').notNull(),
  category: text('category').$type<GalleryItem['category']>().notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * Stats / benefits / milestones
 *
 * No admin screen in this pass, but seeded so the file data is fully migrated
 * and the public site can read everything from one place.
 * ------------------------------------------------------------------------ */

/** Two of the six stats are computed from the catalogue rather than typed in. */
export type StatSource = 'courseCount' | 'averageRating'

export const stats = pgTable('stats', {
  id: text('id').primaryKey(),
  value: doublePrecision('value').notNull(),
  suffix: text('suffix').notNull().default(''),
  label: text('label').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  /** When set, `value`/`description` are recomputed from live course data. */
  derivedFrom: text('derived_from').$type<StatSource>(),
  sortOrder,
  createdAt,
  updatedAt,
})

export const benefits = pgTable('benefits', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

export const milestones = pgTable('milestones', {
  id: text('id').primaryKey(),
  year: text('year').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * Campaign settings — a single row, id 'default'
 * ------------------------------------------------------------------------ */

export const campaignSettings = pgTable('campaign_settings', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  discountPercent: integer('discount_percent').notNull(),
  headline: text('headline').notNull(),
  subheadline: text('subheadline').notNull(),
  couponCode: text('coupon_code').notNull(),
  timezoneOffset: text('timezone_offset').notNull(),
  seatsTotal: integer('seats_total').notNull(),
  seatsRemaining: integer('seats_remaining').notNull(),
  /**
   * Explicit deadline. When null the site falls back to the rolling
   * "14 August 23:59:59 PKT of the current campaign year" rule.
   */
  deadline: timestamp('deadline', { withTimezone: true }),
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * Leads — contact-form submissions
 * ------------------------------------------------------------------------ */

export const LEAD_STATUSES = ['new', 'contacted', 'enrolled', 'closed'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const leads = pgTable(
  'leads',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    /** Course slug, or `not-sure` when the enquirer has not decided. */
    courseSlug: text('course_slug').notNull(),
    /** Resolved at submission time so the lead survives a course rename. */
    courseTitle: text('course_title').notNull(),
    message: text('message').notNull(),
    status: text('status').$type<LeadStatus>().notNull().default('new'),
    source: text('source').notNull().default('website-contact-form'),
    campaign: text('campaign'),
    /** Internal follow-up notes, admin-only. */
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('leads_created_at_idx').on(table.createdAt),
    index('leads_status_idx').on(table.status),
    index('leads_course_slug_idx').on(table.courseSlug),
  ],
)

/* ---------------------------------------------------------------------------
 * Newsletter subscribers
 * ------------------------------------------------------------------------ */

export const SUBSCRIBER_STATUSES = ['subscribed', 'unsubscribed'] as const
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number]

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: text('id').primaryKey(),
    /** Stored lower-cased so the unique index is genuinely case-insensitive. */
    email: text('email').notNull(),
    source: text('source').notNull().default('website-footer'),
    status: text('status').$type<SubscriberStatus>().notNull().default('subscribed'),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('newsletter_subscribers_email_key').on(table.email)],
)

/* ---------------------------------------------------------------------------
 * Inferred row types — used across the data layer and admin server actions
 * ------------------------------------------------------------------------ */

export type CourseRow = typeof courses.$inferSelect
export type NewCourseRow = typeof courses.$inferInsert
export type AuthorRow = typeof authors.$inferSelect
export type PostRow = typeof posts.$inferSelect
export type TestimonialRow = typeof testimonials.$inferSelect
export type FaqRow = typeof faqs.$inferSelect
export type GalleryRow = typeof galleryItems.$inferSelect
export type StatRow = typeof stats.$inferSelect
export type BenefitRow = typeof benefits.$inferSelect
export type MilestoneRow = typeof milestones.$inferSelect
export type CampaignRow = typeof campaignSettings.$inferSelect
export type LeadRow = typeof leads.$inferSelect
export type SubscriberRow = typeof newsletterSubscribers.$inferSelect
export type AdminUserRow = typeof adminUsers.$inferSelect
