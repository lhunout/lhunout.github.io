/** Shared springs and easing so motion feels consistent site-wide. */

export const SPRING_SMOOTH = { type: 'spring' as const, stiffness: 200, damping: 18, mass: 1 }

export const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 380, damping: 32, mass: 0.85 }

export const SPRING_UI = { type: 'spring' as const, stiffness: 400, damping: 22 }

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
