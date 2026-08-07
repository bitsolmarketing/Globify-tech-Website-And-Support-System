/**
 * One-off import of the hardcoded site content into Postgres.
 *
 * Run with `npm run db:seed`. It is idempotent — every insert has an
 * `onConflictDoUpdate` keyed on a natural, deterministic identifier, so
 * re-running it refreshes rows rather than duplicating them. Nothing is
 * deleted, so admin-authored records added later survive a re-seed.
 *
 * Sources:
 *   src/lib/courses.ts   -> courses
 *   src/lib/authors.ts   -> authors
 *   src/lib/content.ts   -> testimonials, stats, benefits, faqs, gallery, milestones
 *   src/lib/site.ts      -> campaign_settings
 *   content/blog/*.mdx   -> posts
 *   env ADMIN_*          -> admin_users
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import bcrypt from 'bcryptjs'
import { config as loadEnv } from 'dotenv'
import matter from 'gray-matter'

import { closeDb, getDb, isDatabaseConfigured } from './index'
import {
  adminUsers,
  authors as authorsTable,
  benefits as benefitsTable,
  campaignSettings,
  courses as coursesTable,
  faqs as faqsTable,
  galleryItems as galleryTable,
  milestones as milestonesTable,
  posts as postsTable,
  stats as statsTable,
  testimonials as testimonialsTable,
  type StatSource,
} from './schema'

import { authors } from '@/lib/authors'
import type { PostFrontmatter } from '@/lib/blog'
import {
  benefits,
  faqs,
  galleryItems,
  homepageFaqs,
  milestones,
  stats,
  testimonials,
} from '@/lib/content'
import { courses } from '@/lib/courses'
import { campaign } from '@/lib/site'
import { slugify } from '@/lib/utils'

/* Imports are hoisted, so this has to run before anything reads `process.env`.
   Every consumer below reads it lazily, which makes the ordering safe. */
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

const BCRYPT_ROUNDS = 12
const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

function id(prefix: string, value: string): string {
  return `${prefix}-${slugify(value).slice(0, 60)}`
}

function step(label: string, count: number) {
  console.info(`  ✓ ${label.padEnd(24)} ${count}`)
}

/* ------------------------------------------------------------------ courses */

async function seedCourses(db: ReturnType<typeof getDb>) {
  for (const [index, course] of courses.entries()) {
    const { slug, badge, ...rest } = course

    await db
      .insert(coursesTable)
      .values({ id: randomUUID(), slug, badge: badge ?? null, sortOrder: index, ...rest })
      .onConflictDoUpdate({
        target: coursesTable.slug,
        set: { badge: badge ?? null, sortOrder: index, updatedAt: new Date(), ...rest },
      })
  }
  step('courses', courses.length)
}

/* ------------------------------------------------------------------ authors */

async function seedAuthors(db: ReturnType<typeof getDb>) {
  for (const [index, author] of authors.entries()) {
    const { slug, ...rest } = author

    await db
      .insert(authorsTable)
      .values({ id: randomUUID(), slug, sortOrder: index, ...rest })
      .onConflictDoUpdate({
        target: authorsTable.slug,
        set: { sortOrder: index, updatedAt: new Date(), ...rest },
      })
  }
  step('authors', authors.length)
}

/* -------------------------------------------------------------------- posts */

function readPostFiles() {
  if (!fs.existsSync(CONTENT_DIR)) return []

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')
      const { data, content } = matter(raw)
      return {
        slug: file.replace(/\.mdx?$/, ''),
        frontmatter: data as PostFrontmatter,
        body: content.trim(),
      }
    })
}

