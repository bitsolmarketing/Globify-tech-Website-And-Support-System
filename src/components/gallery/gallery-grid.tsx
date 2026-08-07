'use client'

import * as React from 'react'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { galleryCategories, type GalleryItem } from '@/lib/content'
import { cn } from '@/lib/utils'

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [category, setCategory] = React.useState<(typeof galleryCategories)[number]>('All')
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  const filtered = React.useMemo(
    () => (category === 'All' ? items : items.filter((item) => item.category === category)),
    [items, category],
  )

  const active = openIndex === null ? null : filtered[openIndex]

  const step = React.useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current
        return (current + delta + filtered.length) % filtered.length
      })
    },
    [filtered.length],
  )

  /* Arrow-key navigation inside the lightbox. */
  React.useEffect(() => {
    if (openIndex === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openIndex, step])

  return (
    <div>
      {/* --------------------------------------------------------- Filters */}
      <ul className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Filter gallery">
        {galleryCategories.map((option) => (
          <li key={option}>
            <button
              type="button"
              role="tab"
              aria-selected={category === option}
              onClick={() => {
                setCategory(option)
                setOpenIndex(null)
              }}
              className={cn(
                'rounded-full px-5 py-2.5 font-sans text-sm font-semibold transition-all duration-300',
                category === option
                  ? 'bg-brand-900 text-white shadow-soft'
                  : 'bg-white text-ink-600 shadow-soft ring-1 ring-hairline hover:bg-brand-50 hover:text-brand-900',
              )}
            >
              {option}
            </button>
          </li>
        ))}
      </ul>

      {/* ------------------------------------------------------------ Grid */}
      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item, index) => (
          <li key={item.src}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open image: ${item.caption}`}
              className="group relative block aspect-4/3 w-full overflow-hidden rounded-2xl bg-ink-100 shadow-soft transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:shadow-lift"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 46vw"
                loading={index < 4 ? 'eager' : 'lazy'}
                className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-108"
              />

              <span
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-brand-950/85 via-brand-950/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />

              <span className="absolute inset-x-4 bottom-4 translate-y-2 text-left font-sans text-[0.8125rem] font-bold text-white opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100">
                {item.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* -------------------------------------------------------- Lightbox */}
      <Dialog.Root open={openIndex !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-90 bg-ink-950/90 backdrop-blur-sm data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed inset-0 z-100 flex flex-col items-center justify-center p-4 data-[state=open]:animate-zoom-in sm:p-10">
            <Dialog.Title className="sr-only">{active?.caption ?? 'Gallery image'}</Dialog.Title>
            <Dialog.Description className="sr-only">
              {active?.alt ?? 'Enlarged gallery image'}
            </Dialog.Description>

            {active && (
              <>
                <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-ink-900 shadow-2xl">
                  <div className="relative aspect-4/3">
                    <Image
                      src={active.src}
                      alt={active.alt}
                      fill
                      sizes="(min-width: 1024px) 900px, 96vw"
                      className="object-contain"
                    />
                  </div>
                </div>

                <div className="mt-5 flex w-full max-w-4xl items-center justify-between gap-4">
                  <p className="min-w-0 font-sans text-sm text-white/80">
                    <span className="font-bold text-white">{active.caption}</span>
                    <span className="mx-2 text-white/30">·</span>
                    {openIndex! + 1} of {filtered.length}
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost-light"
                      size="icon"
                      onClick={() => step(-1)}
                      aria-label="Previous image"
                    >
                      <ChevronLeft aria-hidden />
                    </Button>
                    <Button
                      variant="ghost-light"
                      size="icon"
                      onClick={() => step(1)}
                      aria-label="Next image"
                    >
                      <ChevronRight aria-hidden />
                    </Button>
                  </div>
                </div>
              </>
            )}

            <Dialog.Close asChild>
              <Button
                variant="ghost-light"
                size="icon"
                aria-label="Close gallery"
                className="absolute top-4 right-4 sm:top-6 sm:right-6"
              >
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
