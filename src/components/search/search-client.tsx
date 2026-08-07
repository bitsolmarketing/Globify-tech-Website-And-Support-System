'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, SearchX, Search as SearchIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input, Label } from '@/components/ui/field'
import type { SearchDoc } from '@/lib/blog'
import { cn } from '@/lib/utils'

const TYPES = ['All', 'Course', 'Blog', 'Page'] as const
type TypeFilter = (typeof TYPES)[number]

/**
 * Client-side site search over a small index serialised at build time.
 *
 * The whole index is ~15 KB for this site, which is far cheaper than a search
 * API round-trip and works instantly as you type. If the content grows past a
 * few hundred documents, swap this for a server route without touching the UI.
 */
export function SearchClient({ docs }: { docs: SearchDoc[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initial = searchParams.get('q') ?? ''

  const [query, setQuery] = React.useState(initial)
  const [type, setType] = React.useState<TypeFilter>('All')
  const inputId = React.useId()

  /* Keep the URL in sync so results are shareable and back/forward works. */
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      router.replace(params.toString() ? `/search?${params}` : '/search', { scroll: false })
    }, 350)
    return () => clearTimeout(timer)
  }, [query, router])

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const terms = q.split(/\s+/).filter(Boolean)

    return docs
      .filter((doc) => type === 'All' || doc.type === type)
      .map((doc) => {
        const title = doc.title.toLowerCase()
        let score = 0

        for (const term of terms) {
          if (title === term) score += 100
          else if (title.startsWith(term)) score += 40
          else if (title.includes(term)) score += 25
          if (doc.keywords.includes(term)) score += 8
          if (doc.description.toLowerCase().includes(term)) score += 5
        }

        // Every term must appear somewhere, otherwise it is not a match.
        const allPresent = terms.every((term) => doc.keywords.includes(term))
        return { doc, score: allPresent ? score : 0 }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
      .slice(0, 30)
      .map((entry) => entry.doc)
  }, [docs, query, type])

  const counts = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const terms = q.split(/\s+/).filter(Boolean)
    if (terms.length === 0) return null

    const matched = docs.filter((doc) => terms.every((term) => doc.keywords.includes(term)))
    return {
      All: matched.length,
      Course: matched.filter((d) => d.type === 'Course').length,
      Blog: matched.filter((d) => d.type === 'Blog').length,
      Page: matched.filter((d) => d.type === 'Page').length,
    }
  }, [docs, query])

  return (
    <div>
      {/* ----------------------------------------------------------- Input */}
      <div className="mx-auto max-w-2xl">
        <Label htmlFor={inputId} className="sr-only">
          Search the site
        </Label>
        <div className="relative">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink-400"
          />
          <Input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, articles and pages…"
            autoComplete="off"
            autoFocus
            className="h-15 rounded-2xl pl-13 text-base"
          />
        </div>

        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {TYPES.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => setType(option)}
                aria-pressed={type === option}
                className={cn(
                  'rounded-full px-4 py-2 font-sans text-[0.8125rem] font-semibold transition-all duration-300',
                  type === option
                    ? 'bg-brand-900 text-white shadow-soft'
                    : 'bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-900',
                )}
              >
                {option}
                {counts && (
                  <span className={cn('ml-1.5', type === option ? 'text-white/60' : 'text-ink-400')}>
                    {counts[option]}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* --------------------------------------------------------- Results */}
      <div className="mx-auto mt-12 max-w-3xl">
        {!query.trim() ? (
          <p className="text-center text-ink-500">
            Start typing to search {docs.length} courses, articles and pages.
          </p>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-300 bg-white p-14 text-center">
            <SearchX aria-hidden className="size-10 text-ink-300" />
            <h2 className="font-sans text-xl font-bold text-ink-900">
              Nothing found for “{query.trim()}”
            </h2>
            <p className="max-w-sm text-ink-500">
              Try a shorter or more general term — for example “AI”, “freelancing” or “marketing”.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 font-sans text-sm text-ink-500" role="status" aria-live="polite">
              <strong className="font-bold text-ink-900">{results.length}</strong> result
              {results.length === 1 ? '' : 's'} for “{query.trim()}”
            </p>

            <ul className="grid gap-3">
              {results.map((doc) => (
                <li key={doc.href}>
                  <Link
                    href={doc.href}
                    className="group flex items-start justify-between gap-4 rounded-2xl border border-hairline bg-white p-5 shadow-soft transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={doc.type === 'Course' ? 'gold' : doc.type === 'Blog' ? 'brand' : 'neutral'}
                          size="sm"
                        >
                          {doc.type}
                        </Badge>
                        <span className="font-sans text-xs text-ink-400">{doc.meta}</span>
                      </span>

                      <span className="mt-2 block font-sans text-base leading-snug font-bold text-ink-900 group-hover:text-brand-800">
                        {doc.title}
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-[0.9375rem] leading-relaxed text-ink-500">
                        {doc.description}
                      </span>
                    </span>

                    <ArrowRight
                      aria-hidden
                      className="mt-1 size-4.5 shrink-0 text-ink-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-700"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
