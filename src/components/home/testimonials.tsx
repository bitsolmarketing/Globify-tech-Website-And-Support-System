import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Quote, Star } from 'lucide-react'

import { Reveal, RevealGroup, RevealItem } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Testimonial } from '@/lib/content'
import { getFeaturedTestimonials } from '@/lib/data/content'
import { cn } from '@/lib/utils'

export function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: Testimonial
  className?: string
}) {
  return (
    <Card
      className={cn(
        'group flex h-full flex-col p-7 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift',
        className,
      )}
    >
      <Quote
        aria-hidden
        className="size-8 shrink-0 text-gold-300 transition-colors duration-500 group-hover:text-gold-500"
      />

      <div className="mt-4 flex items-center gap-0.5" aria-label={`Rated ${testimonial.rating} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            aria-hidden
            className={cn(
              'size-4',
              i < testimonial.rating ? 'fill-gold-500 text-gold-500' : 'text-ink-200',
            )}
          />
        ))}
      </div>

      <blockquote className="mt-4 flex-1 text-[1.0625rem] leading-relaxed text-ink-700">
        <p>“{testimonial.quote}”</p>
      </blockquote>

      <footer className="mt-6 flex items-center gap-3.5 border-t border-hairline pt-5">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-brand-100">
          <Image
            src={testimonial.avatar}
            alt=""
            fill
            sizes="48px"
            loading="lazy"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[0.9375rem] font-bold text-ink-900">
            {testimonial.name}
          </p>
          <p className="truncate font-sans text-xs text-ink-500">
            {testimonial.role} · {testimonial.city}
          </p>
        </div>
      </footer>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="success" size="md">
          {testimonial.outcome}
        </Badge>
        <Link
          href={`/courses/${testimonial.courseSlug}`}
          className="font-sans text-xs font-semibold text-ink-400 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
        >
          {testimonial.course}
        </Link>
      </div>
    </Card>
  )
}

export async function Testimonials() {
  const featuredTestimonials = await getFeaturedTestimonials()

  return (
    <section aria-labelledby="testimonials-heading" className="section-y">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="testimonials-heading"
            eyebrow="Student success"
            title={
              <>
                Real people. Real{' '}
                <span className="text-gradient-brand">income</span>. Real timelines.
              </>
            }
            description="Every story below is from a Globify graduate, with the outcome they actually achieved — not a projection."
          />
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3"
          stagger={0.07}
        >
          {featuredTestimonials.slice(0, 6).map((testimonial) => (
            <RevealItem as="li" key={testimonial.id}>
              <TestimonialCard testimonial={testimonial} />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.12} className="mt-12 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/success-stories">
              Read all success stories
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
