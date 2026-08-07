import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** "AI & Automation" -> "ai-and-automation" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/** "ai-and-automation" -> "AI and Automation" (title-cased, acronyms preserved). */
const ACRONYMS = new Set(['ai', 'ui', 'ux', 'seo', 'it', 'api', 'cv', 'sme', 'llm'])

export function unslugify(slug: string): string {
  return slug
    .split('-')
    .map((word) =>
      ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/** PKR currency with no decimals — "Rs 12,500" */
const pkr = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  maximumFractionDigits: 0,
  currencyDisplay: 'narrowSymbol',
})

export function formatPKR(amount: number): string {
  return pkr.format(amount).replace('₨', 'Rs ').replace(/\s+/g, ' ').trim()
}

/** Stable, locale-independent date string — identical on server and client. */
export function formatDate(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatDateShort(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** "14 Aug" — used where a campaign deadline appears inline in copy. */
export function formatDayMonth(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}

/** "14 August" — the long form used in headings and body copy. */
export function formatDayMonthLong(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
}

/** Average adult reading speed for technical prose. */
const WORDS_PER_MINUTE = 225

export function readingTime(markdown: string): { minutes: number; words: number; text: string } {
  const words = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_>`\-[\]()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE))
  return { minutes, words, text: `${minutes} min read` }
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text
  return `${text.slice(0, text.lastIndexOf(' ', max - 1)).trimEnd()}…`
}

/** Absolute URL builder — required for canonicals, OG tags, sitemaps and RSS. */
export function absoluteUrl(path = '/'): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://globifytech.com').replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** Escape a string for safe inclusion inside XML (RSS / sitemap). */
export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case "'":
        return '&apos;'
      default:
        return '&quot;'
    }
  })
}

/** Fisher–Yates-free deterministic pick — keeps SSR/CSR output identical. */
export function pickEvery<T>(items: T[], count: number, offset = 0): T[] {
  if (items.length <= count) return items
  const step = Math.floor(items.length / count)
  return Array.from({ length: count }, (_, i) => items[(offset + i * step) % items.length])
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
