'use client'

import dynamic from 'next/dynamic'
import { useReducedMotion } from 'motion/react'

const ParticleOrb = dynamic(() => import('@/components/ParticleOrb'), {
  ssr: false,
  loading: () => null,
})

/** Hero background: WebGL LH monogram, or a static glow under reduced motion. */
export default function HeroOrbBackground() {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_72%_42%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_70%)]"
      />
    )
  }

  return <ParticleOrb />
}
