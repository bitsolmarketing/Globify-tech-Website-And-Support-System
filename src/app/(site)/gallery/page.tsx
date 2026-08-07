import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'

import { GalleryGrid } from '@/components/gallery/gallery-grid'
import { GoogleMap } from '@/components/home/google-map'
import { JsonLd } from '@/components/seo/json-ld'
import { PageHero } from '@/components/shared/page-hero'
import { Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { getGalleryItems } from '@/lib/data/content'
import { buildMetadata } from '@/lib/metadata'
import {
  breadcrumbSchema,
  graph,
  imageObjectSchema,
  localBusinessSchema,
  webPageSchema,
} from '@/lib/schema'
import { contactInfo } from '@/lib/site'

const TITLE = 'Campus Gallery'
const DESCRIPTION =
  'Inside Globify Tech Institute Faisalabad — development and design labs, live classes, weekly critiques, certificate ceremonies and student events.'

export const metadata: Metadata = buildMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/gallery',
  image: `/api/og?title=${encodeURIComponent('Inside the campus')}&eyebrow=${encodeURIComponent('Gallery')}&badge=${encodeURIComponent('Jaranwala Road')}`,
  keywords: [
    'Globify campus photos',
    'IT institute Faisalabad campus',
    'computer lab Faisalabad',
    'training institute pictures',
  ],
})

const CRUMBS = [{ name: 'Gallery', href: '/gallery' }]

export default async function GalleryPage() {
  const galleryItems = await getGalleryItems()

  return (
    <>
      <PageHero
        eyebrow="Inside Globify"
        title={
          <>
            Where the work <span className="text-gradient-gold">actually happens</span>
          </>
        }
        description="Our campus on Jaranwala Road: development and design labs, live campaign reviews, weekly critique sessions, ceremonies and the people behind the results."
        crumbs={CRUMBS}
      >
        <Button asChild variant="outline-light" size="lg">
          <a href={contactInfo.mapDirectionsUrl} target="_blank" rel="noopener noreferrer">
            <MapPin aria-hidden />
            Get directions
          </a>
        </Button>
      </PageHero>

      <section aria-label="Photo gallery" className="section-y">
        <div className="container-page">
          <GalleryGrid items={galleryItems} />
        </div>
      </section>

      {/* ------------------------------------------------------------- Map */}
      <section aria-labelledby="visit-heading" className="section-y bg-white">
        <div className="container-page">
          <Reveal>
            <SectionHeading
              id="visit-heading"
              eyebrow="Come and see"
              title="Visit us before you decide"
              description="Walk in any day between 9 AM and 9 PM, Monday to Saturday. Sit in on a live class, meet the trainers, ask anything."
            />
          </Reveal>

          <Reveal delay={0.1} className="mt-12">
            <GoogleMap className="aspect-16/9 lg:aspect-21/9" />
          </Reveal>

          <Reveal delay={0.16} className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="primary" size="lg">
              <Link href="/contact">
                Book a campus visit
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/courses">Browse courses first</Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <JsonLd
        id="gallery-schema"
        data={graph(
          webPageSchema({ title: TITLE, description: DESCRIPTION, path: '/gallery' }),
          breadcrumbSchema([{ name: 'Home', href: '/' }, ...CRUMBS]),
          localBusinessSchema(),
          {
            '@type': 'ImageGallery',
            name: `${TITLE} — Globify Tech Institute`,
            description: DESCRIPTION,
            image: galleryItems.map((item) =>
              imageObjectSchema(item.src, item.caption, item.width, item.height),
            ),
          },
        )}
      />
    </>
  )
}
