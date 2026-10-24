'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { ReactLenis } from 'lenis/react'

/**
 * Root Lenis smooth scroll, skipped entirely under prefers-reduced-motion.
 * Don't add `scroll-behavior: smooth` to globals.css: it fights Lenis.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** Assume motion is allowed during SSR; the client corrects it on hydration. */
function getServerSnapshot() {
  return false
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const reduceMotion = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (reduceMotion) {
    return <>{children}</>
  }

  return (
    <ReactLenis
      root
      options={{ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.5, smoothWheel: true }}
    >
      {children}
    </ReactLenis>
  )
}
