'use client'

import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react'

/** Top scroll progress bar, spring-smoothed to avoid jitter. */
export default function ScrollProgress() {
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  })

  if (reduceMotion) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-primary"
      style={{ scaleX }}
    />
  )
}
