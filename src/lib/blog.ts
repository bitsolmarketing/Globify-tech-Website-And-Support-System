import 'server-only'

import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'

import { and, asc, desc, eq } from 'drizzle-orm'
import matter from 'gray-matter'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import { getDb } from '@/db'
import { posts as postsTable } from '@/db/schema'

import { dbRead, TAGS } from './data/cache'
import { readingTime, slugify } from './utils'

/**
 * Posts live in the `posts` table and are edited at `/admin/posts`. The MDX
 * files under `content/blog/` remain as the seed payload and as the fallback
 * used when `DATABASE_URL` is unset, so a fresh clone still has a blog.
 */
const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog')

export const POSTS_PER_PAGE = 6

export type PostFrontmatter = {
  title: string
  description: string
  date: string
  updated?: string
  author: string
  category: string
  tags: string[]
  image: string
  imageAlt: string
  featured?: boolean
  faqs?: { question: string; answer: string }[]
}

export type TocItem = { id: string; text: string; level: 2 | 3 }

export type PostMeta = PostFrontmatter & {
  slug: string
  readingMinutes: number
  wordCount: number
  categorySlug: string
  tagSlugs: string[]
}

export type Post = PostMeta & {
  /** Rendered, sanitised HTML for the article body. */
  html: string
  toc: TocItem[]
  raw: string
}

/** The storage-agnostic shape both the database and the MDX files produce. */
type PostRecord = { slug: string; data: PostFrontmatter; content: string }

/* ---------------------------------------------------------------------------
 * Heading slugs
 *
 * Must match github-slugger (used internally by rehype-slug) exactly, or the
 * table of contents links point at IDs that do not exist.
 * ------------------------------------------------------------------------ */
function headingSlug(text: string, seen: Map<string, number>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} \-_]/gu, '')
    .replace(/ /g, '-')

  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count}`
}

/** Strip inline markdown so TOC labels read as plain text. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim()
}

function buildToc(markdown: string): TocItem[] {
  const seen = new Map<string, number>()
  const toc: TocItem[] = []
  let insideCodeFence = false

  for (const line of markdown.split('\n')) {
    if (line.trimStart().startsWith('```')) {
      insideCodeFence = !insideCodeFence
      continue
    }
    if (insideCodeFence) continue

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) continue

    const text = stripInlineMarkdown(match[2])
    toc.push({
      id: headingSlug(text, seen),
      text,
      level: match[1].length as 2 | 3,
    })
  }

  return toc
}

/* ---------------------------------------------------------------------------
 * Markdown -> HTML
 * ------------------------------------------------------------------------ */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: 'append',
    properties: {
      className: ['heading-anchor'],
      ariaHidden: 'true',
      tabIndex: -1,
    },
    content: { type: 'text', value: '#' },
  })
  .use(rehypeStringify)

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await processor.process(markdown)
  return String(file)
}

/* ---------------------------------------------------------------------------
 * Storage
 * ------------------------------------------------------------------------ */

function readSeedFiles(): PostRecord[] {
  if (!fs.existsSync(CONTENT_DIR)) return []

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8')
      const { data, content } = matter(raw)
      return { slug: file.replace(/\.mdx?$/, ''), data: data as PostFrontmatter, content }
    })
}

const loadPublished = dbRead({
  key: 'posts:published',
  tags: [TAGS.posts],
  load: async () =>
    getDb()
      .select()
      .from(postsTable)
      .where(eq(postsTable.published, true))
      .orderBy(desc(postsTable.date), asc(postsTable.title)),
  fallback: (): (typeof postsTable.$inferSelect)[] => [],
})

async function loadRecords(): Promise<PostRecord[]> {
  const rows = await loadPublished()
  if (rows.length === 0) return readSeedFiles()

  return rows.map((row) => ({
    slug: row.slug,
    data: {
      title: row.title,
      description: row.description,
      date: row.date,
      updated: row.updated ?? undefined,
      author: row.author,
      category: row.category,
      tags: row.tags,
      image: row.image,
      imageAlt: row.imageAlt,
      featured: row.featured,
      faqs: row.faqs,
    },
    content: row.body,
  }))
}

function toMeta({ slug, data, content }: PostRecord): PostMeta {
  const { minutes, words } = readingTime(content)
  return {
    ...data,
    tags: data.tags ?? [],
    slug,
    readingMinutes: minutes,
    wordCount: words,
    categorySlug: slugify(data.category),
    tagSlugs: (data.tags ?? []).map(slugify),
  }
}

/**
 * All published posts, newest first.
 * `cache()` dedupes the read across every component in a request.
 */
export const getAllPosts = cache(async (): Promise<PostMeta[]> => {
  const records = await loadRecords()
  return records
    .map(toMeta)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

export const getPostSlugs = cache(async (): Promise<string[]> =>
  (await getAllPosts()).map((post) => post.slug),
)

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
  const records = await loadRecords()
  const record = records.find((post) => post.slug === slug)
  if (!record) return null

  const html = await renderMarkdown(record.content)

  return {
    ...toMeta(record),
    html,
    toc: buildToc(record.content),
    raw: record.content,
  }
})

