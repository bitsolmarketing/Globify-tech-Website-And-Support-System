import Link from 'next/link'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'

import { Logo } from '@/components/layout/logo'
import { SocialLinks } from '@/components/layout/social-links'
import { NewsletterForm } from '@/components/blog/newsletter-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Campaign } from '@/lib/data/campaign'
import { contactInfo, footerNav, siteConfig } from '@/lib/site'
import { formatDayMonthLong } from '@/lib/utils'

const columns = [
  { heading: 'Institute', links: footerNav.company },
  { heading: 'Popular Courses', links: footerNav.courses },
  { heading: 'Resources', links: footerNav.resources },
] as const

export function Footer({ campaign }: { campaign: Campaign }) {
  const year = new Date().getUTCFullYear()

  return (
    <footer className="relative overflow-hidden bg-brand-950 text-white/70">
      {/* Decorative wash — pointer-events-none so it never blocks links. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-light opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-700/25 blur-3xl"
      />

      <div className="relative">
        {/* --------------------------------------------------- CTA banner */}
        <div className="container-page pt-16 lg:pt-20">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-brand-900 via-brand-800 to-brand-950 p-8 shadow-glow sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-gold-500/20 blur-3xl"
            />
            <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <Badge variant="solid-gold" size="md">
                  {campaign.emoji} {campaign.name}
                </Badge>
                <h2 className="mt-4 text-3xl text-white sm:text-4xl">
                  Ready to start? Get{' '}
                  <span className="text-gradient-gold">{campaign.discountPercent}% OFF</span> before{' '}
                  {formatDayMonthLong(campaign.deadline)}.
                </h2>
                <p className="mt-3 max-w-xl text-lg text-white/70">
                  Talk to a career counsellor for free. We will match you to the right course
                  honestly — even if that means telling you to wait.
                </p>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col xl:flex-row">
                <Button asChild variant="gold" size="lg">
                  <Link href="/contact#enroll">Enroll Now</Link>
                </Button>
                <Button asChild variant="outline-light" size="lg">
                  <Link href="/contact">Book Free Counseling</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------ Main grid */}
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8 lg:py-20">
          {/* Brand column */}
          <div className="max-w-sm">
            <Logo tone="light" showTagline />

            <p className="mt-5 text-[0.9375rem] leading-relaxed">
              {siteConfig.name} is a practical IT training institute in Faisalabad. Since{' '}
              {siteConfig.founded} we have trained over 8,500 students in AI, development, design,
              marketing and freelancing — with certification, internship and job assistance.
            </p>

            <address className="mt-6 flex flex-col gap-3 not-italic">
              <a
                href={contactInfo.mapDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 text-[0.9375rem] transition-colors hover:text-white"
              >
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-400" />
                <span>
                  {contactInfo.address.street}
                  <br />
                  {contactInfo.address.locality}, {contactInfo.address.region}{' '}
                  {contactInfo.address.postalCode}
                </span>
              </a>

              <a
                href={`tel:${contactInfo.phoneHref}`}
                className="flex items-center gap-3 text-[0.9375rem] transition-colors hover:text-white"
              >
                <Phone aria-hidden className="size-4 shrink-0 text-gold-400" />
                {contactInfo.phone}
              </a>

              <a
                href={`mailto:${contactInfo.email}`}
                className="flex items-center gap-3 text-[0.9375rem] transition-colors hover:text-white"
              >
                <Mail aria-hidden className="size-4 shrink-0 text-gold-400" />
                {contactInfo.email}
              </a>

              <p className="flex items-start gap-3 text-[0.9375rem]">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-400" />
                <span>
                  {contactInfo.openingHours.map((slot) => (
                    <span key={slot.days} className="block">
                      {slot.days}: {slot.time}
                    </span>
                  ))}
                </span>
              </p>
            </address>

            <SocialLinks className="mt-6" tone="light" />
          </div>

          {/* Link columns */}
          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-white uppercase">
                {column.heading}
              </h3>
              <ul className="mt-5 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block text-[0.9375rem] transition-all duration-200 hover:translate-x-1 hover:text-gold-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ----------------------------------------------------- Newsletter */}
        <div className="container-page pb-14">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm sm:p-9">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-10">
              <div>
                <h3 className="text-xl text-white sm:text-2xl">
                  Career guides, straight to your inbox
                </h3>
                <p className="mt-2 text-[0.9375rem]">
                  One practical email a fortnight on skills, freelancing and the Pakistani job
                  market. No spam, unsubscribe any time.
                </p>
              </div>
              <NewsletterForm tone="light" />
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------- Legal */}
        <div className="border-t border-white/10">
          <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-center sm:flex-row sm:text-left">
            <p className="font-sans text-[0.8125rem]">
              © {year} {siteConfig.legalName}. All rights reserved.
            </p>

            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {footerNav.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-sans text-[0.8125rem] transition-colors hover:text-gold-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/sitemap.xml"
                  className="font-sans text-[0.8125rem] transition-colors hover:text-gold-400"
                >
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}
