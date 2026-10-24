'use client'

import { useRef } from 'react'
import { ArrowDown, FileText, Mail } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'motion/react'
import { useCvPreview } from '@/components/CvPreview'
import HeroOrbBackground from '@/components/HeroOrbBackground'
import { LinkedinIcon } from '@/components/icons/BrandIcons'
import { personalInfo, workExperience } from '@/data/cv-data'
import { logoRatio } from '@/lib/logos'
import { EASE_OUT, SPRING_SMOOTH, SPRING_UI } from '@/lib/motion-presets'

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}

const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: SPRING_SMOOTH,
  },
}

const letters: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.028, delayChildren: 0.12 } },
}

const letter: Variants = {
  hidden: { opacity: 0, y: '38%', scaleY: 1.2, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    scaleY: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 260, damping: 22, mass: 0.75 },
  },
}

function AnimatedWord({ text }: { text: string }) {
  return (
    <motion.span variants={letters} className="block">
      {text.split('').map((char, i) => (
        <motion.span key={`${char}-${i}`} variants={letter} className="inline-block">
          {char}
        </motion.span>
      ))}
    </motion.span>
  )
}

const CRITEO = workExperience[0]

function criteoLogoInline() {
  const height = 18
  return { width: Math.round(height * logoRatio(CRITEO.logo)), height }
}

export default function Hero() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const cv = useCvPreview()
  const criteoMark = criteoLogoInline()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Parallax: content moves faster than the backdrop.
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -160])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const backdropY = useTransform(scrollYProgress, [0, 1], [0, 90])

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden px-gutter pt-[70px] sm:pt-[74px]"
    >
      {/* Top padding matches the floating nav so content centers below it. */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        style={{ y: reduceMotion ? 0 : backdropY }}
        aria-hidden
      >
        <div
          className="streak"
          style={{
            width: '70rem',
            height: '22rem',
            top: '-6rem',
            left: '-14rem',
            opacity: 0.35,
            background:
              'radial-gradient(ellipse, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)',
            animation: reduceMotion ? 'none' : 'streak-a 18s ease-in-out infinite',
          }}
        />
        <HeroOrbBackground />
      </motion.div>

      <motion.div
        className="relative mx-auto w-full max-w-site px-1 py-2 sm:px-2"
        style={{
          y: reduceMotion ? 0 : contentY,
          opacity: reduceMotion ? 1 : contentOpacity,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-24 -inset-y-24"
          style={{
            background:
              'radial-gradient(ellipse 45% 50% at 30% 50%, color-mix(in oklab, var(--color-background) 70%, transparent), transparent 100%)',
          }}
        />
        <motion.div
          className="relative sm:mx-auto sm:max-w-[64rem]"
          variants={container}
          initial={reduceMotion ? 'visible' : 'hidden'}
          animate="visible"
        >
          <motion.div variants={rise} className="flex items-center gap-3">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-available opacity-75" />
              <span className="relative size-2 rounded-full bg-available" />
            </span>
            <span className="data-label">
              {personalInfo.location} ·{' '}
              <span className="text-primary">{personalInfo.availability}</span>{' '}
              <span aria-hidden className="normal-case">
                🤗
              </span>
            </span>
          </motion.div>

          <h1 className="mt-6 hero-name">
            <AnimatedWord text="Lilian" />
            <AnimatedWord text="Hunout" />
          </h1>

          <motion.p variants={rise} className="mt-8 text-xl text-foreground md:text-2xl">
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-2">
              <span>{personalInfo.headline}</span>
              <span className="inline-flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <img
                  src={CRITEO.logo}
                  alt="Criteo"
                  width={criteoMark.width}
                  height={criteoMark.height}
                  decoding="async"
                  className="h-[1.05em] w-auto max-w-[min(11rem,42vw)] object-contain object-left"
                  style={{ height: criteoMark.height, width: criteoMark.width }}
                />
              </span>
            </span>
          </motion.p>

          <motion.p
            variants={rise}
            className="mt-3 font-mono text-sm text-muted-foreground md:text-ui"
          >
            {personalInfo.tagline}{' '}
            <span aria-hidden className="whitespace-nowrap">
              🚀🔥
            </span>
          </motion.p>

          <motion.div variants={rise} className="mt-10 flex flex-wrap items-center gap-3">
            <motion.button
              type="button"
              onClick={cv.open}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_UI}
              className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-cta sm:flex-none"
            >
              <FileText className="size-4" aria-hidden />
              View CV
            </motion.button>
            <motion.a
              href={`mailto:${personalInfo.email}`}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_UI}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-muted bg-surface/60 px-5 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary sm:flex-none"
            >
              <Mail className="size-4" aria-hidden />
              Get in touch
            </motion.a>

            <div className="-ml-3 flex w-full items-center gap-3 sm:ml-0 sm:w-auto">
              <span aria-hidden className="mx-1 hidden h-6 w-px bg-muted sm:block" />
              <motion.a
                href={personalInfo.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn profile"
                whileHover={reduceMotion ? undefined : { y: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={SPRING_UI}
                className="rounded-full p-3 text-muted-foreground ring-1 ring-transparent transition-colors hover:text-primary hover:ring-muted"
              >
                <LinkedinIcon className="size-5" />
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Timeline spine lead-in; mirrors <Timeline>'s container so both align on x. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 px-gutter">
        <div className="relative mx-auto max-w-site">
          <motion.div
            className="absolute bottom-0 left-0 w-px bg-gradient-to-b from-transparent to-primary/60 md:left-28"
            initial={reduceMotion ? { height: 104 } : { height: 0 }}
            animate={{ height: 104 }}
            transition={{ duration: 0.85, delay: 0.55, ease: EASE_OUT }}
          />
        </div>
      </div>

      <motion.div
        aria-hidden
        className="absolute right-5 bottom-8 text-muted-foreground sm:right-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown className="size-5" />
        </motion.div>
      </motion.div>
    </section>
  )
}
