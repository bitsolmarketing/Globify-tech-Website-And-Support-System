import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Clock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { PostMeta } from '@/lib/blog'
import { resolveAuthor } from '@/lib/data/authors'
import { cn, formatDateShort } from '@/lib/utils'

type Props = {
  post: PostMeta
  priority?: boolean
  variant?: 'default' | 'horizontal' | 'compact'
  className?: string
}

export async function BlogCard({ post, priority = false, variant = 'default', className }: Props) {
  const author = await resolveAuthor(post.author)

  if (variant === 'compact') {
    return (
      <article className={cn('group relative flex items-start gap-4', className)}>
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-ink-100">
          <Image
            src={post.image}
            alt={post.imageAlt}
            fill
            sizes="80px"
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-sans text-[0.9375rem] leading-snug font-bold text-ink-900 transition-colors group-hover:text-brand-800">
            <Link href={`/blog/${post.slug}`} className="before:absolute before:inset-0">
              {post.title}
            </Link>
          </h3>
          <p className="mt-1.5 flex items-center gap-3 font-sans text-xs text-ink-400">
            <span className="flex items-center gap-1">
              <CalendarDays aria-hidden className="size-3" />
              {formatDateShort(post.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock aria-hidden className="size-3" />
              {post.readingMinutes} min
            </span>
          </p>
        </div>
      </article>
    )
  }

  const horizontal = variant === 'horizontal'

  return (
    <Card
      className={cn(
        'group flex h-full overflow-hidden hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift',
        horizontal ? 'flex-col md:flex-row' : 'flex-col',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-ink-100',
          horizontal ? 'aspect-16/10 md:aspect-auto md:w-2/5 md:shrink-0' : 'aspect-16/9',
        )}
      >
        <Image
          src={post.image}
          alt={post.imageAlt}
          fill
          sizes={
            horizontal
              ? '(min-width: 768px) 40vw, 92vw'
              : '(min-width: 1024px) 33vw, (min-width: 640px) 48vw, 92vw'
          }
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-brand-950/45 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <Link
          href={`/blog/category/${post.categorySlug}`}
          className="relative z-10 w-fit"
          tabIndex={-1}
        >
          <Badge variant="brand" size="sm">
            {post.category}
          </Badge>
        </Link>

        <h3
          className={cn(
            'mt-3 font-sans leading-snug font-bold text-ink-900 transition-colors duration-300 group-hover:text-brand-800',
            horizontal ? 'text-xl sm:text-2xl' : 'text-lg',
          )}
        >
          <Link href={`/blog/${post.slug}`} className="before:absolute before:inset-0">
            {post.title}
          </Link>
        </h3>

        <p
          className={cn(
            'mt-2.5 leading-relaxed text-ink-500',
            horizontal ? 'text-base' : 'line-clamp-3 text-[0.9375rem]',
          )}
        >
          {post.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-ink-100 ring-2 ring-white">
              <Image
                src={author.avatar}
                alt=""
                fill
                sizes="36px"
                loading="lazy"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-xs font-bold text-ink-800">{author.name}</p>
              <p className="flex items-center gap-2 font-sans text-[0.6875rem] text-ink-400">
                <span>{formatDateShort(post.date)}</span>
                <span aria-hidden>·</span>
                <span>{post.readingMinutes} min read</span>
              </p>
            </div>
          </div>

          <ArrowRight
            aria-hidden
            className="size-4.5 shrink-0 text-ink-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-brand-700"
          />
        </div>
      </div>
    </Card>
  )
}
