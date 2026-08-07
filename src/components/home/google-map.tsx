'use client'

import * as React from 'react'
import { ExternalLink, MapPin } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { contactInfo, siteConfig } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * Deferred map embed.
 *
 * Google's iframe pulls in a large third-party payload and sets cookies, so it
 * is only mounted once the container actually scrolls into view. Before that
 * the user sees a styled placeholder of identical height — zero layout shift,
 * zero third-party bytes on initial load.
 */
export function GoogleMap({ className }: { className?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [shouldLoad, setShouldLoad] = React.useState(false)

  React.useEffect(() => {
    const node = containerRef.current
    if (!node || shouldLoad) return

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '250px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [shouldLoad])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border border-hairline bg-ink-100 shadow-soft',
        className,
      )}
    >
      {shouldLoad ? (
        <iframe
          src={contactInfo.mapEmbedUrl}
          title={`Map showing ${siteConfig.name} in ${contactInfo.address.locality}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="absolute inset-0 size-full border-0 grayscale-[35%] transition-[filter] duration-500 hover:grayscale-0"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-linear-to-br from-brand-50 via-canvas to-brand-100"
        >
          <div className="flex flex-col items-center gap-2 text-brand-700">
            <MapPin className="size-7 animate-pulse" />
            <p className="font-sans text-sm font-semibold">Loading map…</p>
          </div>
        </div>
      )}

      {/* Always-available fallback for keyboard, screen-reader and no-JS users. */}
      <div className="absolute right-3 bottom-3 z-10">
        <Button asChild variant="secondary" size="sm">
          <a href={contactInfo.officeUrl} target="_blank" rel="noopener noreferrer">
            Get directions
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </div>
    </div>
  )
}
