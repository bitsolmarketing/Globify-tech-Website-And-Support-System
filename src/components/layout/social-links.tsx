import { Facebook, Instagram, Linkedin, Music2, Twitter, Youtube } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { socialLinks } from '@/lib/site'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
  twitter: Twitter,
}

export function SocialLinks({
  className,
  tone = 'dark',
}: {
  className?: string
  tone?: 'dark' | 'light'
}) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-2.5', className)}>
      {socialLinks.map((social) => {
        const Icon = ICONS[social.icon] ?? Facebook
        return (
          <li key={social.name}>
            <a
              href={social.href}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={`${social.name} (opens in a new tab)`}
              className={cn(
                'grid size-10 place-items-center rounded-xl transition-all duration-300 ease-[var(--ease-out-expo)]',
                'hover:-translate-y-1',
                tone === 'light'
                  ? 'border border-white/12 bg-white/6 text-white/70 hover:border-gold-400/50 hover:bg-gold-500/15 hover:text-gold-300'
                  : 'border border-hairline bg-white text-ink-500 shadow-soft hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 hover:shadow-lift',
              )}
            >
              <Icon aria-hidden className="size-4.5" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
