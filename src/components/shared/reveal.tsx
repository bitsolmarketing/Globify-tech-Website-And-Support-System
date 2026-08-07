'use client'

import * as React from 'react'
import { m, useReducedMotion, type Variants } from 'framer-motion'

import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSET = 28

function buildVariants(direction: Direction, distance: number, scale: number): Variants {
  const axis =
    direction === 'up'
      ? { y: distance }
      : direction === 'down'
        ? { y: -distance }
        : direction === 'left'
          ? { x: distance }
          : direction === 'right'
            ? { x: -distance }
            : {}

  return {
    hidden: { opacity: 0, scale, ...axis },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
    },
  }
}

export type RevealProps = {
  children: React.ReactNode
  className?: string
  direction?: Direction
  delay?: number
  distance?: number
  scale?: number
  /** Render as something other than a div (e.g. "li", "section"). */
  as?: 'div' | 'li' | 'section' | 'article' | 'span'
  once?: boolean
}

/**
 * Scroll-triggered entrance. Honours `prefers-reduced-motion` by rendering the
 * content immediately with no transform, which also keeps CLS at zero.
 */
export function Reveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  distance = OFFSET,
  scale = 1,
  as = 'div',
  once = true,
}: RevealProps) {
  const reduceMotion = useReducedMotion()
  const Comp = m[as]

  if (reduceMotion) {
    const Static = as
    return <Static className={className}>{children}</Static>
  }

  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.2, margin: '0px 0px -80px 0px' }}
      variants={buildVariants(direction, distance, scale)}
      transition={{ delay }}
    >
      {children}
    </Comp>
  )
}

/**
 * Staggers direct children. Pair with <RevealItem> for lists and card grids —
 * one observer for the whole group instead of one per card.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
  delay?: number
  as?: 'div' | 'ul' | 'ol' | 'section'
}) {
  const reduceMotion = useReducedMotion()
  const Comp = m[as]

  if (reduceMotion) {
    const Static = as
    return <Static className={className}>{children}</Static>
  }

  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -60px 0px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </Comp>
  )
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}

export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'li' | 'article'
}) {
  const reduceMotion = useReducedMotion()
  const Comp = m[as]

  if (reduceMotion) {
    const Static = as
    return <Static className={className}>{children}</Static>
  }

  return (
    <Comp className={className} variants={itemVariants}>
      {children}
    </Comp>
  )
}

/** Subtle vertical parallax for decorative layers. Disabled for reduced motion. */
export function Floating({
  children,
  className,
  amplitude = 12,
  duration = 7,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  amplitude?: number
  duration?: number
  delay?: number
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <m.div
      className={cn('will-change-transform', className)}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {children}
    </m.div>
  )
}