async function seedPosts(db: ReturnType<typeof getDb>) {
  const files = readPostFiles()

  for (const { slug, frontmatter, body } of files) {
    const values = {
      title: frontmatter.title,
      description: frontmatter.description,
      date: frontmatter.date,
      updated: frontmatter.updated ?? null,
      author: frontmatter.author,
      category: frontmatter.category,
      tags: frontmatter.tags ?? [],
      image: frontmatter.image,
      imageAlt: frontmatter.imageAlt,
      featured: frontmatter.featured ?? false,
      faqs: frontmatter.faqs ?? [],
      body,
      published: true,
    }

    await db
      .insert(postsTable)
      .values({ id: randomUUID(), slug, ...values })
      .onConflictDoUpdate({
        target: postsTable.slug,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('blog posts', files.length)
}

/* ------------------------------------------------------------- testimonials */

async function seedTestimonials(db: ReturnType<typeof getDb>) {
  for (const [index, testimonial] of testimonials.entries()) {
    const { id: rowId, story, ...rest } = testimonial
    const values = { story: story ?? null, sortOrder: index, ...rest }

    await db
      .insert(testimonialsTable)
      .values({ id: rowId, ...values })
      .onConflictDoUpdate({
        target: testimonialsTable.id,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('testimonials', testimonials.length)
}

/* --------------------------------------------------------------------- faqs */

async function seedFaqs(db: ReturnType<typeof getDb>) {
  const homepageQuestions = new Set(homepageFaqs.map((faq) => faq.question))

  for (const [index, faq] of faqs.entries()) {
    const values = {
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      showOnHomepage: homepageQuestions.has(faq.question),
      sortOrder: index,
    }

    await db
      .insert(faqsTable)
      .values({ id: id('faq', faq.question), ...values })
      .onConflictDoUpdate({ target: faqsTable.id, set: { updatedAt: new Date(), ...values } })
  }
  step('faqs', faqs.length)
}

/* ------------------------------------------------------------------ gallery */

async function seedGallery(db: ReturnType<typeof getDb>) {
  for (const [index, item] of galleryItems.entries()) {
    const values = { ...item, sortOrder: index }
    const rowId = id('gallery', path.basename(item.src).replace(/\.\w+$/, ''))

    await db
      .insert(galleryTable)
      .values({ id: rowId, ...values })
      .onConflictDoUpdate({ target: galleryTable.id, set: { updatedAt: new Date(), ...values } })
  }
  step('gallery items', galleryItems.length)
}

/* ---------------------------------------------------------- stats/benefits/… */

/** Two stats are computed from the catalogue rather than hand-typed. */
function statSource(label: string): StatSource | null {
  if (label === 'Professional Courses') return 'courseCount'
  if (label === 'Average Rating') return 'averageRating'
  return null
}

async function seedStats(db: ReturnType<typeof getDb>) {
  for (const [index, stat] of stats.entries()) {
    const values = { ...stat, derivedFrom: statSource(stat.label), sortOrder: index }

    await db
      .insert(statsTable)
      .values({ id: id('stat', stat.label), ...values })
      .onConflictDoUpdate({ target: statsTable.id, set: { updatedAt: new Date(), ...values } })
  }
  step('stats', stats.length)
}

async function seedBenefits(db: ReturnType<typeof getDb>) {
  for (const [index, benefit] of benefits.entries()) {
    const values = { ...benefit, sortOrder: index }

    await db
      .insert(benefitsTable)
      .values({ id: id('benefit', benefit.title), ...values })
      .onConflictDoUpdate({ target: benefitsTable.id, set: { updatedAt: new Date(), ...values } })
  }
  step('benefits', benefits.length)
}

async function seedMilestones(db: ReturnType<typeof getDb>) {
  for (const [index, milestone] of milestones.entries()) {
    const values = { ...milestone, sortOrder: index }

    await db
      .insert(milestonesTable)
      .values({ id: id('milestone', milestone.year), ...values })
      .onConflictDoUpdate({
        target: milestonesTable.id,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('milestones', milestones.length)
}

/* ----------------------------------------------------------------- campaign */

async function seedCampaign(db: ReturnType<typeof getDb>) {
  const values = {
    name: campaign.name,
    emoji: campaign.emoji,
    discountPercent: campaign.discountPercent,
    headline: campaign.headline,
    subheadline: campaign.subheadline,
    couponCode: campaign.couponCode,
    timezoneOffset: campaign.timezoneOffset,
    seatsTotal: campaign.seatsTotal,
    seatsRemaining: campaign.seatsRemaining,
    // Left null so the public site keeps using the rolling 14-August rule
    // until an admin pins an explicit deadline.
    deadline: null,
  }

  await db
    .insert(campaignSettings)
    .values({ id: 'default', ...values })
    .onConflictDoUpdate({ target: campaignSettings.id, set: { updatedAt: new Date(), ...values } })

  step('campaign settings', 1)
}

/* -------------------------------------------------------------- admin user */

async function seedAdminUser(db: ReturnType<typeof getDb>) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator'

  if (!email || !password) {
    console.warn(
      '  ! admin user               skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to create one)',
    )
    return
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  await db
    .insert(adminUsers)
    .values({ id: randomUUID(), email, name, passwordHash })
    .onConflictDoUpdate({
      target: adminUsers.email,
      set: { name, passwordHash, updatedAt: new Date() },
    })

  step('admin user', 1)
}

/* --------------------------------------------------------------------- run */

async function main() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not set. Add it to .env.local before seeding.')
  }

  const db = getDb()
  console.info('\nSeeding Globify content into Postgres…\n')

  await seedCourses(db)
  await seedAuthors(db)
  await seedPosts(db)
  await seedTestimonials(db)
  await seedFaqs(db)
  await seedGallery(db)
  await seedStats(db)
  await seedBenefits(db)
  await seedMilestones(db)
  await seedCampaign(db)
  await seedAdminUser(db)

  console.info('\nDone. Nothing was deleted — re-run any time to refresh.\n')
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('\nSeed failed:\n', error)
    await closeDb().catch(() => undefined)
    process.exit(1)
  })
