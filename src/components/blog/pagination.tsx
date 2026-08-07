import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

type Props = {
  page: number
  totalPages: number
  /** "/blog" -> /blog, /blog/page/2 … */
  basePath: string
}

/** Compact page list: 1 … 4 [5] 6 … 12 */
function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export function Pagination({ page, totalPages, basePath }: Props) {
  if (totalPages <= 1) return null

  const href = (target: number) => (target === 1 ? basePath : `${basePath}/page/${target}`)
  const items = pageWindow(page, totalPages)

  const linkClasses =
    'grid size-11 place-items-center rounded-xl border border-hairline bg-white font-sans text-sm font-semibold text-ink-600 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-900'

  return (
    <nav aria-label="Blog pagination" className="mt-14 flex justify-center">
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} rel="prev" aria-label="Previous page" className={linkClasses}>
              <ChevronLeft aria-hidden className="size-4.5" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="grid size-11 place-items-center rounded-xl border border-hairline bg-ink-50 text-ink-300"
            >
              <ChevronLeft aria-hidden className="size-4.5" />
            </span>
          )}
        </li>

        {items.map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 font-sans text-ink-300">
              …
            </li>
          ) : (
            <li key={item}>
              {item === page ? (
                <span
                  aria-current="page"
                  className="grid size-11 place-items-center rounded-xl bg-brand-900 font-sans text-sm font-bold text-white shadow-soft"
                >
                  {item}
                </span>
              ) : (
                <Link href={href(item)} aria-label={`Page ${item}`} className={linkClasses}>
                  {item}
                </Link>
              )}
            </li>
          ),
        )}

        <li>
          {page < totalPages ? (
            <Link href={href(page + 1)} rel="next" aria-label="Next page" className={linkClasses}>
              <ChevronRight aria-hidden className="size-4.5" />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className={cn(
                'grid size-11 place-items-center rounded-xl border border-hairline bg-ink-50 text-ink-300',
              )}
            >
              <ChevronRight aria-hidden className="size-4.5" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
