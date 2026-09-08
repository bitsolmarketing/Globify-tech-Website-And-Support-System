/**
 * Drizzle schema for the Globify admin — MySQL.
 *
 * The existing TypeScript types stay the source of truth: every nested shape
 * (`curriculum`, `careers`, `faqs`, `social`, …) is a `json` column stamped
 * with `.$type<>()` from `@/lib/courses`, `@/lib/authors` and `@/lib/content`.
 * Change the type and the column stops compiling — the two cannot drift.
 *
 * These are type-only imports, so nothing from the seed data files is bundled
 * into drizzle-kit or the server runtime.
 *
 * Column lengths matter here in a way they did not under Postgres: InnoDB caps
 * an index key at 3072 bytes and `utf8mb4` spends four per character, so the
 * 191-character keys below are the historical `255 * 4 > 767` workaround kept
 * deliberately rather than widened away.
 */
import type { Author } from '@/lib/authors'
import type { GalleryItem, Testimonial } from '@/lib/content'
import type { Course, CourseCategory } from '@/lib/courses'
import type { PostFrontmatter } from '@/lib/blog'

import { sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  date,
  datetime,
  double,
  index,
  int,
  mysqlTable,
  smallint,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'

/**
 * JSON columns, round-tripped by hand.
 *
 * mysql2 already parses a `JSON` column into a value, but it is handed back to
 * drizzle as a string on some paths and as an object on others depending on how
 * the driver was configured — so the built-in helper cannot be relied on to
 * return the same shape twice. Doing both directions explicitly makes the
 * column behave identically whatever the driver decides.
 */
const json = customType<{ data: unknown; driverData: string }>({
  dataType: () => 'json',
  toDriver: (value) => JSON.stringify(value),
  fromDriver: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
})

/* ---------------------------------------------------------------------------
 * Schema
 * ------------------------------------------------------------------------ */

/* ---------------------------------------------------------------------------
 * Shared column helpers
 * ------------------------------------------------------------------------ */

/** Row ids are uuids or deterministic `prefix-slug` strings — 100 is ample. */
const rowId = () => varchar('id', { length: 100 })

/**
 * `datetime`, not `timestamp`.
 *
 * MySQL's `TIMESTAMP` is a 32-bit offset from the epoch and stops at
 * 2038-01-19. `DATETIME` has no such ceiling. Nothing here is likely to outlive
 * 2038, but a column that silently cannot store a future date is the kind of
 * fault that surfaces years later as corrupt data rather than an error.
 *
 * These store UTC by convention, enforced by the driver being given
 * `timezone: 'Z'` in `src/db/index.ts` — MySQL has no timezone-aware type, so
 * unlike Postgres's `timestamptz` the correctness depends on that setting.
 * Change it there and every timestamp in the database shifts.
 */
const createdAt = datetime('created_at', { mode: 'date' })
  .notNull()
  .default(sql`CURRENT_TIMESTAMP`)

/**
 * `ON UPDATE CURRENT_TIMESTAMP` is native here, so writes made outside the ORM
 * — a mysql shell, phpMyAdmin — still bump the column. `$onUpdateFn` covers the
 * writes Drizzle itself issues. Under Postgres this needed a trigger per table
 * (`drizzle/pg/0001_updated_at_triggers.sql`); MySQL gives it for free.
 */
const updatedAt = datetime('updated_at', { mode: 'date' })
  .notNull()
  .default(sql`CURRENT_TIMESTAMP`)
  .$onUpdateFn(() => new Date())

/** Preserves the hand-tuned ordering of the original hardcoded arrays. */
const sortOrder = int('sort_order').notNull().default(0)

/* ---------------------------------------------------------------------------
 * Auth — a single admin user, seeded from env vars
 * ------------------------------------------------------------------------ */

export const adminUsers = mysqlTable(
  'admin_users',
  {
    id: rowId().primaryKey(),
    /**
     * Stored lower-cased. MySQL's `utf8mb4_unicode_ci` collation made both the
     * unique index and every `=` comparison case-insensitive for free; Postgres
     * compares text exactly, so the normalisation that was implicit in the
     * collation is now the seed's and `authorize`'s job. Both lower-case before
     * they touch this column.
     */
    email: varchar('email', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    /** bcrypt hash — never the plaintext. */
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    lastLoginAt: datetime('last_login_at', { mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('admin_users_email_key').on(table.email)],
)

/* ---------------------------------------------------------------------------
 * Courses
 * ------------------------------------------------------------------------ */

export const courses = mysqlTable(
  'courses',
  {
    id: rowId().primaryKey(),
    slug: varchar('slug', { length: 191 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    shortTitle: varchar('short_title', { length: 255 }).notNull(),
    category: varchar('category', { length: 64 }).$type<CourseCategory>().notNull(),
    tagline: varchar('tagline', { length: 500 }).notNull(),
    /** ~155 chars — used verbatim as the meta description. */
    description: text('description').notNull(),
    overview: json('overview').$type<string[]>().notNull(),
    image: varchar('image', { length: 500 }).notNull(),
    icon: varchar('icon', { length: 64 }).notNull(),
    duration: varchar('duration', { length: 64 }).notNull(),
    durationWeeks: int('duration_weeks').notNull(),
    hoursPerWeek: int('hours_per_week').notNull(),
    level: varchar('level', { length: 64 }).$type<Course['level']>().notNull(),
    originalFee: int('original_fee').notNull(),
    mode: json('mode').$type<string[]>().notNull(),
    language: varchar('language', { length: 64 }).notNull(),
    skills: json('skills').$type<string[]>().notNull(),
    tools: json('tools').$type<string[]>().notNull(),
    outcomes: json('outcomes').$type<string[]>().notNull(),
    curriculum: json('curriculum').$type<Course['curriculum']>().notNull(),
    careers: json('careers').$type<Course['careers']>().notNull(),
    projects: json('projects').$type<string[]>().notNull(),
    instructorSlug: varchar('instructor_slug', { length: 191 }).notNull(),
    rating: double('rating').notNull().default(0),
    reviews: int('reviews').notNull().default(0),
    enrolled: int('enrolled').notNull().default(0),
    featured: boolean('featured').notNull().default(false),
    badge: varchar('badge', { length: 64 }).$type<NonNullable<Course['badge']>>(),
    faqs: json('faqs').$type<Course['faqs']>().notNull(),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('courses_slug_key').on(table.slug),
    index('courses_category_idx').on(table.category),
    index('courses_featured_idx').on(table.featured),
    index('courses_sort_order_idx').on(table.sortOrder),
  ],
)

/* ---------------------------------------------------------------------------
 * Authors / instructors
 * ------------------------------------------------------------------------ */

export const authors = mysqlTable(
  'authors',
  {
    id: rowId().primaryKey(),
    slug: varchar('slug', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    role: varchar('role', { length: 191 }).notNull(),
    credentials: varchar('credentials', { length: 500 }).notNull(),
    bio: text('bio').notNull(),
    longBio: json('long_bio').$type<string[]>().notNull(),
    avatar: varchar('avatar', { length: 500 }).notNull(),
    expertise: json('expertise').$type<string[]>().notNull(),
    yearsExperience: int('years_experience').notNull(),
    social: json('social').$type<Author['social']>().notNull(),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('authors_slug_key').on(table.slug)],
)

/* ---------------------------------------------------------------------------
 * Blog posts — front-matter as columns, MDX body as text
 * ------------------------------------------------------------------------ */

export const posts = mysqlTable(
  'posts',
  {
    id: rowId().primaryKey(),
    slug: varchar('slug', { length: 191 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    /** Front-matter dates are plain `YYYY-MM-DD` strings — keep them that way. */
    date: date('date', { mode: 'string' }).notNull(),
    updated: date('updated', { mode: 'string' }),
    /** Author slug — matches `authors.slug`. */
    author: varchar('author', { length: 191 }).notNull(),
    category: varchar('category', { length: 191 }).notNull(),
    tags: json('tags').$type<string[]>().notNull(),
    image: varchar('image', { length: 500 }).notNull(),
    imageAlt: varchar('image_alt', { length: 500 }).notNull(),
    featured: boolean('featured').notNull().default(false),
    faqs: json('faqs').$type<NonNullable<PostFrontmatter['faqs']>>().notNull(),
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
    index('posts_author_idx').on(table.author),
    index('posts_category_idx').on(table.category),
    index('posts_published_idx').on(table.published),
  ],
)

/* ---------------------------------------------------------------------------
 * Testimonials
 * ------------------------------------------------------------------------ */

export const testimonials = mysqlTable(
  'testimonials',
  {
    /** Keeps the original `ts-1` ids from content.ts; new rows get a uuid. */
    id: rowId().primaryKey(),
    name: varchar('name', { length: 191 }).notNull(),
    role: varchar('role', { length: 191 }).notNull(),
    course: varchar('course', { length: 255 }).notNull(),
    courseSlug: varchar('course_slug', { length: 191 }).notNull(),
    city: varchar('city', { length: 191 }).notNull(),
    avatar: varchar('avatar', { length: 500 }).notNull(),
    rating: smallint('rating').$type<Testimonial['rating']>().notNull().default(5),
    quote: text('quote').notNull(),
    /** Longer narrative shown on the Success Stories page. */
    story: text('story'),
    outcome: varchar('outcome', { length: 255 }).notNull(),
    featured: boolean('featured').notNull().default(false),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [
    index('testimonials_course_slug_idx').on(table.courseSlug),
    index('testimonials_featured_idx').on(table.featured),
  ],
)

/* ---------------------------------------------------------------------------
 * FAQs
 * ------------------------------------------------------------------------ */

export const faqs = mysqlTable(
  'faqs',
  {
    id: rowId().primaryKey(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: varchar('category', { length: 191 }).notNull(),
    /** Replaces the hardcoded `homepageFaqs` question whitelist. */
    showOnHomepage: boolean('show_on_homepage').notNull().default(false),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [
    index('faqs_category_idx').on(table.category),
    index('faqs_homepage_idx').on(table.showOnHomepage),
  ],
)

/* ---------------------------------------------------------------------------
 * Gallery
 * ------------------------------------------------------------------------ */

export const galleryItems = mysqlTable(
  'gallery_items',
  {
    id: rowId().primaryKey(),
    src: varchar('src', { length: 500 }).notNull(),
    alt: varchar('alt', { length: 500 }).notNull(),
    caption: varchar('caption', { length: 500 }).notNull(),
    category: varchar('category', { length: 64 }).$type<GalleryItem['category']>().notNull(),
    width: int('width').notNull(),
    height: int('height').notNull(),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [index('gallery_items_category_idx').on(table.category)],
)

/* ---------------------------------------------------------------------------
 * Stats / benefits / milestones
 * ------------------------------------------------------------------------ */

/** Two of the six stats are computed from the catalogue rather than typed in. */
export type StatSource = 'courseCount' | 'averageRating'

export const stats = mysqlTable('stats', {
  id: rowId().primaryKey(),
  value: double('value').notNull(),
  suffix: varchar('suffix', { length: 16 }).notNull().default(''),
  label: varchar('label', { length: 191 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  icon: varchar('icon', { length: 64 }).notNull(),
  /** When set, `value`/`description` are recomputed from live course data. */
  derivedFrom: varchar('derived_from', { length: 64 }).$type<StatSource>(),
  sortOrder,
  createdAt,
  updatedAt,
})

export const benefits = mysqlTable('benefits', {
  id: rowId().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 64 }).notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

export const milestones = mysqlTable('milestones', {
  id: rowId().primaryKey(),
  year: varchar('year', { length: 16 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * Why Choose Us — differentiators and the hero trust strip
 * ------------------------------------------------------------------------ */

export const differentiators = mysqlTable('differentiators', {
  id: rowId().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  /** The short number that backs the claim, e.g. "92% completion". */
  proof: varchar('proof', { length: 191 }).notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

export const trustBadges = mysqlTable('trust_badges', {
  id: rowId().primaryKey(),
  label: varchar('label', { length: 191 }).notNull(),
  icon: varchar('icon', { length: 64 }).notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * Course categories — the catalogue filter tabs and mega-menu headings
 * ------------------------------------------------------------------------ */

export const courseCategories = mysqlTable(
  'course_categories',
  {
    id: rowId().primaryKey(),
    slug: varchar('slug', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).$type<CourseCategory>().notNull(),
    description: varchar('description', { length: 500 }).notNull().default(''),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('course_categories_slug_key').on(table.slug)],
)

/* ---------------------------------------------------------------------------
 * Site settings — brand, contact block, address, geo, hours. Single row.
 * ------------------------------------------------------------------------ */

export type OpeningHour = { days: string; time: string }
export type OpeningHoursSpec = { days: string[]; opens: string; closes: string }

export const siteSettings = mysqlTable('site_settings', {
  id: rowId().primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  shortName: varchar('short_name', { length: 191 }).notNull(),
  legalName: varchar('legal_name', { length: 191 }).notNull(),
  tagline: varchar('tagline', { length: 255 }).notNull(),
  description: text('description').notNull(),
  founded: varchar('founded', { length: 16 }).notNull(),
  logo: varchar('logo', { length: 500 }).notNull(),
  keywords: json('keywords').$type<string[]>().notNull(),
  /** Admission counsellor — backs every plain `tel:` link on the site. */
  phone: varchar('phone', { length: 64 }).notNull(),
  phoneHref: varchar('phone_href', { length: 64 }).notNull(),
  /** WhatsApp chat bot. */
  whatsapp: varchar('whatsapp', { length: 64 }).notNull(),
  whatsappDisplay: varchar('whatsapp_display', { length: 64 }).notNull(),
  /** Course Q&A line — syllabus, batches and fee questions. */
  coursesPhone: varchar('courses_phone', { length: 64 }).notNull(),
  coursesPhoneHref: varchar('courses_phone_href', { length: 64 }).notNull(),
  email: varchar('email', { length: 191 }).notNull(),
  admissionsEmail: varchar('admissions_email', { length: 191 }).notNull(),
  addressStreet: varchar('address_street', { length: 255 }).notNull(),
  addressLocality: varchar('address_locality', { length: 128 }).notNull(),
  addressRegion: varchar('address_region', { length: 128 }).notNull(),
  addressPostalCode: varchar('address_postal_code', { length: 32 }).notNull(),
  addressCountry: varchar('address_country', { length: 8 }).notNull(),
  addressCountryName: varchar('address_country_name', { length: 128 }).notNull(),
  latitude: double('latitude').notNull(),
  longitude: double('longitude').notNull(),
  mapEmbedUrl: varchar('map_embed_url', { length: 1000 }).notNull(),
  /** Google Business Profile — every "find us" link points here. */
  officeUrl: varchar('office_url', { length: 1000 }).notNull(),
  openingHours: json('opening_hours').$type<OpeningHour[]>().notNull(),
  openingHoursSpec: json('opening_hours_spec').$type<OpeningHoursSpec>().notNull(),
  updatedAt,
})

export const socialLinks = mysqlTable('social_links', {
  id: rowId().primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  href: varchar('href', { length: 500 }).notNull(),
  icon: varchar('icon', { length: 64 }).notNull(),
  active: boolean('active').notNull().default(true),
  sortOrder,
  createdAt,
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * Navigation — header, mega-menu and the four footer columns in one table.
 * ------------------------------------------------------------------------ */

export const NAV_LOCATIONS = [
  'header',
  'megamenu',
  'megamenu-feature',
  'footer-company',
  'footer-courses',
  'footer-resources',
  'footer-legal',
] as const
export type NavLocation = (typeof NAV_LOCATIONS)[number]

export const navLinks = mysqlTable(
  'nav_links',
  {
    id: rowId().primaryKey(),
    location: varchar('location', { length: 64 }).$type<NavLocation>().notNull(),
    /** Mega-menu headings are parents; their links point back via this column. */
    parentId: varchar('parent_id', { length: 100 }),
    label: varchar('label', { length: 191 }).notNull(),
    href: varchar('href', { length: 500 }).notNull(),
    description: varchar('description', { length: 500 }),
    /** Only used by the mega-menu promo card. */
    ctaLabel: varchar('cta_label', { length: 191 }),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [
    index('nav_links_location_idx').on(table.location),
    index('nav_links_parent_idx').on(table.parentId),
  ],
)

/* ---------------------------------------------------------------------------
 * Campaign settings — a single row, id 'default'
 * ------------------------------------------------------------------------ */

export const campaignSettings = mysqlTable('campaign_settings', {
  id: rowId().primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  emoji: varchar('emoji', { length: 32 }).notNull(),
  discountPercent: int('discount_percent').notNull(),
  headline: varchar('headline', { length: 500 }).notNull(),
  subheadline: text('subheadline').notNull(),
  couponCode: varchar('coupon_code', { length: 64 }).notNull(),
  timezoneOffset: varchar('timezone_offset', { length: 16 }).notNull(),
  seatsTotal: int('seats_total').notNull(),
  seatsRemaining: int('seats_remaining').notNull(),
  /**
   * Explicit deadline. When null the site falls back to the rolling
   * "14 August 23:59:59 PKT of the current campaign year" rule.
   */
  deadline: datetime('deadline', { mode: 'date' }),
  updatedAt,
})

/* ---------------------------------------------------------------------------
 * Leads — every enquiry, whichever channel it arrived on
 * ------------------------------------------------------------------------ */

export const LEAD_STATUSES = ['new', 'contacted', 'enrolled', 'closed'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

/**
 * Where an enquiry came from.
 *
 * `website` is the contact form. `chatbot` is the assistant on
 * /contact/support and ai.globifytech.com. The last three are Meta: they arrive
 * through /api/webhooks/meta, which sees every inbound message before relaying
 * it to the assistant.
 */
export const LEAD_CHANNELS = [
  'website',
  'chatbot',
  'whatsapp',
  'messenger',
  'instagram',
  'manual',
] as const
export type LeadChannel = (typeof LEAD_CHANNELS)[number]

/**
 * Nullability here follows what each channel can actually know.
 *
 * The contact form asks for a name, phone, email and course, so it always has
 * them. Someone who messages the WhatsApp number has a phone number and
 * possibly a profile name; someone who messages the Facebook page has neither —
 * only an opaque page-scoped id. Requiring those columns would mean writing
 * empty strings and calling them data, and every count of "leads with an email"
 * would be wrong from then on. A missing value is recorded as missing.
 *
 * `courseSlug` stays required because "not sure yet" is a real answer the form
 * already offers, so there is an honest value to default to.
 */
export const leads = mysqlTable(
  'leads',
  {
    id: rowId().primaryKey(),
    name: varchar('name', { length: 191 }),
    phone: varchar('phone', { length: 64 }),
    email: varchar('email', { length: 191 }),
    /** Course slug, or `not-sure` when the enquirer has not decided. */
    courseSlug: varchar('course_slug', { length: 191 }).notNull().default('not-sure'),
    /** Resolved at submission time so the lead survives a course rename. */
    courseTitle: varchar('course_title', { length: 255 }).notNull().default('Not sure yet'),
    message: text('message'),
    status: varchar('status', { length: 32 }).$type<LeadStatus>().notNull().default('new'),
    channel: varchar('channel', { length: 32 }).$type<LeadChannel>().notNull().default('website'),
    source: varchar('source', { length: 64 }).notNull().default('website-contact-form'),
    /**
     * The identity on the channel it arrived on: a WhatsApp number, a
     * page-scoped id on Messenger, an Instagram-scoped id. Null for the form,
     * which identifies people by email.
     */
    handle: varchar('handle', { length: 191 }),
    /**
     * The sending system's own id for this enquiry — a WhatsApp contact, an
     * assistant conversation reference. Unique, so a webhook redelivery or a
     * second message from the same person updates the lead instead of adding
     * another one. Null for anything with no upstream identity, and Postgres —
     * like MySQL before it — treats each NULL as distinct, so any number of
     * form submissions coexist under the same unique index.
     */
    externalRef: varchar('external_ref', { length: 191 }),
    campaign: varchar('campaign', { length: 191 }),
    /** Internal follow-up notes, admin-only. */
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('leads_created_at_idx').on(table.createdAt),
    index('leads_status_idx').on(table.status),
    index('leads_course_slug_idx').on(table.courseSlug),
    index('leads_email_idx').on(table.email),
    index('leads_channel_idx').on(table.channel),
    uniqueIndex('leads_external_ref_key').on(table.externalRef),
  ],
)

/* ---------------------------------------------------------------------------
 * Newsletter subscribers
 * ------------------------------------------------------------------------ */

export const SUBSCRIBER_STATUSES = ['subscribed', 'unsubscribed'] as const
export type SubscriberStatus = (typeof SUBSCRIBER_STATUSES)[number]

export const newsletterSubscribers = mysqlTable(
  'newsletter_subscribers',
  {
    id: rowId().primaryKey(),
    /** Stored lower-cased so the unique index is genuinely case-insensitive. */
    email: varchar('email', { length: 191 }).notNull(),
    source: varchar('source', { length: 64 }).notNull().default('website-footer'),
    status: varchar('status', { length: 32 })
      .$type<SubscriberStatus>()
      .notNull()
      .default('subscribed'),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('newsletter_subscribers_email_key').on(table.email)],
)

/* ---------------------------------------------------------------------------
 * Assistant conversations
 *
 * The chatbot answers WhatsApp, Instagram and Messenger from this application,
 * so its threads live here rather than in a second service with a second
 * database and a second admin login.
 *
 * Only two tables, deliberately. A thread and its messages are all that is
 * needed to answer, to show a transcript in the admin, and to hand a
 * conversation to a person. Everything an enquiry turns into — a name, a
 * course, a callback request — belongs on `leads`, which already exists and is
 * already the admissions team's inbox.
 * ------------------------------------------------------------------------ */

export const BOT_CHANNELS = ['whatsapp', 'instagram', 'messenger', 'web'] as const
export type BotChannel = (typeof BOT_CHANNELS)[number]

export const BOT_LANGUAGES = ['en', 'ur', 'ur_roman', 'pa'] as const
export type BotLanguage = (typeof BOT_LANGUAGES)[number]

export const conversations = mysqlTable(
  'conversations',
  {
    id: rowId().primaryKey(),
    /** Human-quotable reference shown in the admin, e.g. `WA-CONV-8F2K1D`. */
    reference: varchar('reference', { length: 64 }).notNull(),
    channel: varchar('channel', { length: 32 }).$type<BotChannel>().notNull(),
    /** WhatsApp only — a real, dialable number in display form. */
    contactPhone: varchar('contact_phone', { length: 64 }),
    /**
     * Instagram and Messenger identify a person by an app-scoped id (IGSID or
     * PSID) that means nothing outside the inbox it came from. It gets its own
     * column rather than borrowing `contactPhone`, because an id that cannot be
     * dialled must never sit in a field the team reads as a number to call.
     */
    contactHandle: varchar('contact_handle', { length: 191 }),
    contactName: varchar('contact_name', { length: 191 }),
    language: varchar('language', { length: 16 }).$type<BotLanguage>().notNull().default('en'),
    /**
     * In-progress slot filling for channels that have no forms:
     * `{ flow, step, answers, startedAt }`. Resumed on every delivery, because
     * a webhook is a cold start and the step index cannot live in memory.
     */
    capture: json('capture').$type<Record<string, unknown> | null>(),
    /** Set when a person takes over; the bot then stays quiet on this thread. */
    handedOff: boolean('handed_off').notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('conversations_reference_key').on(table.reference),
    index('conversations_channel_phone_idx').on(table.channel, table.contactPhone),
    index('conversations_channel_handle_idx').on(table.channel, table.contactHandle),
    index('conversations_updated_at_idx').on(table.updatedAt),
  ],
)

export const conversationMessages = mysqlTable(
  'conversation_messages',
  {
    id: rowId().primaryKey(),
    conversationId: varchar('conversation_id', { length: 100 }).notNull(),
    role: varchar('role', { length: 16 }).$type<'user' | 'assistant'>().notNull(),
    content: text('content').notNull(),
    language: varchar('language', { length: 16 }).$type<BotLanguage>(),
    /**
     * Meta's own id for the message. Unique, and it is the whole reason a
     * webhook redelivery cannot make the bot answer the same person twice:
     * the second insert violates this index and the handler stops there.
     * Null for outbound messages a send never returned an id for.
     */
    externalId: varchar('external_id', { length: 191 }),
    createdAt,
  },
  (table) => [
    index('conversation_messages_conversation_idx').on(table.conversationId, table.createdAt),
    uniqueIndex('conversation_messages_external_id_key').on(table.externalId),
  ],
)

/* ---------------------------------------------------------------------------
 * Learning portal — students, instructors and everything a cohort produces
 * ===========================================================================
 *
 * Everything below this line belongs to the LMS at `/student` and
 * `/instructor`. It is deliberately separate from the marketing tables above:
 * `courses` describes what is *sold*, these tables describe what is *taught*.
 *
 * The join between the two is `batches.course_id`. A course is a syllabus that
 * exists once; a batch is one delivery of it, to one group, on one timetable,
 * by one instructor — so attendance, assignments and grades all hang off the
 * batch and never off the course.
 *
 * No foreign-key constraints, matching every table above. Ids are plain
 * `varchar(100)` with an index on the joining column. That is the house style
 * here because the seed and the admin both write rows in an order constraints
 * would reject, and because the pooler makes a deferred constraint check its
 * own kind of surprise. The data layer enforces these relationships instead —
 * `src/lib/data/portal.ts` is the only writer.
 * ------------------------------------------------------------------------ */

/**
 * Portal accounts live in their own table, not in `admin_users`.
 *
 * A student signing in must not be able to become an administrator by any
 * route, including a bug. Keeping the two populations in separate tables means
 * the admin sign-in query can never return a student row — not "should not",
 * *cannot*, because it does not read this table. The two sessions are
 * separately encrypted cookies as well; see `src/portal-auth.config.ts`.
 */
export const PORTAL_ROLES = ['student', 'instructor'] as const
export type PortalRole = (typeof PORTAL_ROLES)[number]

export const PORTAL_USER_STATUSES = ['active', 'suspended'] as const
export type PortalUserStatus = (typeof PORTAL_USER_STATUSES)[number]

export const portalUsers = mysqlTable(
  'portal_users',
  {
    id: rowId().primaryKey(),
    /** Stored lower-cased — see the note on `adminUsers.email`. */
    email: varchar('email', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    /** bcrypt hash — never the plaintext. */
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 16 }).$type<PortalRole>().notNull(),
    phone: varchar('phone', { length: 64 }),
    /** Uploaded through the same `/uploads` pipeline the admin forms use. */
    avatarUrl: varchar('avatar_url', { length: 500 }),
    headline: varchar('headline', { length: 255 }),
    bio: text('bio'),
    /**
     * Instructors are also public content — the `authors` row rendered on a
     * course page. Linking by slug rather than id keeps that association
     * readable in the database and survives a re-seed, which regenerates
     * `authors.id` but never the slug.
     */
    authorSlug: varchar('author_slug', { length: 191 }),
    status: varchar('status', { length: 16 })
      .$type<PortalUserStatus>()
      .notNull()
      .default('active'),
    /**
     * Set when an admin provisions the account with a temporary password. The
     * portal layout diverts to `/portal/password` until it is cleared, so a
     * generated password cannot quietly become a permanent one.
     */
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    lastLoginAt: datetime('last_login_at', { mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('portal_users_email_key').on(table.email),
    index('portal_users_role_idx').on(table.role, table.status),
    index('portal_users_author_slug_idx').on(table.authorSlug),
  ],
)

/* ------------------------------------------------------------------ Batches */

export const BATCH_STATUSES = ['upcoming', 'active', 'completed', 'cancelled'] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

export const batches = mysqlTable(
  'batches',
  {
    id: rowId().primaryKey(),
    /** `courses.id`. */
    courseId: varchar('course_id', { length: 100 }).notNull(),
    /**
     * Denormalised from `courses` at write time.
     *
     * A student dashboard lists batches, and every list would otherwise join
     * `courses` purely to print a title. More importantly it is a historical
     * record: renaming a course in the admin must not retitle the certificate
     * of someone who finished the old one.
     */
    courseSlug: varchar('course_slug', { length: 191 }).notNull(),
    courseTitle: varchar('course_title', { length: 255 }).notNull(),
    /** Human reference used in conversation, e.g. `FSD-2026-A`. */
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    /** `portal_users.id` of the instructor who leads it. */
    instructorId: varchar('instructor_id', { length: 100 }).notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    /** Free text, e.g. "Mon & Wed, 6:00–8:00 pm". Timetables resist a schema. */
    schedule: varchar('schedule', { length: 255 }),
    mode: varchar('mode', { length: 64 }).notNull().default('On-campus'),
    /** 0 means uncapped. */
    capacity: int('capacity').notNull().default(0),
    /** Standing room link for online cohorts. */
    meetingUrl: varchar('meeting_url', { length: 500 }),
    status: varchar('status', { length: 16 }).$type<BatchStatus>().notNull().default('upcoming'),
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('batches_code_key').on(table.code),
    index('batches_instructor_idx').on(table.instructorId, table.status),
    index('batches_course_idx').on(table.courseId),
    index('batches_status_idx').on(table.status, table.startDate),
  ],
)

/* -------------------------------------------------------------- Enrolments */

export const ENROLLMENT_STATUSES = ['active', 'completed', 'dropped'] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const enrollments = mysqlTable(
  'enrollments',
  {
    id: rowId().primaryKey(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    /** `portal_users.id`, always a row whose role is `student`. */
    studentId: varchar('student_id', { length: 100 }).notNull(),
    status: varchar('status', { length: 16 })
      .$type<EnrollmentStatus>()
      .notNull()
      .default('active'),
    enrolledAt: datetime('enrolled_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: datetime('completed_at', { mode: 'date' }),
    /**
     * Where the enrolment came from — `leads.id` when the admin converted an
     * enquiry, null when the student was added directly.
     */
    leadId: varchar('lead_id', { length: 100 }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('enrollments_batch_student_key').on(table.batchId, table.studentId),
    index('enrollments_student_idx').on(table.studentId, table.status),
    index('enrollments_batch_idx').on(table.batchId, table.status),
  ],
)

/**
 * A student ticking off a curriculum module.
 *
 * The syllabus itself is `courses.curriculum` — a jsonb array — so progress is
 * stored by position in that array rather than against a `modules` table that
 * would have to be kept in step with it. `moduleTitle` is copied in so a row
 * still reads correctly after the curriculum is edited, and `moduleIndex` is
 * what the checklist matches on.
 */
export const moduleProgress = mysqlTable(
  'module_progress',
  {
    id: rowId().primaryKey(),
    enrollmentId: varchar('enrollment_id', { length: 100 }).notNull(),
    moduleIndex: smallint('module_index').notNull(),
    moduleTitle: varchar('module_title', { length: 255 }).notNull(),
    completedAt: datetime('completed_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    createdAt,
  },
  (table) => [
    uniqueIndex('module_progress_enrollment_module_key').on(
      table.enrollmentId,
      table.moduleIndex,
    ),
  ],
)

/* --------------------------------------------------- Classes and attendance */

export const CLASS_SESSION_STATUSES = ['scheduled', 'held', 'cancelled'] as const
export type ClassSessionStatus = (typeof CLASS_SESSION_STATUSES)[number]

export const classSessions = mysqlTable(
  'class_sessions',
  {
    id: rowId().primaryKey(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    topic: text('topic'),
    scheduledAt: datetime('scheduled_at', { mode: 'date' }).notNull(),
    durationMinutes: int('duration_minutes').notNull().default(120),
    meetingUrl: varchar('meeting_url', { length: 500 }),
    recordingUrl: varchar('recording_url', { length: 500 }),
    status: varchar('status', { length: 16 })
      .$type<ClassSessionStatus>()
      .notNull()
      .default('scheduled'),
    /** Set the first time attendance is saved — drives the "unmarked" list. */
    /* No `withTimezone`: MySQL's DATETIME has no timezone-aware variant. The
       pool pins every connection to UTC instead, which is what keeps this an
       absolute instant rather than "whatever the server's clock said". */
    attendanceMarkedAt: datetime('attendance_marked_at', { mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('class_sessions_batch_idx').on(table.batchId, table.scheduledAt),
    index('class_sessions_scheduled_idx').on(table.scheduledAt),
  ],
)

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const attendance = mysqlTable(
  'attendance',
  {
    id: rowId().primaryKey(),
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    /** Carried alongside the session so a per-batch roll-up needs no join. */
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    studentId: varchar('student_id', { length: 100 }).notNull(),
    status: varchar('status', { length: 16 }).$type<AttendanceStatus>().notNull(),
    note: varchar('note', { length: 500 }),
    /** `portal_users.id` of the instructor who marked it. */
    markedById: varchar('marked_by_id', { length: 100 }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('attendance_session_student_key').on(table.sessionId, table.studentId),
    index('attendance_student_idx').on(table.studentId, table.batchId),
    index('attendance_batch_idx').on(table.batchId, table.status),
  ],
)

/* ---------------------------------------------- Materials and announcements */

export const MATERIAL_TYPES = ['link', 'file', 'video', 'note'] as const
export type MaterialType = (typeof MATERIAL_TYPES)[number]

export const materials = mysqlTable(
  'materials',
  {
    id: rowId().primaryKey(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 16 }).$type<MaterialType>().notNull().default('link'),
    url: varchar('url', { length: 500 }),
    /** Body for `note` materials — the type that has no URL. */
    body: text('body'),
    /** Optional grouping onto a curriculum module, by index. */
    moduleIndex: smallint('module_index'),
    uploadedById: varchar('uploaded_by_id', { length: 100 }).notNull(),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [index('materials_batch_idx').on(table.batchId, table.sortOrder)],
)

export const announcements = mysqlTable(
  'announcements',
  {
    id: rowId().primaryKey(),
    /** Null means every batch the author teaches — a portal-wide notice. */
    batchId: varchar('batch_id', { length: 100 }),
    authorId: varchar('author_id', { length: 100 }).notNull(),
    authorName: varchar('author_name', { length: 191 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    pinned: boolean('pinned').notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('announcements_batch_idx').on(table.batchId, table.createdAt),
    index('announcements_author_idx').on(table.authorId),
  ],
)

/* ------------------------------------------------- Assignments and marking */

export const assignments = mysqlTable(
  'assignments',
  {
    id: rowId().primaryKey(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    brief: text('brief').notNull(),
    /** Reference material the brief points at — a repo, a spec, a dataset. */
    attachmentUrl: varchar('attachment_url', { length: 500 }),
    dueAt: datetime('due_at', { mode: 'date' }).notNull(),
    maxScore: int('max_score').notNull().default(100),
    /** Counts toward the final grade at this weight; 0 excludes it. */
    weight: int('weight').notNull().default(1),
    allowLate: boolean('allow_late').notNull().default(true),
    /** Null while it is a draft — students never see an unpublished row. */
    publishedAt: datetime('published_at', { mode: 'date' }),
    createdById: varchar('created_by_id', { length: 100 }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('assignments_batch_idx').on(table.batchId, table.dueAt),
    index('assignments_published_idx').on(table.publishedAt),
  ],
)

export const SUBMISSION_STATUSES = ['submitted', 'graded', 'resubmit'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const submissions = mysqlTable(
  'submissions',
  {
    id: rowId().primaryKey(),
    assignmentId: varchar('assignment_id', { length: 100 }).notNull(),
    /** Denormalised so a student grade sheet is one query. */
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    studentId: varchar('student_id', { length: 100 }).notNull(),
    /** What was handed in: a repository or deployment URL, and/or a note. */
    url: varchar('url', { length: 500 }),
    notes: text('notes'),
    status: varchar('status', { length: 16 })
      .$type<SubmissionStatus>()
      .notNull()
      .default('submitted'),
    submittedAt: datetime('submitted_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    /**
     * Recorded at submission time rather than compared on read: `due_at` can be
     * extended after the fact, and a hand-in that *was* late should not
     * silently become punctual because the deadline moved.
     */
    late: boolean('late').notNull().default(false),
    score: int('score'),
    feedback: text('feedback'),
    gradedById: varchar('graded_by_id', { length: 100 }),
    gradedAt: datetime('graded_at', { mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('submissions_assignment_student_key').on(table.assignmentId, table.studentId),
    index('submissions_student_idx').on(table.studentId, table.batchId),
    index('submissions_status_idx').on(table.batchId, table.status),
  ],
)

/* ------------------------------------------------------------------ Quizzes */

/**
 * A single multiple-choice question.
 *
 * Stored as jsonb on the quiz rather than in a `questions` table: a quiz is
 * always read and written whole, never queried question-by-question, and
 * keeping it in one row means editing a quiz is one atomic write.
 */
export type QuizQuestion = {
  id: string
  prompt: string
  options: string[]
  /** Index into `options`. */
  correctIndex: number
  points: number
}

/** One answer in an attempt. `selectedIndex` is null when left blank. */
export type QuizAnswer = { questionId: string; selectedIndex: number | null }

export const quizzes = mysqlTable(
  'quizzes',
  {
    id: rowId().primaryKey(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    questions: json('questions').$type<QuizQuestion[]>().notNull(),
    /** 0 means untimed. */
    timeLimitMinutes: int('time_limit_minutes').notNull().default(0),
    maxAttempts: int('max_attempts').notNull().default(1),
    /** Percentage needed to pass. */
    passScore: int('pass_score').notNull().default(60),
    weight: int('weight').notNull().default(1),
    dueAt: datetime('due_at', { mode: 'date' }),
    publishedAt: datetime('published_at', { mode: 'date' }),
    createdById: varchar('created_by_id', { length: 100 }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('quizzes_batch_idx').on(table.batchId, table.dueAt),
    index('quizzes_published_idx').on(table.publishedAt),
  ],
)

export const quizAttempts = mysqlTable(
  'quiz_attempts',
  {
    id: rowId().primaryKey(),
    quizId: varchar('quiz_id', { length: 100 }).notNull(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    studentId: varchar('student_id', { length: 100 }).notNull(),
    /** 1-based, so `attempt_number = max_attempts` is the last one allowed. */
    attemptNumber: smallint('attempt_number').notNull().default(1),
    answers: json('answers').$type<QuizAnswer[]>().notNull(),
    score: int('score').notNull().default(0),
    maxScore: int('max_score').notNull().default(0),
    startedAt: datetime('started_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    submittedAt: datetime('submitted_at', { mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('quiz_attempts_quiz_student_attempt_key').on(
      table.quizId,
      table.studentId,
      table.attemptNumber,
    ),
    index('quiz_attempts_student_idx').on(table.studentId, table.batchId),
  ],
)

/* ------------------------------------------------------------- Certificates */

export const certificates = mysqlTable(
  'certificates',
  {
    id: rowId().primaryKey(),
    enrollmentId: varchar('enrollment_id', { length: 100 }).notNull(),
    studentId: varchar('student_id', { length: 100 }).notNull(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    /**
     * Printed on the certificate and the only thing a verifier is given, so it
     * must be unguessable as well as unique — a sequential number would let
     * anyone enumerate every graduate at `/verify/GT-2026-0002`.
     */
    serial: varchar('serial', { length: 64 }).notNull(),
    studentName: varchar('student_name', { length: 191 }).notNull(),
    courseTitle: varchar('course_title', { length: 255 }).notNull(),
    /** The computed grade at the moment of issue, frozen. */
    finalScore: int('final_score'),
    grade: varchar('grade', { length: 16 }),
    issuedAt: datetime('issued_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
    issuedById: varchar('issued_by_id', { length: 100 }).notNull(),
    revokedAt: datetime('revoked_at', { mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('certificates_serial_key').on(table.serial),
    uniqueIndex('certificates_enrollment_key').on(table.enrollmentId),
    index('certificates_student_idx').on(table.studentId),
  ],
)

/* ---------------------------------------------------------------------------
 * WhatsApp broadcasts
 *
 * A broadcast is a message the institute sends *first*, to many people at once
 * — a new batch announcement, a fee deadline, a results day. That is a
 * different thing from everything above it in this file, and the difference is
 * imposed by Meta rather than chosen here:
 *
 *   · Inside the 24-hour customer service window (the person messaged us last)
 *     any free-form text is allowed.
 *   · Outside it, only a **pre-approved template** will be delivered. Free text
 *     is rejected with error 131047 — per recipient, after the send was already
 *     accepted — so a text broadcast to a cold list does not fail loudly, it
 *     silently reaches nobody.
 *
 * Both shapes are modelled and `kind` says which one this is. The runner
 * refuses to send free text to anyone outside the window rather than letting
 * Meta reject it one number at a time.
 *
 * Recipients are materialised into their own table when the broadcast is
 * composed, not re-derived from a filter at send time. Three reasons: the admin
 * can see exactly who will be messaged before committing; a run interrupted
 * half way resumes without messaging the first half twice; and a lead created
 * during the send does not silently join a broadcast nobody reviewed.
 * ------------------------------------------------------------------------ */

export const BROADCAST_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'paused',
  'completed',
  'cancelled',
] as const
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number]

/** `template` works at any time; `text` only inside the 24-hour window. */
export const BROADCAST_KINDS = ['template', 'text'] as const
export type BroadcastKind = (typeof BROADCAST_KINDS)[number]

/** Where the recipient list was drawn from. Kept for the audit trail. */
export const BROADCAST_SOURCES = ['leads', 'conversations', 'manual'] as const
export type BroadcastSource = (typeof BROADCAST_SOURCES)[number]

export type BroadcastAudience = {
  source: BroadcastSource
  /** `leads` only — narrows to one pipeline stage. */
  leadStatus?: LeadStatus | null
  /** `leads` only — narrows to one course. */
  courseSlug?: string | null
  /** Only people seen in the last N days. Null means no limit. */
  sinceDays?: number | null
  /** `manual` only — numbers pasted into the form, one per line. */
  manual?: string[]
}

export const broadcasts = mysqlTable(
  'broadcasts',
  {
    id: rowId().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    status: varchar('status', { length: 24 })
      .$type<BroadcastStatus>()
      .notNull()
      .default('draft'),
    kind: varchar('kind', { length: 16 }).$type<BroadcastKind>().notNull().default('template'),

    /* --- Template sends ------------------------------------------------- */
    /** The approved template's name in WhatsApp Manager, e.g. `new_batch_alert`. */
    templateName: varchar('template_name', { length: 191 }),
    /** Meta's locale code — `en`, `en_US`, `ur`. Must match the approved one. */
    templateLanguage: varchar('template_language', { length: 16 }).default('en_US'),
    /**
     * Values for the template's positional `{{1}}`, `{{2}}` … placeholders, in
     * order. Each may itself contain a merge token (`{name}`, `{course}`)
     * resolved per recipient at send time.
     */
    templateVariables: json('template_variables').$type<string[]>().notNull().default([]),
    /** Fills a template whose header is an image. Must be a public https URL. */
    headerImageUrl: varchar('header_image_url', { length: 500 }),
    /**
     * The single value a TEXT header may declare, kept out of
     * `templateVariables` on purpose: Meta numbers header and body placeholders
     * independently, both starting at `{{1}}`, so one shared array would put
     * the body's first value in the header on every template that has both.
     */
    headerParameter: varchar('header_parameter', { length: 500 }),

    /* --- Free-text sends ------------------------------------------------ */
    /** The message for `kind = 'text'`; a copy of the approved body otherwise. */
    body: text('body'),

    audience: json('audience').$type<BroadcastAudience>(),
    /** Set when the admin schedules rather than sends; the cron route picks it up. */
    scheduledFor: datetime('scheduled_for', { mode: 'date' }),
    startedAt: datetime('started_at', { mode: 'date' }),
    completedAt: datetime('completed_at', { mode: 'date' }),
    /** The failure that stopped the whole run, as opposed to one recipient's. */
    lastError: text('last_error'),
    createdBy: varchar('created_by', { length: 191 }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('broadcasts_status_idx').on(table.status),
    index('broadcasts_created_at_idx').on(table.createdAt),
    index('broadcasts_scheduled_for_idx').on(table.scheduledFor),
  ],
)

/**
 * `sending` is a claim, not a phase.
 *
 * A run is not one process: the admin's browser drives it while the tab is
 * open, a cron sweep picks up whatever is left, and on a serverless host either
 * can be replaced mid-flight. Two workers reading the same `queued` row is
 * therefore the normal case, not an edge one, and it messages the same person
 * twice.
 *
 * So a worker flips the row to `sending` inside the same statement that selects
 * it (`FOR UPDATE SKIP LOCKED` — see `claimRecipients`), which no second worker
 * can then see. A row still marked `sending` after the stale window is one
 * whose worker died, and is returned to the queue rather than left stuck.
 */
export const BROADCAST_RECIPIENT_STATUSES = [
  'queued',
  'sending',
  'sent',
  'failed',
  'skipped',
] as const
export type BroadcastRecipientStatus = (typeof BROADCAST_RECIPIENT_STATUSES)[number]

/**
 * What Meta later said happened to a message it had already accepted.
 *
 * `sent` is the acknowledgement from the API; everything after it arrives on
 * the webhook, minutes or hours later. A message can be accepted and still
 * reach nobody — an unregistered number fails long after the send returned
 * 200 — which is why this is a separate column from `status` rather than two
 * more values inside it.
 */
export const BROADCAST_DELIVERY_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const
export type BroadcastDeliveryStatus = (typeof BROADCAST_DELIVERY_STATUSES)[number]

export const broadcastRecipients = mysqlTable(
  'broadcast_recipients',
  {
    id: rowId().primaryKey(),
    broadcastId: varchar('broadcast_id', { length: 100 }).notNull(),
    /** E.164 digits, no `+` and no separators — the form Meta expects. */
    phone: varchar('phone', { length: 32 }).notNull(),
    /** Merge values, snapshotted so a lead edited mid-send cannot change them. */
    name: varchar('name', { length: 191 }),
    courseTitle: varchar('course_title', { length: 255 }),
    leadId: varchar('lead_id', { length: 100 }),
    status: varchar('status', { length: 16 })
      .$type<BroadcastRecipientStatus>()
      .notNull()
      .default('queued'),
    /** Bounded retry counter — see `MAX_ATTEMPTS` in `lib/whatsapp/runner.ts`. */
    attempts: smallint('attempts').notNull().default(0),
    /** Meta's `wamid`, and the key the status webhook comes back on. */
    messageId: varchar('message_id', { length: 191 }),
    deliveryStatus: varchar('delivery_status', { length: 16 }).$type<BroadcastDeliveryStatus>(),
    error: text('error'),
    sentAt: datetime('sent_at', { mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    /* One message per person per broadcast, enforced by the database rather
       than by the code that builds the list. Deduplication in application code
       is only as good as its last edit; this survives a second "rebuild
       audience" click, a pasted number that was already pulled from leads, and
       two admins composing at once. */
    uniqueIndex('broadcast_recipients_broadcast_phone_key').on(table.broadcastId, table.phone),
    index('broadcast_recipients_broadcast_status_idx').on(table.broadcastId, table.status),
    index('broadcast_recipients_message_id_idx').on(table.messageId),
  ],
)

/**
 * Numbers that must never be broadcast to again.
 *
 * WhatsApp's Business Messaging Policy requires an opt-out to be honoured, and
 * ignoring one is not a small thing: recipients block the number, the quality
 * rating falls, and Meta throttles or bans the sender. So it is checked when a
 * recipient list is built *and* again immediately before each send — the list
 * for a scheduled broadcast can be hours old, and someone who says STOP in
 * those hours has said it in time.
 */
export const whatsappOptOuts = mysqlTable(
  'whatsapp_opt_outs',
  {
    id: rowId().primaryKey(),
    phone: varchar('phone', { length: 32 }).notNull(),
    /** The message that triggered it, or the admin's note. */
    reason: varchar('reason', { length: 191 }),
    /** `inbound-stop` when the person asked; `admin` when we heard another way. */
    source: varchar('source', { length: 32 }).notNull().default('inbound-stop'),
    createdAt,
  },
  (table) => [uniqueIndex('whatsapp_opt_outs_phone_key').on(table.phone)],
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
export type DifferentiatorRow = typeof differentiators.$inferSelect
export type TrustBadgeRow = typeof trustBadges.$inferSelect
export type CourseCategoryRow = typeof courseCategories.$inferSelect
export type SiteSettingsRow = typeof siteSettings.$inferSelect
export type SocialLinkRow = typeof socialLinks.$inferSelect
export type NavLinkRow = typeof navLinks.$inferSelect
export type CampaignRow = typeof campaignSettings.$inferSelect
export type LeadRow = typeof leads.$inferSelect
export type ConversationRow = typeof conversations.$inferSelect
export type ConversationMessageRow = typeof conversationMessages.$inferSelect
export type SubscriberRow = typeof newsletterSubscribers.$inferSelect
export type AdminUserRow = typeof adminUsers.$inferSelect

/* Learning portal. */
export type PortalUserRow = typeof portalUsers.$inferSelect
export type NewPortalUserRow = typeof portalUsers.$inferInsert
export type BatchRow = typeof batches.$inferSelect
export type NewBatchRow = typeof batches.$inferInsert
export type EnrollmentRow = typeof enrollments.$inferSelect
export type ModuleProgressRow = typeof moduleProgress.$inferSelect
export type ClassSessionRow = typeof classSessions.$inferSelect
export type NewClassSessionRow = typeof classSessions.$inferInsert
export type AttendanceRow = typeof attendance.$inferSelect
export type MaterialRow = typeof materials.$inferSelect
export type NewMaterialRow = typeof materials.$inferInsert
export type AnnouncementRow = typeof announcements.$inferSelect
export type AssignmentRow = typeof assignments.$inferSelect
export type NewAssignmentRow = typeof assignments.$inferInsert
export type SubmissionRow = typeof submissions.$inferSelect
export type QuizRow = typeof quizzes.$inferSelect
export type NewQuizRow = typeof quizzes.$inferInsert
export type QuizAttemptRow = typeof quizAttempts.$inferSelect
export type CertificateRow = typeof certificates.$inferSelect
export type BroadcastRow = typeof broadcasts.$inferSelect
export type BroadcastRecipientRow = typeof broadcastRecipients.$inferSelect
export type WhatsAppOptOutRow = typeof whatsappOptOuts.$inferSelect
