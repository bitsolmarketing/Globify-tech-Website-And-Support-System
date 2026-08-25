import Link from 'next/link'
import { ArrowRight, Hash, Tag } from 'lucide-react'

import { NewsletterForm } from '@/components/blog/newsletter-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getCategories, getFeaturedPosts, getTags } from '@/lib/blog'
import { discountedFee } from '@/lib/courses'
import { getCampaign } from '@/lib/data/campaign'
import { getCourseStats, getFeaturedCourses } from '@/lib/data/courses'
import { formatPKR } from '@/lib/utils'
import { BlogCard } from '@/components/blog/blog-card'

export async function BlogSidebar({ activeCategory }: { activeCategory?: string }) {
  const [categories, allTags, popular, courses, campaign, courseStats] = await Promise.all([
    getCategories(),
    getTags(),
    getFeaturedPosts(4),
    getFeaturedCourses(3),
    getCampaign(),
    getCourseStats(),
  ])

  const tags = allTags.slice(0, 14)

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
      {/* ------------------------------------------------------- Campaign */}
      <Card className="overflow-hidden border-transparent bg-brand-950 p-6 text-white">
        <Badge variant="solid-gold" size="sm">
          {campaign.emoji} {campaign.discountPercent}% OFF
        </Badge>
        <h2 className="mt-3 font-sans text-lg leading-snug font-bold text-white">
          {campaign.name}
        </h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/65">
          {campaign.discountPercent}% off all {courseStats.total} professional courses.
          Certification, internship and job assistance included.
        </p>
        <Button asChild variant="gold" size="md" className="mt-4 w-full">
          <Link href="/courses">
            Browse courses
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </Card>

      {/* ----------------------------------------------------- Categories */}
      {categories.length > 0 && (
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
            <Hash aria-hidden className="size-3.5" />
            Categories
          </h2>
          <ul className="mt-4 grid gap-1">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/blog/category/${category.slug}`}
                  aria-current={activeCategory === category.slug ? 'page' : undefined}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 font-sans text-[0.875rem] font-semibold transition-colors ${
                    activeCategory === category.slug
                      ? 'bg-brand-50 text-brand-900'
                      : 'text-ink-600 hover:bg-ink-50 hover:text-brand-800'
                  }`}
                >
                  {category.name}
                  <span className="font-sans text-xs text-ink-400">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* --------------------------------------------------- Popular posts */}
      {popular.length > 0 && (
        <Card className="p-6">
          <h2 className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
            Popular reads
          </h2>
          <ul className="mt-4 grid gap-5">
            {popular.map((post) => (
              <li key={post.slug} className="relative">
                <BlogCard post={post} variant="compact" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ----------------------------------------------------------- Tags */}
      {tags.length > 0 && (
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
            <Tag aria-hidden className="size-3.5" />
            Popular tags
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag.slug}>
                <Link href={`/blog/tag/${tag.slug}`}>
                  <Badge
                    variant="neutral"
                    size="md"
                    className="transition-colors hover:bg-brand-50 hover:text-brand-800"
                  >
                    {tag.name}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ------------------------------------------------------- Courses */}
      <Card className="p-6">
        <h2 className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
          Top courses
        </h2>
        <ul className="mt-4 grid gap-3">
          {courses.map((course) => (
            <li key={course.slug}>
              <Link
                href={`/courses/${course.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-hairline p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
              >
                <span className="min-w-0">
                  <span className="block truncate font-sans text-[0.875rem] font-bold text-ink-900 group-hover:text-brand-800">
                    {course.shortTitle}
                  </span>
                  <span className="block font-sans text-xs text-ink-400">{course.duration}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-sans text-sm font-extrabold text-brand-900">
                    {formatPKR(discountedFee(course, campaign.discountPercent))}
                  </span>
                  <span className="block font-sans text-[0.6875rem] text-ink-400 line-through">
                    {formatPKR(course.originalFee)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {/* --------------------------------------------------- Newsletter */}
      <Card className="p-6">
        <h2 className="font-sans text-base font-bold text-ink-900">Get the next guide</h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">
          One practical email a fortnight. No spam.
        </p>
        <NewsletterForm className="mt-4" />
      </Card>
    </aside>
  )
}
