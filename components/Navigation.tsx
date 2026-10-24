'use client'

import { useRef, useState } from 'react'
import { Menu, Moon, Sun, X } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'motion/react'
import { useLenis } from 'lenis/react'
import { useCvPreview } from '@/components/CvPreview'
import { EASE_OUT, SPRING_SMOOTH, SPRING_SNAPPY } from '@/lib/motion-presets'
import { toggleTheme, useTheme } from '@/lib/theme'

const NAV_ITEMS = [
  { name: 'Home', href: '#home' },
  { name: 'Work', href: '#work' },
  { name: 'Experience', href: '#experience' },
  { name: 'Education', href: '#education' },
]

function ThemeToggle() {
  const theme = useTheme()
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground"
    >
      {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  )
}

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [active, setActive] = useState('#home')
  const [condensed, setCondensed] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const reduceMotion = useReducedMotion()

  // Undefined when Lenis isn't mounted (reduced motion); fall back to native scroll.
  const lenis = useLenis()
  const cv = useCvPreview()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => {
    setCondensed(y > 40)

    // Hide on scroll down, show on scroll up.
    if (reduceMotion || isOpen) {
      setHidden(false)
      lastScrollY.current = y
      return
    }
    if (y < 72) {
      setHidden(false)
    } else if (y > lastScrollY.current + 8) {
      setHidden(true)
    } else if (y < lastScrollY.current - 8) {
      setHidden(false)
    }
    lastScrollY.current = y
  })

  // Active section = last one whose top is above mid-viewport. Driven by scroll
  // rather than IntersectionObserver to stay in sync with Lenis inertia.
  useMotionValueEvent(scrollY, 'change', () => {
    const middle = window.innerHeight / 2
    const current = NAV_ITEMS.filter((item) => {
      const el = document.querySelector(item.href)
      return el ? el.getBoundingClientRect().top <= middle : false
    }).at(-1)
    if (current) setActive(current.href)
  })

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const element = document.querySelector(href)
    if (!element) return

    setIsOpen(false)
    setActive(href)

    // Keeps the target clear of the floating nav.
    const offset = -96

    if (lenis) {
      lenis.scrollTo(element as HTMLElement, { offset })
      return
    }

    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY + offset,
      behavior: 'smooth',
    })
  }

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: hidden ? -120 : 0, opacity: 1 }}
      transition={reduceMotion ? { duration: 0.3 } : { ...SPRING_SMOOTH, delay: 0.05 }}
      className="fixed top-0 right-0 left-0 z-50 flex justify-center px-gutter pt-4 sm:pt-5"
    >
      <motion.nav
        animate={{
          paddingLeft: condensed ? 16 : 20,
          paddingRight: condensed ? 8 : 10,
        }}
        transition={SPRING_SNAPPY}
        className="flex w-full max-w-site items-center justify-between gap-6 rounded-2xl glass py-2"
      >
        <a
          href="#home"
          onClick={(e) => handleNavClick(e, '#home')}
          className="shrink-0 py-1.5 text-brand leading-5 font-semibold tracking-tight text-foreground"
        >
          Lilian Hunout
        </a>

        <div className="hidden items-center gap-8 sm:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1.5 text-ui leading-5 transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    aria-hidden
                    className="absolute inset-x-0 -bottom-0.5 h-px bg-primary"
                    transition={SPRING_SNAPPY}
                  />
                )}
                {item.name}
              </a>
            )
          })}

          <ThemeToggle />
          <button
            type="button"
            onClick={cv.open}
            className="shrink-0 rounded-xl bg-foreground px-4 py-2 text-ui leading-5 font-medium text-background transition-colors hover:bg-primary"
          >
            View CV
          </button>
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-xl p-2 text-foreground transition-colors hover:bg-primary/10"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="absolute top-full right-5 left-5 mt-2 rounded-2xl glass p-2 sm:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  active === item.href
                    ? 'bg-primary/12 text-foreground'
                    : 'text-muted-foreground hover:bg-primary/8 hover:text-foreground'
                }`}
              >
                {item.name}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                cv.open()
              }}
              className="mt-1 block w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground"
            >
              View CV
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
