import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/?utm_source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f7f8fa',
    theme_color: '#01411c',
    lang: 'en-PK',
    dir: 'ltr',
    categories: ['education', 'business', 'productivity'],
    icons: [
      {
        src: '/images/generated/brand/logo.webp',
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'All Courses', url: '/courses', description: 'Browse all 14 professional courses' },
      { name: 'Enroll Now', url: '/contact#enroll', description: 'Claim the 50% Azadi discount' },
      { name: 'Blog', url: '/blog', description: 'Career guides and skill roadmaps' },
    ],
  }
}
