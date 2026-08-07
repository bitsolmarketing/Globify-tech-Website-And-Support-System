/**
 * Emits a complete MySQL/MariaDB seed file from the TypeScript content sources.
 *
 * The Hostinger box has no Node runtime, so `npm run db:seed` cannot run there.
 * This script renders the same content the Postgres seed inserts — plus the
 * sections that were still hardcoded in `src/lib/site.ts` — into plain SQL that
 * the server's `mysql` client can execute directly.
 *
 * Run with:  npx tsx scripts/generate-mysql-seed.ts
 * Output:    drizzle/mysql/0001_seed.sql
 *
 * Every statement is an upsert keyed on the row id (or the natural unique
 * column), so re-running the file refreshes content instead of duplicating it.
 */
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import bcrypt from 'bcryptjs'
import { config as loadEnv } from 'dotenv'
import matter from 'gray-matter'

import { authors } from '../src/lib/authors'
import type { PostFrontmatter } from '../src/lib/blog'
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
} from '../src/lib/content'
import { courseCategories, courses } from '../src/lib/courses'
import { campaign, contactInfo, footerNav, mainNav, siteConfig, socialLinks } from '../src/lib/site'
import { slugify } from '../src/lib/utils'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

const BCRYPT_ROUNDS = 12
const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')
const OUT_FILE = path.join(process.cwd(), 'drizzle', 'mysql', '0001_seed.sql')

/**
 * The admin row carries a bcrypt hash of a real password, so it is written to
 * a separate `.local.sql` file that `.gitignore` excludes — a hash in a git
 * history is an offline cracking target that nothing here needs to publish.
 */
const ADMIN_FILE = path.join(process.cwd(), 'drizzle', 'mysql', '0002_admin.local.sql')

/* --------------------------------------------------------------- SQL values */

/** MySQL string literal. Backslash escapes are on by default in MariaDB. */
function esc(value: string): string {
  return value.replace(/[\0\b\t\x1a\n\r'"\\]/g, (ch) => {
    switch (ch) {
      case '\0':
        return '\\0'
      case '\b':
        return '\\b'
      case '\t':
        return '\\t'
      case '\x1a':
        return '\\Z'
      case '\n':
        return '\\n'
      case '\r':
        return '\\r'
      default:
        return `\\${ch}`
    }
  })
}

type Value = string | number | boolean | null | object | undefined

function lit(value: Value): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'string') return `'${esc(value)}'`
  return `'${esc(JSON.stringify(value))}'` // jsonb -> JSON column
}

/** Deterministic ids, matching `id()` in src/db/seed.ts. */
function rowId(prefix: string, value: string): string {
  return `${prefix}-${slugify(value).slice(0, 60)}`
}

/**
 * INSERT … ON DUPLICATE KEY UPDATE for a batch of rows.
 * `id` is never updated, so a re-run keeps the original primary key.
 */
function upsert(table: string, rows: Record<string, Value>[]): string {
  if (rows.length === 0) return `-- ${table}: no rows\n`

  const columns = Object.keys(rows[0])
  const updatable = columns.filter((c) => c !== 'id' && c !== 'created_at')

  const values = rows
    .map((row) => `  (${columns.map((c) => lit(row[c])).join(', ')})`)
    .join(',\n')

  const updates = updatable.map((c) => `  \`${c}\` = VALUES(\`${c}\`)`).join(',\n')

  return [
    `-- ${table} (${rows.length} rows)`,
    `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES`,
    `${values}`,
    `ON DUPLICATE KEY UPDATE`,
    `${updates};`,
    '',
  ].join('\n')
}

/* ------------------------------------------------------------------- tables */

