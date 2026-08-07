import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Clock, Signal, Star, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { discountedFee, savings, type Course } from '@/lib/courses'
import { cn, formatPKR } from '@/lib/utils'

type Props = {
  course: Course
  /** Live campaign discount — passed in so this stays renderable on the client. */
  discountPercent: number
  /** Only the first row above the fold should be eager — everything else lazy. */
  priority?: boolean
  className?: string
}

export function CourseCard({ course, discountPercent, priority = false, className }: Props) {
  const price = discountedFee(course, discountPercent)
  const saved = savings(course, discountPercent)

  return (
    <Card
      className={cn(
        'group flex h-full flex-col overflow-hidden hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift',
        className,
      )}
    >
      {/* ------------------------------------------------------------ Media */}
      <div className="relative aspect-16/10 overflow-hidden bg-ink-100">
        <Image
          src={course.image}
          alt={`${course.title} course at Globify Tech Institute Faisalabad`}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 45vw, 92vw"
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-brand-950/70 via-brand-950/10 to-transparent"
        />

        {/* Discount flag */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <Badge variant="solid-gold" size="sm" className="shadow-soft">
            {discountPercent}% OFF
          </Badge>
          {course.badge && (
            <Badge variant="light" size="sm" className="shadow-soft">
              {course.badge}
            </Badge>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 shadow-soft backdrop-blur-sm">
          <Star aria-hidden className="size-3.5 fill-gold-500 text-gold-500" />
          <span className="font-sans text-xs font-bold text-ink-900">{course.rating}</span>
          <span className="font-sans text-[0.6875rem] text-ink-400">({course.reviews})</span>
        </div>

        <p className="absolute bottom-3 left-3 font-sans text-[0.6875rem] font-bold tracking-wide text-white/85 uppercase">
          {course.category}
        </p>
      </div>

      {/* ------------------------------------------------------------ Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-sans text-lg leading-snug font-bold text-ink-900 transition-colors duration-300 group-hover:text-brand-800">
          <Link href={`/courses/${course.slug}`} className="before:absolute before:inset-0">
            {course.title}
          </Link>
        </h3>

        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-500">{course.tagline}</p>

        {/* Meta row */}
        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs text-ink-500">
          <li className="flex items-center gap-1.5">
            <Clock aria-hidden className="size-3.5 text-brand-600" />
            {course.duration}
          </li>
          <li className="flex items-center gap-1.5">
            <Signal aria-hidden className="size-3.5 text-brand-600" />
            {course.level}
          </li>
          <li className="flex items-center gap-1.5">
            <Users aria-hidden className="size-3.5 text-brand-600" />
            {course.enrolled.toLocaleString('en-US')}
          </li>
        </ul>

        {/* Skills */}
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {course.skills.slice(0, 3).map((skill) => (
            <li key={skill}>
              <Badge variant="neutral" size="md">
                {skill}
              </Badge>
            </li>
          ))}
          {course.skills.length > 3 && (
            <li>
              <Badge variant="outline" size="md">
                +{course.skills.length - 3} more
              </Badge>
            </li>
          )}
        </ul>

        {/* Pricing + CTA */}
        <div className="mt-auto flex items-end justify-between gap-4 pt-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-2xl font-extrabold text-brand-900">
                {formatPKR(price)}
              </span>
              <span className="font-sans text-sm text-ink-400 line-through">
                {formatPKR(course.originalFee)}
              </span>
            </div>
            <p className="mt-0.5 font-sans text-[0.6875rem] font-bold text-brand-600">
              You save {formatPKR(saved)}
            </p>
          </div>

          <Button
            variant="secondary"
            size="icon"
            aria-hidden
            tabIndex={-1}
            className="relative z-10 shrink-0 transition-transform duration-300 group-hover:bg-brand-900 group-hover:text-white"
          >
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </Card>
  )
}
