'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'

import type { Campaign } from '@/lib/data/campaign'
import { contactInfo, siteConfig } from '@/lib/site'
import { cn } from '@/lib/utils'

export function WhatsAppButton({ campaign }: { campaign: Campaign }) {
  const message = `Assalam o Alaikum! I'm interested in the ${campaign.discountPercent}% OFF ${campaign.name} at ${siteConfig.name}. Please share course details and batch timings.`
  const pathname = usePathname()
  const [teaserOpen, setTeaserOpen] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)

  /* Show the teaser bubble once, after the page has settled. Delayed so it can
     never compete with LCP or shift anything above the fold. */
  React.useEffect(() => {
    if (dismissed) return
    const timer = setTimeout(() => setTeaserOpen(true), 6000)
    return () => clearTimeout(timer)
  }, [dismissed])

  /* Hide on the contact page — the form is right there. */
  if (pathname === '/contact') return null

  const href = `https://wa.me/${contactInfo.whatsapp}?text=${encodeURIComponent(message)}`

  return (
    <div className="fixed right-4 bottom-22 z-70 flex flex-col items-end gap-3 sm:right-6 sm:bottom-24">
      {teaserOpen && !dismissed && (
        <div className="relative max-w-[15rem] animate-zoom-in rounded-2xl rounded-br-sm border border-hairline bg-white p-4 pr-8 shadow-lift">
          <button
            type="button"
            onClick={() => {
              setTeaserOpen(false)
              setDismissed(true)
            }}
            aria-label="Dismiss WhatsApp message"
            className="absolute top-2 right-2 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            <X aria-hidden className="size-3.5" />
          </button>
          <p className="font-sans text-[0.8125rem] leading-snug font-bold text-ink-900">
            Questions about the {campaign.discountPercent}% OFF offer?
          </p>
          <p className="mt-1 font-sans text-xs leading-snug text-ink-500">
            Chat with our admissions team on WhatsApp — usually replies within minutes.
          </p>
        </div>
      )}

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Globify Tech Institute on WhatsApp (opens in a new tab)"
        onClick={() => setDismissed(true)}
        className={cn(
          'group relative grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lift',
          'transition-transform duration-300 ease-[var(--ease-out-expo)] hover:scale-110 active:scale-95',
        )}
      >
        {/* Attention pulse — decorative, respects reduced motion via globals.css */}
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-25 [animation-duration:2.4s]"
        />
        <MessageCircle aria-hidden className="relative size-6.5" strokeWidth={2.2} />
      </a>
    </div>
  )
}