function buildCourses() {
  return upsert(
    'courses',
    courses.map((course, index) => ({
      id: rowId('course', course.slug),
      slug: course.slug,
      title: course.title,
      short_title: course.shortTitle,
      category: course.category,
      tagline: course.tagline,
      description: course.description,
      overview: course.overview,
      image: course.image,
      icon: course.icon,
      duration: course.duration,
      duration_weeks: course.durationWeeks,
      hours_per_week: course.hoursPerWeek,
      level: course.level,
      original_fee: course.originalFee,
      mode: course.mode,
      language: course.language,
      skills: course.skills,
      tools: course.tools,
      outcomes: course.outcomes,
      curriculum: course.curriculum,
      careers: course.careers,
      projects: course.projects,
      instructor_slug: course.instructorSlug,
      rating: course.rating,
      reviews: course.reviews,
      enrolled: course.enrolled,
      featured: course.featured,
      badge: course.badge ?? null,
      faqs: course.faqs,
      sort_order: index,
    })),
  )
}

function buildAuthors() {
  return upsert(
    'authors',
    authors.map((author, index) => ({
      id: rowId('author', author.slug),
      slug: author.slug,
      name: author.name,
      role: author.role,
      credentials: author.credentials,
      bio: author.bio,
      long_bio: author.longBio,
      avatar: author.avatar,
      expertise: author.expertise,
      years_experience: author.yearsExperience,
      social: author.social,
      sort_order: index,
    })),
  )
}

function buildPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return '-- posts: content/blog missing\n'

  const rows = fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')
      const { data, content } = matter(raw)
      const fm = data as PostFrontmatter
      const slug = file.replace(/\.mdx?$/, '')

      return {
        id: rowId('post', slug),
        slug,
        title: fm.title,
        description: fm.description,
        date: fm.date,
        updated: fm.updated ?? null,
        author: fm.author,
        category: fm.category,
        tags: fm.tags ?? [],
        image: fm.image,
        image_alt: fm.imageAlt,
        featured: fm.featured ?? false,
        faqs: fm.faqs ?? [],
        body: content.trim(),
        published: true,
      }
    })

  return upsert('posts', rows)
}

function buildTestimonials() {
  return upsert(
    'testimonials',
    testimonials.map((t, index) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      course: t.course,
      course_slug: t.courseSlug,
      city: t.city,
      avatar: t.avatar,
      rating: t.rating,
      quote: t.quote,
      story: t.story ?? null,
      outcome: t.outcome,
      featured: t.featured,
      sort_order: index,
    })),
  )
}

function buildFaqs() {
  const homepage = new Set(homepageFaqs.map((f) => f.question))

  return upsert(
    'faqs',
    faqs.map((faq, index) => ({
      id: rowId('faq', faq.question),
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      show_on_homepage: homepage.has(faq.question),
      sort_order: index,
    })),
  )
}

function buildGallery() {
  return upsert(
    'gallery_items',
    galleryItems.map((item, index) => ({
      id: rowId('gallery', path.basename(item.src).replace(/\.\w+$/, '')),
      src: item.src,
      alt: item.alt,
      caption: item.caption,
      category: item.category,
      width: item.width,
      height: item.height,
      sort_order: index,
    })),
  )
}

/** Two stats are recomputed from the live catalogue rather than hand-typed. */
function statSource(label: string): string | null {
  if (label === 'Professional Courses') return 'courseCount'
  if (label === 'Average Rating') return 'averageRating'
  return null
}

function buildStats() {
  return upsert(
    'stats',
    stats.map((stat, index) => ({
      id: rowId('stat', stat.label),
      value: stat.value,
      suffix: stat.suffix,
      label: stat.label,
      description: stat.description,
      icon: stat.icon,
      derived_from: statSource(stat.label),
      sort_order: index,
    })),
  )
}

function buildBenefits() {
  return upsert(
    'benefits',
    benefits.map((benefit, index) => ({
      id: rowId('benefit', benefit.title),
      title: benefit.title,
      description: benefit.description,
      icon: benefit.icon,
      sort_order: index,
    })),
  )
}

