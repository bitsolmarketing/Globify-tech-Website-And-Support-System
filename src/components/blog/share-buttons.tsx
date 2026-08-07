'use client'

import * as React from 'react'
import { Check, Facebook, Link2, Linkedin, MessageCircle, Share2, Twitter } from 'lucide-react'

import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

type Props = {
  url: string
  title: string
  className?: string
  layout?: 'row' | 'column'
}

export function ShareButtons({ url, title, className, layout = 'row' }: Props) {
  const [copied, setCopied] = React.useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const targets = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      hover: 'hover:bg-[#25D366] hover:border-[#25D366]',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      hover: 'hover:bg-[#1877F2] hover:border-[#1877F2]',
    },
    {
      name: 'X',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      hover: 'hover:bg-ink-900 hover:border-ink-900',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      hover: 'hover:bg-[#0A66C2] hover:border-[#0A66C2]',
    },
  ]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2200)
    } catch {
      toast.error('Could not copy the link')
    }
  }

  async function nativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({ title, url })
    } catch {
      /* User dismissed the share sheet — nothing to report. */
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2',
        layout === 'column' ? 'flex-col' : 'flex-wrap',
        className,
      )}
    >
      <span
        className={cn(
          'font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-ink-400 uppercase',
          layout === 'column' && 'mb-1',
        )}
      >
        Share
      </span>

      {targets.map((target) => {
        const Icon = target.icon
        return (
          <a
            key={target.name}
            href={target.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${target.name} (opens in a new tab)`}
            className={cn(
              'grid size-10 place-items-center rounded-xl border border-hairline bg-white text-ink-500 shadow-soft',
              'transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:text-white',
              target.hover,
            )}
          >
            <Icon aria-hidden className="size-4" />
          </a>
        )
      })}

      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link to clipboard"
        className="grid size-10 place-items-center rounded-xl border border-hairline bg-white text-ink-500 shadow-soft transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-brand-700 hover:bg-brand-900 hover:text-white"
      >
        {copied ? (
          <Check aria-hidden className="size-4 text-brand-600" />
        ) : (
          <Link2 aria-hidden className="size-4" />
        )}
      </button>

      {/* Native share sheet — mobile only, hidden when unsupported. */}
      <button
        type="button"
        onClick={nativeShare}
        aria-label="Open share menu"
        className="grid size-10 place-items-center rounded-xl border border-hairline bg-white text-ink-500 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand-700 hover:bg-brand-900 hover:text-white sm:hidden"
      >
        <Share2 aria-hidden className="size-4" />
      </button>
    </div>
  )
}
