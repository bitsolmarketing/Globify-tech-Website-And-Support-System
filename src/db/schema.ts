/**
 * Drizzle schema for the Globify admin — PostgreSQL (Supabase).
 *
 * The existing TypeScript types stay the source of truth: every nested shape
 * (`curriculum`, `careers`, `faqs`, `social`, …) is a `jsonb` column stamped
 * with `.$type<>()` from `@/lib/courses`, `@/lib/authors` and `@/lib/content`.
 * Change the type and the column stops compiling — the two cannot drift.
 *
 * These are type-only imports, so nothing from the seed data files is bundled
 * into drizzle-kit or the server runtime.
 *
 * Column lengths are carried over from the MySQL schema this replaced. Postgres
 * does not need them — it has no index-size limit to design around, and `text`
 * costs the same as a bounded `varchar` — but they double as the last line of
 * validation before a value is stored, so they are kept deliberately rather
 * than widened away.
 */
import type { Author } from '@/lib/authors'
import type { GalleryItem, Testimonial } from '@/lib/content'
import type { Course, CourseCategory } from '@/lib/courses'
import type { Plan } from '@/lib/plans'
import type { PostFrontmatter } from '@/lib/blog'

import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

/* ---------------------------------------------------------------------------
 * Schema
 * ------------------------------------------------------------------------ */

/**
 * Every table below lives in `globify_site`, not `public`.
 *
 * The Supabase project is shared with the AI assistant, whose Prisma schema
 * owns `public` — 33 tables including its own `courses`, which means the same
 * name refers to two unrelated things in one database. Namespacing this app's
 * tables removes the collision outright, and it also makes the boundary
 * enforceable rather than conventional: `schemaFilter` in `drizzle.config.ts`
 * scopes drizzle-kit to this schema, so a migration generated here cannot
 * propose dropping a table it does not own, however confidently it thinks the
 * schema has drifted.
 *
 * Drizzle qualifies every generated statement with the schema name, so nothing
 * depends on the connection's `search_path`.
 */
export const globifySite = pgSchema('globify_site')

/* ---------------------------------------------------------------------------
 * Shared column helpers
 * ------------------------------------------------------------------------ */

/** Row ids are uuids or deterministic `prefix-slug` strings — 100 is ample. */
const rowId = () => varchar('id', { length: 100 })

/**
 * `timestamptz`, not `timestamp`.
 *
 * The MySQL schema stored DATETIME and relied on the driver being told
 * `timezone: 'Z'` to read it back as UTC — an application-level convention that
 * nothing in the database enforced, so any client that connected without it
 * silently read every timestamp in local time. Postgres has a type for this:
 * `timestamptz` stores an absolute instant, and correctness no longer depends
 * on how the client was configured.
 */
const createdAt = timestamp('created_at', { withTimezone: true, mode: 'date' })
  .notNull()
  .defaultNow()

/**
 * Postgres has no `ON UPDATE CURRENT_TIMESTAMP`. The MySQL tables carried it so
 * that writes made outside the ORM — a psql session, a Supabase table editor
 * edit — still bumped the column, and `$onUpdateFn` only covers writes Drizzle
 * itself issues.
 *
 * `drizzle/pg/0001_updated_at_triggers.sql` restores the database-side half
 * with a trigger per table, so both paths keep working.
 */
const updatedAt = timestamp('updated_at', { withTimezone: true, mode: 'date' })
  .notNull()
  .defaultNow()
  .$onUpdateFn(() => new Date())

/** Preserves the hand-tuned ordering of the original hardcoded arrays. */
const sortOrder = integer('sort_order').notNull().default(0)

/* ---------------------------------------------------------------------------
 * Auth — a single admin user, seeded from env vars
 * ------------------------------------------------------------------------ */

export const adminUsers = globifySite.table(
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
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('admin_users_email_key').on(table.email)],
)

/* ---------------------------------------------------------------------------
 * Courses
 * ------------------------------------------------------------------------ */