function buildMilestones() {
  return upsert(
    'milestones',
    milestones.map((m, index) => ({
      id: rowId('milestone', m.year),
      year: m.year,
      title: m.title,
      body: m.body,
      sort_order: index,
    })),
  )
}

function buildCampaign() {
  return upsert('campaign_settings', [
    {
      id: 'default',
      name: campaign.name,
      emoji: campaign.emoji,
      discount_percent: campaign.discountPercent,
      headline: campaign.headline,
      subheadline: campaign.subheadline,
      coupon_code: campaign.couponCode,
      timezone_offset: campaign.timezoneOffset,
      seats_total: campaign.seatsTotal,
      seats_remaining: campaign.seatsRemaining,
      // Null keeps the rolling "14 August of the current year" rule until an
      // admin pins an explicit date at /admin/campaign.
      deadline: null,
    },
  ])
}

/* ------------------------------ sections previously hardcoded in site.ts --- */

function buildDifferentiators() {
  return upsert(
    'differentiators',
    differentiators.map((d, index) => ({
      id: rowId('diff', d.title),
      title: d.title,
      body: d.body,
      proof: d.proof,
      sort_order: index,
    })),
  )
}

function buildTrustBadges() {
  return upsert(
    'trust_badges',
    trustBadges.map((badge, index) => ({
      id: rowId('badge', badge.label),
      label: badge.label,
      icon: badge.icon,
      sort_order: index,
    })),
  )
}

function buildCourseCategories() {
  const blurbs: Record<string, string> = {
    'AI & Development': 'Build software and AI systems — web, apps and automation.',
    'Marketing & Business': 'Grow brands and revenue with paid, organic and e-commerce skills.',
    'Design & Media': 'Visual craft — branding, graphics, video and short-form content.',
  }

  return upsert(
    'course_categories',
    courseCategories.map((name, index) => ({
      id: rowId('cat', name),
      slug: slugify(name),
      name,
      description: blurbs[name] ?? '',
      sort_order: index,
    })),
  )
}

function buildSiteSettings() {
  return upsert('site_settings', [
    {
      id: 'default',
      name: siteConfig.name,
      short_name: siteConfig.shortName,
      legal_name: siteConfig.legalName,
      tagline: siteConfig.tagline,
      description: siteConfig.description,
      founded: siteConfig.founded,
      logo: siteConfig.logo,
      keywords: [...siteConfig.keywords],
      phone: contactInfo.phone,
      phone_href: contactInfo.phoneHref,
      whatsapp: contactInfo.whatsapp,
      whatsapp_display: contactInfo.whatsappDisplay,
      courses_phone: contactInfo.coursesPhone,
      courses_phone_href: contactInfo.coursesPhoneHref,
      email: contactInfo.email,
      admissions_email: contactInfo.admissionsEmail,
      address_street: contactInfo.address.street,
      address_locality: contactInfo.address.locality,
      address_region: contactInfo.address.region,
      address_postal_code: contactInfo.address.postalCode,
      address_country: contactInfo.address.country,
      address_country_name: contactInfo.address.countryName,
      latitude: contactInfo.geo.latitude,
      longitude: contactInfo.geo.longitude,
      map_embed_url: contactInfo.mapEmbedUrl,
      office_url: contactInfo.officeUrl,
      opening_hours: contactInfo.openingHours.map((h) => ({ days: h.days, time: h.time })),
      opening_hours_spec: {
        days: [...contactInfo.openingHoursSpec.days],
        opens: contactInfo.openingHoursSpec.opens,
        closes: contactInfo.openingHoursSpec.closes,
      },
    },
  ])
}

function buildSocialLinks() {
  return upsert(
    'social_links',
    socialLinks.map((link, index) => ({
      id: rowId('social', link.name),
      name: link.name,
      href: link.href,
      icon: link.icon,
      active: true,
      sort_order: index,
    })),
  )
}

/**
 * Header, mega-menu and the four footer columns in one table.
 * Mega-menu headings are parent rows; their links point back via `parent_id`.
 */
