import * as React from 'react'

import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSET = 28

/** Where the reveal finishes, as a percentage of the element's entry range. */
const BASE_END = 60
/** Never let a delay push completion so late that a bottom-of-page element
 *  cannot reach it before the document runs out of scroll. */
const MAX_END = 92

/**
 * Scroll-triggered entrance animations, driven entirely by CSS scroll-driven
 * animations (`animation-timeline: view()`) rather than JavaScript.
 *
 * These were framer-motion components until now. Every one of them was a client
 * component that mounted an IntersectionObserver and animated through the main
 * thread — 42 instances on the home page alone, which is most of what held
 * Total Blocking Time at 450 ms and left seven animations non-composited.
 *
 * Nothing in this file ships JavaScript. The components are server components
 * that emit a data attribute and, where a call site has customised the motion,
 * a couple of custom properties; `globals.css` does the rest. Two properties of
 * that arrangement are worth stating because both are deliberate:
 *
 *   1. It cannot hide content. The hidden keyframe lives inside
 *      `@supports (animation-timeline: view())`, so a browser without support
 *      simply renders everything in its final state. There is no script left to
 *      fail, and so no way for a failed chunk to leave a blank page behind —
 *      which is a failure mode this site has actually suffered.
 *   2. Only `opacity` and `transform` animate, so every reveal is composited:
 *      no layout, no paint, no forced reflow.
 *
 * The props are unchanged from the framer-motion version so that all ~40 call
 * sites keep working untouched. `once` and `stagger` are now implicit in how
 * the CSS is written and are accepted but ignored.
 */

/** Custom properties are typed as plain strings; React allows them through. */
type RevealVars = React.CSSProperties & Record<`--${string}`, string>

function revealStyle(delay: number, distance: number, scale: number): RevealVars | undefined {
  const style: Record<string, string> = {}

  if (distance !== OFFSET) style['--reveal-d'] = `${distance}px`
  if (scale !== 1) style['--reveal-s'] = String(scale)
  /* A delay in seconds means nothing on a scroll timeline — progress is driven
     by the scrollbar, not the clock. The nearest honest translation is to
     finish the reveal further into the element's entry, which reads as the same
     "this one lands after that one" cascade. */
  if (delay > 0) style['--reveal-end'] = `${Math.min(MAX_END, BASE_END + delay * 40)}%`

  return Object.keys(style).length ? (style as RevealVars) : undefined
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
  /** Accepted for call-site compatibility; scroll-driven reveals are inherently
   *  tied to position rather than to a one-shot trigger. */
  once?: boolean
}

export function Reveal({
  children,
  className,
  direction = 'up',
  delay = 0,
  distance = OFFSET,
  scale = 1,
  as = 'div',
}: RevealProps) {
  const Comp = as

  return (
    <Comp className={className} data-reveal={direction} style={revealStyle(delay, distance, scale)}>
      {children}
    </Comp>
  )
}

/**
 * Staggers direct children. Pair with <RevealItem> for lists and card grids.
 *
 * The stagger is positional now: `globals.css` gives each of the first several
 * children a slightly later finishing point, so the cascade falls out of
 * `:nth-child()` without the group needing to know anything about its children.
 * That is what lets this stay a server component even when the children are
 * produced by a `.map()`.
 */
export function RevealGroup({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
  delay?: number
  as?: 'div' | 'ul' | 'ol' | 'section'
}) {
  const Comp = as

  return (
    <Comp className={className} data-reveal-group="" style={revealStyle(delay, OFFSET, 1)}>
      {children}
    </Comp>
  )
}

/**
 * A member of a <RevealGroup>. Renders a bare element — the animation is
 * applied by the parent's `> *` rule, so this exists to keep call sites
 * readable and to preserve the previous API.
 */
export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'li' | 'article'
}) {
  const Comp = as

  return <Comp className={className}>{children}</Comp>
}

/** Subtle vertical drift for decorative layers. Disabled for reduced motion. */
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
  return (
    <div
      className={cn('will-change-transform', className)}
      data-floating=""
      style={
        {
          '--float-amplitude': `${amplitude}px`,
          '--float-duration': `${duration}s`,
          '--float-delay': `${delay}s`,
        } as RevealVars
      }
    >
      {children}
    </div>
  )
}
