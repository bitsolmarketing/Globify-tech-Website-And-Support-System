import 'server-only'

import { cache } from 'react'
import { asc } from 'drizzle-orm'

import { getDb } from '@/db'
import {
  benefits as benefitsTable,
  faqs as faqsTable,
  galleryItems as galleryTable,
  milestones as milestonesTable,
  stats as statsTable,
  testimonials as testimonialsTable,
  type BenefitRow,
  type FaqRow,
  type GalleryRow,
  type MilestoneRow,
  type StatRow,
  type TestimonialRow,
} from '@/db/schema'
import {
  benefits as seedBenefits,
  faqs as seedFaqs,
  galleryItems as seedGallery,
  homepageFaqs as seedHomepageFaqs,
  milestones as seedMilestones,
  stats as seedStats,
  testimonials as seedTestimonials,
  type Benefit,
  type Faq,
  type GalleryItem,
  type Stat,
  type Testimonial,
} from '@/lib/content'

import { dbRead, TAGS } from './cache'
import { getCourseStats } from './courses'

/* -------------------------------------------------------------- testimonials */

export function toTestimonial(row: TestimonialRow): Testimonial {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    course: row.course,
    courseSlug: row.courseSlug,
    city: row.city,
    avatar: row.avatar,
    rating: row.rating,
    quote: row.quote,
    story: row.story ?? undefined,
    outcome: row.outcome,
    featured: row.featured,
  }
}

const loadTestimonials = dbRead({
  key: 'testimonials:all',
  tags: [TAGS.testimonials],
  load: async () =>
    getDb()
      .select()
      .from(testimonialsTable)
      .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.name)),
  fallback: (): TestimonialRow[] => [],
})

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  const rows = await loadTestimonials()
  return rows.length > 0 ? rows.map(toTestimonial) : seedTestimonials
})

export const getFeaturedTestimonials = cache(async (): Promise<Testimonial[]> => {
  return (await getTestimonials()).filter((testimonial) => testimonial.featured)
})

/* ---------------------------------------------------------------------- faqs */

export function toFaq(row: FaqRow): Faq {
  return { question: row.question, answer: row.answer, category: row.category }
}

const loadFaqs = dbRead({
  key: 'faqs:all',
  tags: [TAGS.faqs],
  load: async () =>
    getDb().select().from(faqsTable).orderBy(asc(faqsTable.sortOrder), asc(faqsTable.question)),
  fallback: (): FaqRow[] => [],
})

export const getFaqs = cache(async (): Promise<Faq[]> => {
  const rows = await loadFaqs()
  return rows.length > 0 ? rows.map(toFaq) : seedFaqs
})

export const getFaqCategories = cache(async (): Promise<string[]> => {
  return Array.from(new Set((await getFaqs()).map((faq) => faq.category)))
})

/** Compact set used on the homepage — flagged per row rather than whitelisted. */
export const getHomepageFaqs = cache(async (): Promise<Faq[]> => {
  const rows = await loadFaqs()
  if (rows.length === 0) return seedHomepageFaqs
  return rows.filter((row) => row.showOnHomepage).map(toFaq)
})

/* ------------------------------------------------------------------- gallery */

export function toGalleryItem(row: GalleryRow): GalleryItem {
  return {
    src: row.src,
    alt: row.alt,
    caption: row.caption,
    category: row.category,
    width: row.width,
    height: row.height,
  }
}

const loadGallery = dbRead({
  key: 'gallery:all',
  tags: [TAGS.gallery],
  load: async () =>
    getDb().select().from(galleryTable).orderBy(asc(galleryTable.sortOrder), asc(galleryTable.src)),
  fallback: (): GalleryRow[] => [],
})

export const getGalleryItems = cache(async (): Promise<GalleryItem[]> => {
  const rows = await loadGallery()
  return rows.length > 0 ? rows.map(toGalleryItem) : seedGallery
})

/* ------------------------------------------------------ stats / benefits / … */

const loadStats = dbRead({
  key: 'stats:all',
  tags: [TAGS.siteContent, TAGS.courses],
  load: async () =>
    getDb().select().from(statsTable).orderBy(asc(statsTable.sortOrder), asc(statsTable.label)),
  fallback: (): StatRow[] => [],
})

/**
 * Two of the six stats are computed from the live catalogue rather than typed
 * in, which is why this read is tagged with `courses` as well — editing a
 * course has to refresh the achievements band.
 */
export const getStats = cache(async (): Promise<Stat[]> => {
  const rows = await loadStats()
  if (rows.length === 0) return seedStats

  const courseStats = await getCourseStats()

  return rows.map((row) => {
    const base: Stat = {
      value: row.value,
      suffix: row.suffix,
      label: row.label,
      description: row.description,
      icon: row.icon,
    }

    if (row.derivedFrom === 'courseCount') {
      return { ...base, value: courseStats.total }
    }

    if (row.derivedFrom === 'averageRating') {
      return {
        ...base,
        value: courseStats.averageRating,
        description: `Across ${courseStats.totalReviews.toLocaleString('en-US')} verified student reviews`,
      }
    }

    return base
  })
})

export function toBenefit(row: BenefitRow): Benefit {
  return { title: row.title, description: row.description, icon: row.icon }
}

const loadBenefits = dbRead({
  key: 'benefits:all',
  tags: [TAGS.siteContent],
  load: async () =>
    getDb()
      .select()
      .from(benefitsTable)
      .orderBy(asc(benefitsTable.sortOrder), asc(benefitsTable.title)),
  fallback: (): BenefitRow[] => [],
})

export const getBenefits = cache(async (): Promise<Benefit[]> => {
  const rows = await loadBenefits()
  return rows.length > 0 ? rows.map(toBenefit) : seedBenefits
})

export type Milestone = { year: string; title: string; body: string }

export function toMilestone(row: MilestoneRow): Milestone {
  return { year: row.year, title: row.title, body: row.body }
}

const loadMilestones = dbRead({
  key: 'milestones:all',
  tags: [TAGS.siteContent],
  load: async () =>
    getDb()
      .select()
      .from(milestonesTable)
      .orderBy(asc(milestonesTable.sortOrder), asc(milestonesTable.year)),
  fallback: (): MilestoneRow[] => [],
})

export const getMilestones = cache(async (): Promise<Milestone[]> => {
  const rows = await loadMilestones()
  return rows.length > 0 ? rows.map(toMilestone) : seedMilestones.map((milestone) => ({ ...milestone }))
})
