'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { LOGO_BOX_HEIGHT, LOGO_BOX_WIDTH, logoSize } from '@/lib/logos'
import { SPRING_SMOOTH, SPRING_SNAPPY } from '@/lib/motion-presets'

/**
 * Vertical timeline whose gradient spine is revealed on scroll. The fill uses
 * `clipPath` rather than `scaleY` so the gradient is uncovered, not squashed.
 */

const SPINE_POSITION = 'left-0 md:left-28'

/** First year in a CV period ("Apr. 2024 - Current"), or the raw string if none. */
export function startYear(period: string): string {
  return period.match(/\d{4}/)?.[0] ?? period
}

export function Timeline({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 80%', 'end 60%'],
  })

  // Clips from the bottom: X goes from 100% to 0% as the section scrolls by.
  const clipPath = useTransform(scrollYProgress, (v) => `inset(0 0 ${(1 - v) * 100}% 0)`)

  return (
    <div ref={containerRef} className="relative">
      <div aria-hidden className={`absolute ${SPINE_POSITION} top-0 bottom-0 w-px bg-muted`} />

      <motion.div
        aria-hidden
        style={{
          clipPath: reduceMotion ? 'inset(0 0 0% 0)' : clipPath,
          backgroundImage:
            'linear-gradient(to bottom, var(--color-spine-hot), var(--color-spine-mid) 55%, var(--color-spine-cold))',
        }}
        className={`absolute ${SPINE_POSITION} top-0 bottom-0 w-px`}
      />

      {/* Looping beam so the spine feels alive even when idle. */}
      {!reduceMotion && (
        <div
          aria-hidden
          className={`absolute ${SPINE_POSITION} top-0 bottom-0 w-px overflow-hidden`}
        >
          <div
            className="absolute inset-x-0 h-24"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--color-accent), transparent)',
              filter: 'blur(0.5px)',
              animation: 'beam-fall 4.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              ['--beam-travel' as string]: '100vh',
            }}
          />
        </div>
      )}

      <div className="space-y-14 md:space-y-20">{children}</div>
    </div>
  )
}

type TimelineItemProps = {
  year: string
  children: ReactNode
  /** Rendered inside a parent item (e.g. exchange during a degree). */
  nested?: boolean
}

export function TimelineItem({ year, children, nested = false }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px -15% 0px' })
  const reduceMotion = useReducedMotion()

  if (nested) {
    return (
      <div ref={ref} className="relative pl-6 md:pl-8">
        <div aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-muted" />
        <div aria-hidden className="absolute top-5 left-0 h-px w-4 bg-muted md:w-6" />
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, x: -12 }}
          animate={inView ? { opacity: 1, x: 0 } : undefined}
          transition={SPRING_SMOOTH}
        >
          <span className="mb-2 block data-label">{year}</span>
          {children}
        </motion.div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative pl-8 md:grid md:grid-cols-[7rem_1fr] md:gap-10 md:pl-0">
      <div className="md:pr-10 md:text-right">
        <motion.span
          className="data-label"
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : undefined}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {year}
        </motion.span>
      </div>

      <motion.div
        aria-hidden
        className={`absolute ${SPINE_POSITION} top-1.5 size-3 -translate-x-1/2 rounded-full bg-primary`}
        style={{
          outline: '4px solid var(--color-background)',
          animation: reduceMotion || !inView ? 'none' : 'node-pulse 2.6s ease-out infinite',
        }}
        initial={reduceMotion ? undefined : { scale: 0 }}
        animate={inView ? { scale: 1 } : undefined}
        transition={SPRING_SNAPPY}
      />

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 36, scale: 0.98, filter: 'blur(6px)' }}
        animate={inView ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' } : undefined}
        transition={SPRING_SMOOTH}
      >
        {children}
      </motion.div>
    </div>
  )
}

export function SectionHeading({ eyebrow, title }: { eyebrow?: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduceMotion = useReducedMotion()
  const words = title.split(' ')

  return (
    <div ref={ref} className="mb-14 md:mb-20">
      {eyebrow && (
        <motion.span
          className="mb-3 block data-label"
          initial={reduceMotion ? undefined : { opacity: 0, x: -8 }}
          animate={inView ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.5 }}
        >
          {eyebrow}
        </motion.span>
      )}

      <h2 className="display-md text-4xl md:text-6xl">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-1">
            <motion.span
              className="inline-block"
              initial={reduceMotion ? undefined : { y: '110%' }}
              animate={inView ? { y: 0 } : undefined}
              transition={{
                ...SPRING_SMOOTH,
                delay: 0.05 * i,
              }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 && <span>&nbsp;</span>}
          </span>
        ))}
      </h2>
    </div>
  )
}

export function TimelineCard({
  logo,
  logoAlt,
  heading,
  meta,
  location,
  children,
}: {
  logo?: string
  logoAlt: string
  heading: string
  meta: string
  location: string
  children: ReactNode
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative rounded-lg card-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-primary/45 hover:shadow-card-hover md:p-7"
    >
      {/* Stacked on mobile so long school names keep room next to the logo. */}
      <header className="relative flex flex-col gap-3 border-b border-muted pb-5 sm:flex-row sm:items-start sm:gap-4">
        {/* Fixed-width box aligns all headings; the logo itself is sized to a
            constant optical area (lib/logos.ts) since aspect ratios vary widely. */}
        {logo && (
          <div
            className="flex shrink-0 items-center justify-start"
            style={{ width: LOGO_BOX_WIDTH, height: LOGO_BOX_HEIGHT }}
          >
            <img
              src={logo}
              alt={logoAlt}
              width={logoSize(logo).width}
              height={logoSize(logo).height}
              loading="lazy"
              decoding="async"
              className="object-contain"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="display-md text-xl md:text-2xl">{heading}</h3>
          <p className="mt-1.5 data-label">
            {meta} · {location}
          </p>
        </div>
      </header>
      <div className="relative space-y-6 pt-5">{children}</div>
    </motion.article>
  )
}

export function Achievements({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
