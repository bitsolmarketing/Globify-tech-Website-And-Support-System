'use client'

import { LazyMotion, domAnimation } from 'framer-motion'

/**
 * Loads only the DOM animation feature set (~60% smaller than the full
 * `motion` bundle). `strict` makes any accidental `motion.*` usage throw in
 * development so the saving can never be silently lost.
 *
 * Children are passed through from server components and stay server-rendered.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
