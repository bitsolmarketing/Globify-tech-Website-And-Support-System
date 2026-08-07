import 'server-only'

import { cache } from 'react'
import { asc } from 'drizzle-orm'

import { getDb } from '@/db'
import { courses as coursesTable, type CourseRow } from '@/db/schema'
import { courses as seedCourses, type Course, type CourseCategory } from '@/lib/courses'

import { dbRead, TAGS } from './cache'

/**
 * The catalogue is 14 rows. Loading it whole and deriving in memory keeps the
 * behaviour identical to the old file-backed helpers and costs one query per
 * cache miss instead of one per lookup.
 */
export function toCourse(row: CourseRow): Course {
  return {
    slug: row.slug,
    title: row.title,
    shortTitle: row.shortTitle,
    category: row.category,
    tagline: row.tagline,
    description: row.description,
    overview: row.overview,
    image: row.image,
    icon: row.icon,
    duration: row.duration,
    durationWeeks: row.durationWeeks,
    hoursPerWeek: row.hoursPerWeek,
    level: row.level,
    originalFee: row.originalFee,
    mode: row.mode,
    language: row.language,
    skills: row.skills,
    tools: row.tools,
    outcomes: row.outcomes,
    curriculum: row.curriculum,
    careers: row.careers,
    projects: row.projects,
    instructorSlug: row.instructorSlug,
    rating: row.rating,
    reviews: row.reviews,
    enrolled: row.enrolled,
    featured: row.featured,
    badge: row.badge ?? undefined,
    faqs: row.faqs,
  }
}

const load = dbRead({
  key: 'courses:all',
  tags: [TAGS.courses],
  load: async () =>
    getDb()
      .select()
      .from(coursesTable)
      .orderBy(asc(coursesTable.sortOrder), asc(coursesTable.title)),
  fallback: (): CourseRow[] => [],
})

export const getCourses = cache(async (): Promise<Course[]> => {
  const rows = await load()
  return rows.length > 0 ? rows.map(toCourse) : seedCourses
})

export const getCourseBySlug = cache(async (slug: string): Promise<Course | undefined> => {
  return (await getCourses()).find((course) => course.slug === slug)
})

export const getCourseSlugs = cache(async (): Promise<string[]> => {
  return (await getCourses()).map((course) => course.slug)
})

export const getFeaturedCourses = cache(async (limit = 6): Promise<Course[]> => {
  return (await getCourses()).filter((course) => course.featured).slice(0, limit)
})

export const getCoursesByCategory = cache(
  async (category: CourseCategory): Promise<Course[]> => {
    return (await getCourses()).filter((course) => course.category === category)
  },
)

export const getRelatedCourses = cache(async (slug: string, limit = 3): Promise<Course[]> => {
  const all = await getCourses()
  const current = all.find((course) => course.slug === slug)
  if (!current) return all.slice(0, limit)

  const sameCategory = all.filter((c) => c.slug !== slug && c.category === current.category)
  const others = all.filter((c) => c.slug !== slug && c.category !== current.category)
  return [...sameCategory, ...others].slice(0, limit)
})

export type CourseStats = {
  total: number
  totalEnrolled: number
  totalReviews: number
  averageRating: number
}

/** Aggregate numbers used by the stats band — derived, never hand-typed twice. */
export const getCourseStats = cache(async (): Promise<CourseStats> => {
  const all = await getCourses()
  const totalReviews = all.reduce((sum, c) => sum + c.reviews, 0)

  return {
    total: all.length,
    totalEnrolled: all.reduce((sum, c) => sum + c.enrolled, 0),
    totalReviews,
    averageRating:
      totalReviews === 0
        ? 0
        : Math.round((all.reduce((sum, c) => sum + c.rating * c.reviews, 0) / totalReviews) * 10) /
          10,
  }
})

/** Dropdown options for the contact form, generated from the live catalogue. */
export const getCourseOptions = cache(async (): Promise<{ value: string; label: string }[]> => {
  const all = await getCourses()
  return [
    ...all.map((course) => ({ value: course.slug, label: course.title })),
    { value: 'not-sure', label: 'Not sure yet — please advise me' },
  ]
})
