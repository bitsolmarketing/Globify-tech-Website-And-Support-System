/**
 * One-off import of the hardcoded site content into Postgres (Supabase).
 *
 * Run with `npm run db:seed`. It is idempotent — every insert has an
 * `onConflictDoUpdate` keyed on a natural, deterministic identifier, so
 * re-running it refreshes rows rather than duplicating them. Nothing is
 * deleted, so admin-authored records added later survive a re-seed.
 *
 * Note the conflict targets. MySQL's `ON DUPLICATE KEY UPDATE` fired on
 * whichever unique index a row happened to violate, so it never had to be told
 * which one; Postgres requires the target to be named. For `courses`, `authors`,
 * `posts` and `admin_users` that target is the slug or email and NOT the id —
 * those rows are inserted with a fresh uuid on every run, so a conflict on `id`
 * could never fire and the second seed would abort on the slug index instead of
 * updating the row.
 *
 * Sources:
 *   src/lib/courses.ts   -> courses, course_categories
 *   src/lib/authors.ts   -> authors
 *   src/lib/content.ts   -> testimonials, stats, benefits, faqs, gallery,
 *                           milestones, differentiators, trust_badges
 *   src/lib/site.ts      -> campaign_settings, site_settings, social_links,
 *                           nav_links
 *   content/blog/*.mdx   -> posts
 *   env ADMIN_*          -> admin_users
 *
 * That is all 19 tables. It used to be 13: the last six were rendered into a
 * .sql file by `scripts/generate-mysql-seed.ts` because the MySQL host had no
 * Node runtime to run this script with. Supabase removes that constraint, so
 * the generator is gone and there is one seeding path again.
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
  courseCategories as courseCategoriesTable,
  courses as coursesTable,
  differentiators as differentiatorsTable,
  faqs as faqsTable,
  galleryItems as galleryTable,
  milestones as milestonesTable,
  navLinks as navLinksTable,
  posts as postsTable,
  siteSettings as siteSettingsTable,
  socialLinks as socialLinksTable,
  stats as statsTable,
  testimonials as testimonialsTable,
  trustBadges as trustBadgesTable,
  type NavLinkRow,
  type StatSource,
} from './schema'

import { authors } from '@/lib/authors'
import type { PostFrontmatter } from '@/lib/blog'
import {
  benefits,
  differentiators,
  faqs,
  galleryItems,
  homepageFaqs,
  milestones,
  stats,
  testimonials,
  trustBadges,
} from '@/lib/content'
import { courseCategories, courses } from '@/lib/courses'
import {
  campaign,
  contactInfo,
  footerNav,
  mainNav,
  siteConfig,
  socialLinks,
} from '@/lib/site'
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

/* ------------------------------ sections that were only ever in site.ts --- */

/*
 * These six tables had no seed path in this script at all. Under MySQL they
 * were populated by `scripts/generate-mysql-seed.ts`, which rendered them into
 * a .sql file for the server's `mysql` client to run — a workaround for the
 * Hostinger box having no Node runtime, and for its database being reachable
 * only from localhost.
 *
 * Supabase is reachable from anywhere with the connection string, so that
 * detour has no reason to exist and the generator has been removed. Folding
 * them in here means `npm run db:seed` now populates all 19 tables rather than
 * 13, and the six sections the admin could not previously manage — navigation,
 * site settings, social links, categories, differentiators, trust badges —
 * arrive as editable rows instead of staying stuck on the checked-in fallback.
 */

