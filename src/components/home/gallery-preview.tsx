import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { getGalleryItems } from '@/lib/data/content'
import { cn } from '@/lib/utils'

/** Asymmetric mosaic — the first tile spans two columns and two rows. */
const SPANS = [
  'sm:col-span-2 sm:row-span-2',
  '',
  '',
  '',
  'sm:col-span-2',
  '',
  '',
  '',
]

export async function GalleryPreview() {
  const items = (await getGalleryItems()).slice(0, 8)

  return (
    <section aria-labelledby="gallery-heading" className="section-y bg-white">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="gallery-heading"
            eyebrow="Campus"
            title="Experience Learning Differently"
            description="Our campus on Jaranwala Road: labs, critique sessions, ceremonies and the people behind the results."
          />
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-12 grid auto-rows-[10rem] grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:grid-cols-4 lg:mt-16 lg:auto-rows-[12rem]"
          stagger={0.05}
        >
          {items.map((item, index) => (
            <RevealItem as="li" key={item.src} className={cn('relative', SPANS[index])}>
              <Link
                href="/gallery"
                className="group relative block size-full overflow-hidden rounded-2xl bg-ink-100"
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes={index === 0 ? '(min-width: 640px) 50vw, 92vw' : '(min-width: 640px) 25vw, 46vw'}
                  loading="lazy"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-108"
                />

                <div
                  aria-hidden
                  className="absolute inset-0 bg-linear-to-t from-brand-950/85 via-brand-950/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />

                <span className="absolute inset-x-4 bottom-4 translate-y-2 font-sans text-[0.8125rem] font-bold text-white opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0 group-hover:opacity-100">
                  {item.caption}
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.12} className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/gallery">
              View full gallery
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
