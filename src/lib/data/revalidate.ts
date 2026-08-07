import 'server-only'

import { revalidatePath, revalidateTag } from 'next/cache'

import { TAGS, type CacheTag } from './cache'

/**
 * Two caches have to be cleared after an edit:
 *
 *   • `revalidateTag` drops the cached database read (`dbRead` in ./cache.ts).
 *   • `revalidatePath` drops the pre-rendered HTML in the full route cache.
 *
 * Tag invalidation alone is not enough — a statically generated page would keep
 * serving its old HTML and never re-run the loader.
 *
 * The path sweep is deliberately broad. Course data reaches the homepage, the
 * catalogue, every course page, the blog sidebar, the search index and the
 * sitemap; enumerating those precisely would rot the first time a component
 * moves. Marking the tree stale re-renders each page lazily on its next
 * request, which for an 80-page site costs nothing measurable.
 */
function sweep(tags: CacheTag[]) {
  for (const tag of tags) revalidateTag(tag)

  revalidatePath('/', 'layout')
  revalidatePath('/sitemap.xml')
  revalidatePath('/feed.xml')
}

export function revalidateCourses() {
  sweep([TAGS.courses, TAGS.siteContent])
}

export function revalidatePosts() {
  sweep([TAGS.posts])
}

export function revalidateAuthors() {
  sweep([TAGS.authors, TAGS.posts])
}

export function revalidateTestimonials() {
  sweep([TAGS.testimonials])
}

export function revalidateFaqs() {
  sweep([TAGS.faqs])
}

export function revalidateGallery() {
  sweep([TAGS.gallery])
}

export function revalidateCampaign() {
  sweep([TAGS.campaign])
}

export function revalidateSiteContent() {
  sweep([TAGS.siteContent])
}