function buildNavLinks() {
  const rows: Record<string, Value>[] = []
  let order = 0

  for (const item of mainNav) {
    const id = rowId('nav-header', item.label)
    rows.push({
      id,
      location: 'header',
      parent_id: null,
      label: item.label,
      href: item.href,
      description: item.description ?? null,
      cta_label: null,
      sort_order: order++,
    })

    if (!item.megaMenu) continue

    let columnOrder = 0
    for (const column of item.megaMenu.columns) {
      const columnId = rowId('nav-mm', column.heading)
      rows.push({
        id: columnId,
        location: 'megamenu',
        parent_id: id,
        label: column.heading,
        href: item.href,
        description: null,
        cta_label: null,
        sort_order: columnOrder++,
      })

      let linkOrder = 0
      for (const link of column.links) {
        rows.push({
          id: rowId('nav-mm', `${column.heading}-${link.label}`),
          location: 'megamenu',
          parent_id: columnId,
          label: link.label,
          href: link.href,
          description: link.description ?? null,
          cta_label: null,
          sort_order: linkOrder++,
        })
      }
    }

    const feature = item.megaMenu.feature
    if (feature) {
      rows.push({
        id: rowId('nav-mm-feature', feature.title),
        location: 'megamenu-feature',
        parent_id: id,
        label: feature.title,
        href: feature.href,
        description: feature.body,
        cta_label: feature.cta,
        sort_order: 0,
      })
    }
  }

  for (const [group, links] of Object.entries(footerNav)) {
    let footerOrder = 0
    for (const link of links) {
      rows.push({
        id: rowId(`nav-footer-${group}`, link.label),
        location: `footer-${group}`,
        parent_id: null,
        label: link.label,
        href: link.href,
        description: null,
        cta_label: null,
        sort_order: footerOrder++,
      })
    }
  }

  return upsert('nav_links', rows)
}

async function buildAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME?.trim() || 'Administrator'

  if (!email || !password) return '-- admin_users: ADMIN_EMAIL/ADMIN_PASSWORD unset, skipped\n'
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.')

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  return upsert('admin_users', [
    { id: randomUUID(), email, name, password_hash: passwordHash },
  ])
}

/* ---------------------------------------------------------------------- run */

async function main() {
  const sections = [
    '-- Globify Tech Institute — content seed (MariaDB/MySQL)',
    '-- Generated by scripts/generate-mysql-seed.ts — do not edit by hand.',
    '',
    'SET NAMES utf8mb4;',
    'START TRANSACTION;',
    '',
    buildSiteSettings(),
    buildSocialLinks(),
    buildNavLinks(),
    buildCourseCategories(),
    buildCourses(),
    buildAuthors(),
    buildPosts(),
    buildTestimonials(),
    buildFaqs(),
    buildGallery(),
    buildStats(),
    buildBenefits(),
    buildDifferentiators(),
    buildTrustBadges(),
    buildMilestones(),
    buildCampaign(),
    'COMMIT;',
    '',
  ]

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  fs.writeFileSync(OUT_FILE, sections.join('\n'), 'utf8')

  const bytes = fs.statSync(OUT_FILE).size
  console.info(`\nWrote ${OUT_FILE} (${(bytes / 1024).toFixed(1)} KB)`)
  console.info(
    `  courses ${courses.length} · authors ${authors.length} · testimonials ${testimonials.length} · faqs ${faqs.length} · gallery ${galleryItems.length}`,
  )

  const admin = await buildAdminUser()
  fs.writeFileSync(
    ADMIN_FILE,
    ['-- Admin login. Git-ignored: contains a bcrypt hash of a real password.', '', 'SET NAMES utf8mb4;', '', admin].join('\n'),
    'utf8',
  )
  console.info(`Wrote ${ADMIN_FILE} (git-ignored)`)
}

main().catch((error) => {
  console.error('\nSeed generation failed:\n', error)
  process.exit(1)
})
