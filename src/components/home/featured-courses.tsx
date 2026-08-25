import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { CourseCard } from '@/components/courses/course-card'
import { RevealGroup, RevealItem, Reveal } from '@/components/shared/reveal'
import { SectionHeading } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { getCampaign } from '@/lib/data/campaign'
import { getCourseStats, getFeaturedCourses } from '@/lib/data/courses'

export async function FeaturedCourses() {
  const [featured, courseStats, campaign] = await Promise.all([
    getFeaturedCourses(6),
    getCourseStats(),
    getCampaign(),
  ])

  return (
    <section aria-labelledby="featured-courses-heading" className="section-y">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            id="featured-courses-heading"
            eyebrow="Most in-demand"
            title={
              <>
                Learn skills that actually <span className="text-gradient-brand">pay</span>
              </>
            }
            description={`Practical programmes designed to take you from beginner to industry-ready — ${courseStats.total} courses deep, project-based, taught by working professionals.`}
          />
        </Reveal>

        <RevealGroup
          as="ul"
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3"
          stagger={0.07}
        >
          {featured.map((course, index) => (
            <RevealItem as="li" key={course.slug} className="relative">
              <CourseCard
                course={course}
                discountPercent={campaign.discountPercent}
                priority={index < 3}
              />
            </RevealItem>
          ))}
        </RevealGroup>

        <Reveal delay={0.15} className="mt-12 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/courses">
              View all {courseStats.total} courses
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
