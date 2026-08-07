'use client'

import * as React from 'react'
import { SearchX, SlidersHorizontal } from 'lucide-react'

import { CourseCard } from '@/components/courses/course-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { courseCategories, type Course, type CourseCategory } from '@/lib/courses'
import { cn } from '@/lib/utils'

type Filter = 'All' | CourseCategory

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'duration', label: 'Shortest first' },
  { value: 'rating', label: 'Highest rated' },
] as const

type Sort = (typeof SORTS)[number]['value']

/**
 * Client-side catalogue filtering. The full course list is rendered on the
 * server first (so crawlers see all 14 cards and the page is useful without
 * JavaScript); filtering only ever narrows what is already in the DOM tree.
 */
export function CourseCatalogue({
  courses,
  discountPercent,
}: {
  courses: Course[]
  discountPercent: number
}) {
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState<Filter>('All')
  const [sort, setSort] = React.useState<Sort>('popular')
  const searchId = React.useId()

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()

    const matched = courses.filter((course) => {
      if (category !== 'All' && course.category !== category) return false
      if (!q) return true
      return (
        course.title.toLowerCase().includes(q) ||
        course.tagline.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q) ||
        course.skills.some((s) => s.toLowerCase().includes(q)) ||
        course.tools.some((t) => t.toLowerCase().includes(q))
      )
    })

    const sorted = [...matched]
    switch (sort) {
      case 'price-low':
        sorted.sort((a, b) => a.originalFee - b.originalFee)
        break
      case 'price-high':
        sorted.sort((a, b) => b.originalFee - a.originalFee)
        break
      case 'duration':
        sorted.sort((a, b) => a.durationWeeks - b.durationWeeks)
        break
      case 'rating':
        sorted.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
        break
      default:
        sorted.sort((a, b) => b.enrolled - a.enrolled)
    }
    return sorted
  }, [courses, query, category, sort])

  const filters: Filter[] = ['All', ...courseCategories]

  return (
    <div>
      {/* --------------------------------------------------------- Controls */}
      <div className="flex flex-col gap-5 rounded-2xl border border-hairline bg-white p-5 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 lg:max-w-sm">
          <Label htmlFor={searchId} className="sr-only">
            Search courses
          </Label>
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by course, skill or tool…"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal aria-hidden className="size-4 shrink-0 text-ink-400" />
          <ul className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by category">
            {filters.map((filter) => (
              <li key={filter}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={category === filter}
                  onClick={() => setCategory(filter)}
                  className={cn(
                    'rounded-full px-4 py-2 font-sans text-[0.8125rem] font-semibold transition-all duration-300',
                    category === filter
                      ? 'bg-brand-900 text-white shadow-soft'
                      : 'bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-900',
                  )}
                >
                  {filter}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={`${searchId}-sort`} className="shrink-0 text-ink-500">
            Sort
          </Label>
          <select
            id={`${searchId}-sort`}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-11 cursor-pointer rounded-xl border border-ink-200 bg-white px-3 font-sans text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ----------------------------------------------------------- Count */}
      <p className="mt-6 font-sans text-sm text-ink-500" role="status" aria-live="polite">
        Showing <strong className="font-bold text-ink-900">{filtered.length}</strong> of{' '}
        {courses.length} courses
        {category !== 'All' && (
          <>
            {' '}
            in <Badge variant="brand" size="md">{category}</Badge>
          </>
        )}
      </p>

      {/* ------------------------------------------------------------ Grid */}
      {filtered.length > 0 ? (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course, index) => (
            <li key={course.slug} className="relative">
              <CourseCard
                course={course}
                discountPercent={discountPercent}
                priority={index < 3}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-300 bg-white p-14 text-center">
          <SearchX aria-hidden className="size-10 text-ink-300" />
          <h2 className="font-sans text-xl font-bold text-ink-900">No courses match that search</h2>
          <p className="max-w-sm text-ink-500">
            Try a broader keyword, or clear the filters to see all {courses.length} programmes.
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setQuery('')
              setCategory('All')
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