/**
 * Single-row read used by the admin editor's preview — bypasses the
 * `published` filter so drafts can be previewed before they go live.
 */
export const getDraftBySlug = cache(async (slug: string): Promise<Post | null> => {
  const [row] = await getDb()
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.slug, slug)))
    .limit(1)

  if (!row) return null

  const record: PostRecord = {
    slug: row.slug,
    data: {
      title: row.title,
      description: row.description,
      date: row.date,
      updated: row.updated ?? undefined,
      author: row.author,
      category: row.category,
      tags: row.tags,
      image: row.image,
      imageAlt: row.imageAlt,
      featured: row.featured,
      faqs: row.faqs,
    },
    content: row.body,
  }

  return {
    ...toMeta(record),
    html: await renderMarkdown(record.content),
    toc: buildToc(record.content),
    raw: record.content,
  }
})

/* ---------------------------------------------------------------------------
 * Taxonomies
 * ------------------------------------------------------------------------ */

export type Taxonomy = { name: string; slug: string; count: number }

export const getCategories = cache(async (): Promise<Taxonomy[]> => {
  const map = new Map<string, Taxonomy>()
  for (const post of await getAllPosts()) {
    const existing = map.get(post.categorySlug)
    if (existing) existing.count += 1
    else map.set(post.categorySlug, { name: post.category, slug: post.categorySlug, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

export const getTags = cache(async (): Promise<Taxonomy[]> => {
  const map = new Map<string, Taxonomy>()
  for (const post of await getAllPosts()) {
    post.tags.forEach((tag) => {
      const slug = slugify(tag)
      const existing = map.get(slug)
      if (existing) existing.count += 1
      else map.set(slug, { name: tag, slug, count: 1 })
    })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

export const getPostsByCategory = cache(async (categorySlug: string): Promise<PostMeta[]> =>
  (await getAllPosts()).filter((post) => post.categorySlug === categorySlug),
)

export const getPostsByTag = cache(async (tagSlug: string): Promise<PostMeta[]> =>
  (await getAllPosts()).filter((post) => post.tagSlugs.includes(tagSlug)),
)

export const getPostsByAuthor = cache(async (authorSlug: string): Promise<PostMeta[]> =>
  (await getAllPosts()).filter((post) => post.author === authorSlug),
)

export const getFeaturedPosts = cache(async (limit = 3): Promise<PostMeta[]> => {
  const all = await getAllPosts()
  const featured = all.filter((post) => post.featured)
  return (featured.length >= limit ? featured : all).slice(0, limit)
})

export const getLatestPosts = cache(async (limit = 3): Promise<PostMeta[]> =>
  (await getAllPosts()).slice(0, limit),
)

/**
 * Related posts, ranked by shared tags then shared category.
 * Deterministic — identical output on server and client, no hydration drift.
 */
export const getRelatedPosts = cache(async (slug: string, limit = 3): Promise<PostMeta[]> => {
  const all = await getAllPosts()
  const current = all.find((post) => post.slug === slug)
  if (!current) return all.slice(0, limit)

  return all
    .filter((post) => post.slug !== slug)
    .map((post) => {
      const sharedTags = post.tagSlugs.filter((tag) => current.tagSlugs.includes(tag)).length
      const sameCategory = post.categorySlug === current.categorySlug ? 2 : 0
      const sameAuthor = post.author === current.author ? 1 : 0
      return { post, score: sharedTags * 3 + sameCategory + sameAuthor }
    })
    .sort(
      (a, b) =>
        b.score - a.score || new Date(b.post.date).getTime() - new Date(a.post.date).getTime(),
    )
    .slice(0, limit)
    .map((entry) => entry.post)
})

/* ---------------------------------------------------------------------------
 * Pagination
 * ------------------------------------------------------------------------ */

export type Paginated<T> = {
  items: T[]
  page: number
  totalPages: number
  totalItems: number
  hasPrev: boolean
  hasNext: boolean
}

export function paginate<T>(items: T[], page: number, perPage = POSTS_PER_PAGE): Paginated<T> {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * perPage

  return {
    items: items.slice(start, start + perPage),
    page: current,
    totalPages,
    totalItems,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  }
}

/* ---------------------------------------------------------------------------
 * Search index (serialised into the client search page)
 * ------------------------------------------------------------------------ */

export type SearchDoc = {
  title: string
  description: string
  href: string
  type: 'Blog' | 'Course' | 'Page'
  meta: string
  keywords: string
}

export const getBlogSearchDocs = cache(async (): Promise<SearchDoc[]> =>
  (await getAllPosts()).map((post) => ({
    title: post.title,
    description: post.description,
    href: `/blog/${post.slug}`,
    type: 'Blog' as const,
    meta: `${post.category} · ${post.readingMinutes} min read`,
    keywords: [post.title, post.description, post.category, ...post.tags].join(' ').toLowerCase(),
  })),
)