async function seedDifferentiators(db: ReturnType<typeof getDb>) {
  for (const [index, item] of differentiators.entries()) {
    const values = { title: item.title, body: item.body, proof: item.proof, sortOrder: index }

    await db
      .insert(differentiatorsTable)
      .values({ id: id('diff', item.title), ...values })
      .onConflictDoUpdate({
        target: differentiatorsTable.id,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('differentiators', differentiators.length)
}

async function seedTrustBadges(db: ReturnType<typeof getDb>) {
  for (const [index, badge] of trustBadges.entries()) {
    const values = { label: badge.label, icon: badge.icon, sortOrder: index }

    await db
      .insert(trustBadgesTable)
      .values({ id: id('badge', badge.label), ...values })
      .onConflictDoUpdate({
        target: trustBadgesTable.id,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('trust badges', trustBadges.length)
}

async function seedCourseCategories(db: ReturnType<typeof getDb>) {
  const blurbs: Record<string, string> = {
    'AI & Development': 'Build software and AI systems — web, apps and automation.',
    'Marketing & Business': 'Grow brands and revenue with paid, organic and e-commerce skills.',
    'Design & Media': 'Visual craft — branding, graphics, video and short-form content.',
  }

  for (const [index, name] of courseCategories.entries()) {
    const values = {
      slug: slugify(name),
      name,
      description: blurbs[name] ?? '',
      sortOrder: index,
    }

    await db
      .insert(courseCategoriesTable)
      .values({ id: id('cat', name), ...values })
      .onConflictDoUpdate({
        target: courseCategoriesTable.id,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('course categories', courseCategories.length)
}

async function seedSiteSettings(db: ReturnType<typeof getDb>) {
  const values = {
    name: siteConfig.name,
    shortName: siteConfig.shortName,
    legalName: siteConfig.legalName,
    tagline: siteConfig.tagline,
    description: siteConfig.description,
    founded: siteConfig.founded,
    logo: siteConfig.logo,
    keywords: [...siteConfig.keywords],
    phone: contactInfo.phone,
    phoneHref: contactInfo.phoneHref,
    whatsapp: contactInfo.whatsapp,
    whatsappDisplay: contactInfo.whatsappDisplay,
    coursesPhone: contactInfo.coursesPhone,
    coursesPhoneHref: contactInfo.coursesPhoneHref,
    email: contactInfo.email,
    admissionsEmail: contactInfo.admissionsEmail,
    addressStreet: contactInfo.address.street,
    addressLocality: contactInfo.address.locality,
    addressRegion: contactInfo.address.region,
    addressPostalCode: contactInfo.address.postalCode,
    addressCountry: contactInfo.address.country,
    addressCountryName: contactInfo.address.countryName,
    latitude: contactInfo.geo.latitude,
    longitude: contactInfo.geo.longitude,
    mapEmbedUrl: contactInfo.mapEmbedUrl,
    officeUrl: contactInfo.officeUrl,
    openingHours: contactInfo.openingHours.map((hour) => ({ days: hour.days, time: hour.time })),
    openingHoursSpec: {
      days: [...contactInfo.openingHoursSpec.days],
      opens: contactInfo.openingHoursSpec.opens,
      closes: contactInfo.openingHoursSpec.closes,
    },
  }

  await db
    .insert(siteSettingsTable)
    .values({ id: 'default', ...values })
    .onConflictDoUpdate({
      target: siteSettingsTable.id,
      set: { updatedAt: new Date(), ...values },
    })

  step('site settings', 1)
}

async function seedSocialLinks(db: ReturnType<typeof getDb>) {
  for (const [index, link] of socialLinks.entries()) {
    const values = { name: link.name, href: link.href, icon: link.icon, active: true, sortOrder: index }

    await db
      .insert(socialLinksTable)
      .values({ id: id('social', link.name), ...values })
      .onConflictDoUpdate({
        target: socialLinksTable.id,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('social links', socialLinks.length)
}

/**
 * Header, mega-menu and the four footer columns in one table.
 * Mega-menu headings are parent rows; their links point back via `parentId`.
 */
async function seedNavLinks(db: ReturnType<typeof getDb>) {
  type NavValues = Omit<NavLinkRow, 'createdAt' | 'updatedAt'>
  const rows: NavValues[] = []
  let order = 0

  for (const item of mainNav) {
    const headerId = id('nav-header', item.label)
    rows.push({
      id: headerId,
      location: 'header',
      parentId: null,
      label: item.label,
      href: item.href,
      description: item.description ?? null,
      ctaLabel: null,
      sortOrder: order++,
    })

    if (!item.megaMenu) continue

    let columnOrder = 0
    for (const column of item.megaMenu.columns) {
      const columnId = id('nav-mm', column.heading)
      rows.push({
        id: columnId,
        location: 'megamenu',
        parentId: headerId,
        label: column.heading,
        href: item.href,
        description: null,
        ctaLabel: null,
        sortOrder: columnOrder++,
      })

      let linkOrder = 0
      for (const link of column.links) {
        rows.push({
          id: id('nav-mm', `${column.heading}-${link.label}`),
          location: 'megamenu',
          parentId: columnId,
          label: link.label,
          href: link.href,
          description: link.description ?? null,
          ctaLabel: null,
          sortOrder: linkOrder++,
        })
      }
    }

    const feature = item.megaMenu.feature
    if (feature) {
      rows.push({
        id: id('nav-mm-feature', feature.title),
        location: 'megamenu-feature',
        parentId: headerId,
        label: feature.title,
        href: feature.href,
        description: feature.body,
        ctaLabel: feature.cta,
        sortOrder: 0,
      })
    }
  }

  for (const [group, links] of Object.entries(footerNav)) {
    let footerOrder = 0
    for (const link of links) {
      rows.push({
        id: id(`nav-footer-${group}`, link.label),
        location: `footer-${group}` as NavValues['location'],
        parentId: null,
        label: link.label,
        href: link.href,
        description: null,
        ctaLabel: null,
        sortOrder: footerOrder++,
      })
    }
  }

  for (const row of rows) {
    /* `_id` is discarded deliberately: the id is the conflict target, so
       re-setting it on update would be a no-op at best and a rename at worst. */
    const { id: _id, ...values } = row

    await db
      .insert(navLinksTable)
      .values(row)
      .onConflictDoUpdate({
        target: navLinksTable.id,
        set: { updatedAt: new Date(), ...values },
      })
  }
  step('nav links', rows.length)
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
  await seedDifferentiators(db)
  await seedTrustBadges(db)
  await seedCourseCategories(db)
  await seedSiteSettings(db)
  await seedSocialLinks(db)
  await seedNavLinks(db)
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
