import type { Metadata, Viewport } from 'next'
import { Manrope } from 'next/font/google'

import './globals.css'

import { Toaster } from '@/components/ui/toaster'
import { siteConfig, verification } from '@/lib/site'
import { absoluteUrl } from '@/lib/utils'

/**
 * Minimal root layout: document shell, fonts and the toast host only.
 *
 * The public chrome (navbar, footer, JSON-LD, analytics) lives in
 * `(site)/layout.tsx` so that `/admin` can render its own shell without the
 * marketing header wrapped around it. Route groups do not affect URLs, so
 * every public path is unchanged.
 *
 * One family — Manrope — for both headings and body, self-hosted by
 * next/font (no render-blocking request to fonts.googleapis.com, no layout
 * shift thanks to the size-adjusted fallback). A single premium sans reads
 * more cohesive than pairing two families, and weight alone carries the
 * hierarchy.
 */
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  fallback: ['Segoe UI', 'system-ui', 'sans-serif'],
  adjustFontFallback: true,
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.legalName,
  category: 'education',
  generator: 'Next.js',
  referrer: 'origin-when-cross-origin',
  formatDetection: { telephone: true, address: true, email: true },
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': absoluteUrl('/feed.xml') },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@globifytech',
    creator: '@globifytech',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: ['/api/og'],
  },
  // Icons are intentionally NOT declared here. Next generates the correct
  // hashed <link> tags from the file conventions `app/icon.png` and
  // `app/apple-icon.png`; hardcoding paths here overrides them with URLs that
  // do not exist. `public/favicon.ico` covers the browser's implicit request.
  manifest: '/manifest.webmanifest',
  verification: {
    ...(verification.google ? { google: verification.google } : {}),
    ...(verification.yandex ? { yandex: verification.yandex } : {}),
    ...(verification.bing ? { other: { 'msvalidate.01': verification.bing } } : {}),
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4338CA' },
    { media: '(prefers-color-scheme: dark)', color: '#4338CA' },
  ],
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PK" className={manrope.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
