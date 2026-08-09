import type { MetadataRoute } from 'next'

import { getAllPosts, getCategories, getTags, POSTS_PER_PAGE } from '@/lib/blog'
import { getAuthorSlugs } from '@/lib/data/authors'
import { getCourses } from '@/lib/data/courses'
import { absoluteUrl } from '@/lib/utils'

/**
 * Native Next.js sitemap (supersedes next-sitemap for the App Router — it runs
 * at build time with full access to the content layer, so nothing can drift).
 *
 * `/admin` is deliberately absent: it is enumerated nowhere below, disallowed
 * in `robots.ts`, and carries `robots: { index: false, follow: false }` in its
 * own layout.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const [posts, courses, authorSlugs, categories, tags] = await Promise.all([
    getAllPosts(),
    getCourses(),
    getAuthorSlugs(),
    getCategories(),
    getTags(),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/courses'), lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    {
      url: absoluteUrl('/why-choose-us'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.75,
    },
    {
      url: absoluteUrl('/success-stories'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: absoluteUrl('/gallery'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/blog'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/faqs'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/contact'), lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    {
      url: absoluteUrl('/contact/support'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    { url: absoluteUrl('/search'), lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    {
      url: absoluteUrl('/privacy-policy'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    { url: absoluteUrl('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const coursePages: MetadataRoute.Sitemap = courses.map((course) => ({
    url: absoluteUrl(`/courses/${course.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: course.featured ? 0.9 : 0.8,
  }))

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updated ?? post.date),
    changeFrequency: 'monthly',
    priority: post.featured ? 0.85 : 0.75,
  }))

  const blogPagination: MetadataRoute.Sitemap = Array.from(
    { length: Math.max(0, Math.ceil(posts.length / POSTS_PER_PAGE) - 1) },
    (_, i) => ({
      url: absoluteUrl(`/blog/page/${i + 2}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    }),
  )

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/blog/category/${category.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: absoluteUrl(`/blog/tag/${tag.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.45,
  }))

  const authorPages: MetadataRoute.Sitemap = authorSlugs.map((slug) => ({
    url: absoluteUrl(`/blog/author/${slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [
    ...staticPages,
    ...coursePages,
    ...postPages,
    ...blogPagination,
    ...categoryPages,
    ...tagPages,
    ...authorPages,
  ]
}