export const courses = globifySite.table(
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
    overview: jsonb('overview').$type<string[]>().notNull(),
    image: varchar('image', { length: 500 }).notNull(),
    icon: varchar('icon', { length: 64 }).notNull(),
    duration: varchar('duration', { length: 64 }).notNull(),
    durationWeeks: integer('duration_weeks').notNull(),
    hoursPerWeek: integer('hours_per_week').notNull(),
    level: varchar('level', { length: 64 }).$type<Course['level']>().notNull(),
    originalFee: integer('original_fee').notNull(),
    mode: jsonb('mode').$type<string[]>().notNull(),
    language: varchar('language', { length: 64 }).notNull(),
    skills: jsonb('skills').$type<string[]>().notNull(),
    tools: jsonb('tools').$type<string[]>().notNull(),
    outcomes: jsonb('outcomes').$type<string[]>().notNull(),
    curriculum: jsonb('curriculum').$type<Course['curriculum']>().notNull(),
    careers: jsonb('careers').$type<Course['careers']>().notNull(),
    projects: jsonb('projects').$type<string[]>().notNull(),
    instructorSlug: varchar('instructor_slug', { length: 191 }).notNull(),
    rating: doublePrecision('rating').notNull().default(0),
    reviews: integer('reviews').notNull().default(0),
    enrolled: integer('enrolled').notNull().default(0),
    featured: boolean('featured').notNull().default(false),
    badge: varchar('badge', { length: 64 }).$type<NonNullable<Course['badge']>>(),
    faqs: jsonb('faqs').$type<Course['faqs']>().notNull(),
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

export const authors = globifySite.table(
  'authors',
  {
    id: rowId().primaryKey(),
    slug: varchar('slug', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    role: varchar('role', { length: 191 }).notNull(),
    credentials: varchar('credentials', { length: 500 }).notNull(),
    bio: text('bio').notNull(),
    longBio: jsonb('long_bio').$type<string[]>().notNull(),
    avatar: varchar('avatar', { length: 500 }).notNull(),
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

export const posts = globifySite.table(
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
    tags: jsonb('tags').$type<string[]>().notNull(),
    image: varchar('image', { length: 500 }).notNull(),
    imageAlt: varchar('image_alt', { length: 500 }).notNull(),
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
    index('posts_author_idx').on(table.author),
    index('posts_category_idx').on(table.category),
    index('posts_published_idx').on(table.published),
  ],
)

/* ---------------------------------------------------------------------------
 * Testimonials
 * ------------------------------------------------------------------------ */

export const testimonials = globifySite.table(
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

export const faqs = globifySite.table(
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

export const galleryItems = globifySite.table(
  'gallery_items',
  {
    id: rowId().primaryKey(),
    src: varchar('src', { length: 500 }).notNull(),
    alt: varchar('alt', { length: 500 }).notNull(),
    caption: varchar('caption', { length: 500 }).notNull(),
    category: varchar('category', { length: 64 }).$type<GalleryItem['category']>().notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
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

export const stats = globifySite.table('stats', {
  id: rowId().primaryKey(),
  value: doublePrecision('value').notNull(),
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

export const benefits = globifySite.table('benefits', {
  id: rowId().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 64 }).notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

export const milestones = globifySite.table('milestones', {
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

export const differentiators = globifySite.table('differentiators', {
  id: rowId().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  /** The short number that backs the claim, e.g. "92% completion". */
  proof: varchar('proof', { length: 191 }).notNull(),
  sortOrder,
  createdAt,
  updatedAt,
})

export const trustBadges = globifySite.table('trust_badges', {
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

export const courseCategories = globifySite.table(
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

export const siteSettings = globifySite.table('site_settings', {
  id: rowId().primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  shortName: varchar('short_name', { length: 191 }).notNull(),
  legalName: varchar('legal_name', { length: 191 }).notNull(),
  tagline: varchar('tagline', { length: 255 }).notNull(),
  description: text('description').notNull(),
  founded: varchar('founded', { length: 16 }).notNull(),
  logo: varchar('logo', { length: 500 }).notNull(),
  keywords: jsonb('keywords').$type<string[]>().notNull(),
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
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  mapEmbedUrl: varchar('map_embed_url', { length: 1000 }).notNull(),
  /** Google Business Profile — every "find us" link points here. */
  officeUrl: varchar('office_url', { length: 1000 }).notNull(),
  openingHours: jsonb('opening_hours').$type<OpeningHour[]>().notNull(),
  openingHoursSpec: jsonb('opening_hours_spec').$type<OpeningHoursSpec>().notNull(),
  updatedAt,
})

export const socialLinks = globifySite.table('social_links', {
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

export const navLinks = globifySite.table(
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

export const campaignSettings = globifySite.table('campaign_settings', {
  id: rowId().primaryKey(),
  name: varchar('name', { length: 191 }).notNull(),
  emoji: varchar('emoji', { length: 32 }).notNull(),
  discountPercent: integer('discount_percent').notNull(),
  headline: varchar('headline', { length: 500 }).notNull(),
  subheadline: text('subheadline').notNull(),
  couponCode: varchar('coupon_code', { length: 64 }).notNull(),
  timezoneOffset: varchar('timezone_offset', { length: 16 }).notNull(),
  seatsTotal: integer('seats_total').notNull(),
  seatsRemaining: integer('seats_remaining').notNull(),
  /**
   * Explicit deadline. When null the site falls back to the rolling
   * "14 August 23:59:59 PKT of the current campaign year" rule.
   */
  deadline: timestamp('deadline', { withTimezone: true, mode: 'date' }),
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
export const leads = globifySite.table(
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

export const newsletterSubscribers = globifySite.table(
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

export const conversations = globifySite.table(
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
    capture: jsonb('capture').$type<Record<string, unknown> | null>(),
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

export const conversationMessages = globifySite.table(
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
 * Learning platform — students, plans, enrollments, subscriptions, payments
 *
 * Everything above this line serves the marketing site: content the institute
 * publishes and enquiries it receives. Everything below is the other half —
 * people who have an account, what they bought, and whether it is paid for.
 *
 * The two are deliberately not merged. A `lead` is an enquiry the admissions
 * team chases and may never hear from again; a `student` is an authenticated
 * person with access to something. The same human is usually both, joined by
 * email where that helps, but collapsing them would mean either giving every
 * WhatsApp enquiry a login or losing the enquiries that never became one.
 *
 * Course *content* is still the marketing `courses` row. This phase sells
 * access and records it; the lesson and progress tables a player needs are
 * not here yet, so nothing pretends to track something it cannot measure.
 * ------------------------------------------------------------------------ */

export const STUDENT_STATUSES = ['active', 'suspended'] as const
export type StudentStatus = (typeof STUDENT_STATUSES)[number]

/**
 * A person with a login. A separate table from `admin_users` rather than a
 * `role` column on one: the two are authenticated by different providers, have
 * no overlapping columns worth sharing, and keeping them apart means a bug in
 * student signup can never mint an administrator.
 */
export const students = globifySite.table(
  'students',
  {
    id: rowId().primaryKey(),
    /** Stored lower-cased — see the note on `adminUsers.email`. */
    email: varchar('email', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    phone: varchar('phone', { length: 64 }),
    /** bcrypt hash — never the plaintext. */
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    city: varchar('city', { length: 120 }),
    status: varchar('status', { length: 32 }).$type<StudentStatus>().notNull().default('active'),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('students_email_key').on(table.email),
    index('students_created_at_idx').on(table.createdAt),
    index('students_status_idx').on(table.status),
  ],
)

/* ------------------------------------------------------------------- Plans */

/**
 * An all-access subscription — the Coursera Plus shape: one recurring fee that
 * unlocks the whole catalogue, sold alongside (not instead of) the per-course
 * fee already carried on `courses.originalFee`.
 *
 * Prices live here rather than in code because they are a commercial decision
 * the institute changes without a deploy. The seed ships placeholders that an
 * admin is expected to overwrite at /admin/plans before the page goes live.
 */
export const plans = globifySite.table(
  'plans',
  {
    id: rowId().primaryKey(),
    slug: varchar('slug', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    tagline: varchar('tagline', { length: 255 }).notNull(),
    description: text('description').notNull(),
    /** Rupees, charged once per `interval`. */
    price: integer('price').notNull(),
    /** Optional strike-through anchor, e.g. 12x the monthly price. */
    compareAtPrice: integer('compare_at_price'),
    interval: varchar('interval', { length: 16 }).$type<Plan['interval']>().notNull(),
    features: jsonb('features').$type<string[]>().notNull().default([]),
    badge: varchar('badge', { length: 64 }),
    /** Draws the highlighted card on /pricing. At most one should be true. */
    featured: boolean('featured').notNull().default(false),
    /** Hides a plan from the public page without losing subscriptions on it. */
    active: boolean('active').notNull().default(true),
    sortOrder,
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('plans_slug_key').on(table.slug),
    index('plans_active_idx').on(table.active, table.sortOrder),
  ],
)

/* ------------------------------------------------------------- Enrollments */

/**
 * `pending` is the state everything starts in and the one that matters: the
 * student has asked for a seat and the fee has not been confirmed yet. Access
 * is granted only by `active`, and only an admin can set it.
 */
export const ENROLLMENT_STATUSES = [
  'pending',
  'active',
  'rejected',
  'cancelled',
  'completed',
] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

/** How the seat was paid for — a one-off fee, or an all-access subscription. */
export const ENROLLMENT_SOURCES = ['course', 'plan'] as const
export type EnrollmentSource = (typeof ENROLLMENT_SOURCES)[number]

export const enrollments = globifySite.table(
  'enrollments',
  {
    id: rowId().primaryKey(),
    studentId: varchar('student_id', { length: 100 }).notNull(),
    /**
     * The slug, plus the title as it read on the day — the same snapshotting
     * `leads` does, and for the same reason: a course can be renamed or
     * retired, and an enrollment record must still say what was bought.
     */
    courseSlug: varchar('course_slug', { length: 191 }).notNull(),
    courseTitle: varchar('course_title', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 })
      .$type<EnrollmentStatus>()
      .notNull()
      .default('pending'),
    source: varchar('source', { length: 16 }).$type<EnrollmentSource>().notNull().default('course'),
    /** Rupees actually agreed, after whatever discount applied at the time. */
    amount: integer('amount').notNull().default(0),
    /** Set when an admin approves the payment; null while pending. */
    activatedAt: timestamp('activated_at', { withTimezone: true, mode: 'date' }),
    completedAt: timestamp('completed_at', { withTimezone: true, mode: 'date' }),
    /** Admin-only notes, never shown to the student. */
    notes: text('notes'),
    createdAt,
    updatedAt,
  },
  (table) => [
    /* One seat per student per course. Someone who was rejected and applies
       again updates this row rather than accumulating duplicates. */
    uniqueIndex('enrollments_student_course_key').on(table.studentId, table.courseSlug),
    index('enrollments_student_idx').on(table.studentId),
    index('enrollments_status_idx').on(table.status),
    index('enrollments_course_idx').on(table.courseSlug),
    index('enrollments_created_at_idx').on(table.createdAt),
  ],
)

/* ----------------------------------------------------------- Subscriptions */

export const SUBSCRIPTION_STATUSES = ['pending', 'active', 'expired', 'cancelled'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

/**
 * One row per purchase of an all-access plan, not one per student. A renewal
 * is a new row, so the billing history is the table itself and `expiresAt`
 * never has to be rewritten in place.
 */
export const subscriptions = globifySite.table(
  'subscriptions',
  {
    id: rowId().primaryKey(),
    studentId: varchar('student_id', { length: 100 }).notNull(),
    planId: varchar('plan_id', { length: 100 }).notNull(),
    /** Snapshotted for the same reason as `enrollments.courseTitle`. */
    planSlug: varchar('plan_slug', { length: 191 }).notNull(),
    planName: varchar('plan_name', { length: 191 }).notNull(),
    interval: varchar('interval', { length: 16 }).$type<Plan['interval']>().notNull(),
    amount: integer('amount').notNull().default(0),
    status: varchar('status', { length: 32 })
      .$type<SubscriptionStatus>()
      .notNull()
      .default('pending'),
    /** Both set on approval — a pending subscription has no term yet. */
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true, mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('subscriptions_student_idx').on(table.studentId, table.status),
    index('subscriptions_expires_at_idx').on(table.expiresAt),
    index('subscriptions_created_at_idx').on(table.createdAt),
  ],
)

/* ---------------------------------------------------------------- Payments */

/**
 * No card gateway. Stripe does not onboard Pakistani merchants, and the
 * institute already collects fees by bank transfer and mobile wallet — so a
 * payment here is a *claim*: the student says they sent money and uploads the
 * receipt, and an admin turns that into access. `status` is the whole point of
 * the table, and nothing but an approval grants anything.
 */
export const PAYMENT_METHODS = ['bank_transfer', 'jazzcash', 'easypaisa', 'cash'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ['submitted', 'approved', 'rejected'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_PURPOSES = ['course', 'plan'] as const
export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number]

export const payments = globifySite.table(
  'payments',
  {
    id: rowId().primaryKey(),
    /** Short, human-quotable reference, e.g. `GT-PAY-7QK2M4`. */
    reference: varchar('reference', { length: 64 }).notNull(),
    studentId: varchar('student_id', { length: 100 }).notNull(),
    purpose: varchar('purpose', { length: 16 }).$type<PaymentPurpose>().notNull(),
    /** Exactly one of these is set, matching `purpose`. */
    enrollmentId: varchar('enrollment_id', { length: 100 }),
    subscriptionId: varchar('subscription_id', { length: 100 }),
    amount: integer('amount').notNull(),
    method: varchar('method', { length: 32 }).$type<PaymentMethod>().notNull(),
    /** The student's own transaction id from their bank or wallet app. */
    senderReference: varchar('sender_reference', { length: 191 }),
    senderName: varchar('sender_name', { length: 191 }),
    /** Uploaded receipt under /images/uploads/payments — see image-upload.ts. */
    proofPath: varchar('proof_path', { length: 500 }),
    status: varchar('status', { length: 32 }).$type<PaymentStatus>().notNull().default('submitted'),
    /** Anything the student wants the admissions team to know. */
    note: text('note'),
    /** The admin's reason, shown to the student when a claim is rejected. */
    reviewNote: text('review_note'),
    reviewedBy: varchar('reviewed_by', { length: 191 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('payments_reference_key').on(table.reference),
    index('payments_student_idx').on(table.studentId),
    index('payments_status_idx').on(table.status, table.createdAt),
    index('payments_enrollment_idx').on(table.enrollmentId),
    index('payments_subscription_idx').on(table.subscriptionId),
  ],
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
export type StudentRow = typeof students.$inferSelect
export type PlanRow = typeof plans.$inferSelect
export type EnrollmentRow = typeof enrollments.$inferSelect
export type SubscriptionRow = typeof subscriptions.$inferSelect
export type PaymentRow = typeof payments.$inferSelect