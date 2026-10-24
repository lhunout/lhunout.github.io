'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MessageCircle,
  Search,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useLenis } from 'lenis/react'
import { openChat } from '@/components/ChatBot'
import { useCvPreview } from '@/components/CvPreview'
import { GithubIcon, LinkedinIcon } from '@/components/icons/BrandIcons'
import { personalInfo } from '@/data/cv-data'

/** Command palette (⌘K / Ctrl+K). */

type Command = {
  id: string
  label: string
  hint: string
  Icon: typeof Search
  run: (context: { scrollTo: (target: string) => void; openCv: () => void }) => void
}

const COMMANDS: Command[] = [
  {
    id: 'home',
    label: 'Go to top',
    hint: 'Section',
    Icon: ArrowDown,
    run: ({ scrollTo }) => scrollTo('#home'),
  },
  {
    id: 'work',
    label: 'What I build',
    hint: 'Section',
    Icon: ArrowDown,
    run: ({ scrollTo }) => scrollTo('#work'),
  },
  {
    id: 'experience',
    label: 'Where I work',
    hint: 'Section',
    Icon: ArrowDown,
    run: ({ scrollTo }) => scrollTo('#experience'),
  },
  {
    id: 'education',
    label: 'Where I studied',
    hint: 'Section',
    Icon: ArrowDown,
    run: ({ scrollTo }) => scrollTo('#education'),
  },
  {
    id: 'chat',
    label: 'Ask the AI about me',
    hint: 'Chat',
    Icon: MessageCircle,
    run: () => openChat(),
  },
  {
    id: 'cv-preview',
    label: 'Preview CV',
    hint: 'Opens in place',
    Icon: FileText,
    run: ({ openCv }) => openCv(),
  },
  {
    id: 'cv',
    label: 'Download CV',
    hint: 'File',
    Icon: Download,
    run: () => {
      const link = document.createElement('a')
      link.href = '/cv.pdf'
      link.download = 'CV_HUNOUT_Lilian.pdf'
      link.click()
    },
  },
  {
    id: 'copy-email',
    label: 'Copy email address',
    hint: personalInfo.email,
    Icon: Copy,
    run: () => {
      void navigator.clipboard?.writeText(personalInfo.email)
    },
  },
  {
    id: 'email',
    label: 'Send an email',
    hint: 'Mail',
    Icon: Mail,
    run: () => {
      window.location.href = `mailto:${personalInfo.email}`
    },
  },
  {
    id: 'github',
    label: 'Open GitHub',
    hint: 'External',
    Icon: GithubIcon as typeof Search,
    run: () => window.open(personalInfo.github, '_blank', 'noreferrer'),
  },
  {
    id: 'linkedin',
    label: 'Open LinkedIn',
    hint: 'External',
    Icon: LinkedinIcon as typeof Search,
    run: () => window.open(personalInfo.linkedin, '_blank', 'noreferrer'),
  },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const lenis = useLenis()
  const cv = useCvPreview()

  const results = COMMANDS.filter((command) =>
    `${command.label} ${command.hint}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setCursor(0)
    returnFocusTo.current?.focus()
  }, [])

  const scrollTo = useCallback(
    (target: string) => {
      const element = document.querySelector(target)
      if (!element) return
      const offset = -96
      if (lenis) {
        lenis.scrollTo(element as HTMLElement, { offset })
        return
      }
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY + offset,
        behavior: 'smooth',
      })
    },
    [lenis],
  )

  const runCommand = useCallback(
    (command: Command) => {
      close()
      // Let the close paint first so scrolling doesn't start under the overlay.
      requestAnimationFrame(() => command.run({ scrollTo, openCv: cv.open }))
    },
    [close, scrollTo, cv.open],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        returnFocusTo.current = document.activeElement as HTMLElement
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!lenis || !open) return
    lenis.stop()
    return () => lenis.start()
  }, [lenis, open])

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => (results.length ? (c + 1) % results.length : 0))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const command = results[cursor]
      if (command) runCommand(command)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close command palette"
            onClick={close}
            className="absolute inset-0 cursor-default bg-background/70 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative w-full max-w-lg overflow-hidden rounded-xl glass"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-muted px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setCursor(0)
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Jump to a section, copy an address…"
                aria-controls="command-results"
                aria-activedescendant={
                  results[cursor] ? `command-${results[cursor].id}` : undefined
                }
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <kbd className="shrink-0 rounded border border-muted px-1.5 py-0.5 font-mono text-label-sm text-muted-foreground">
                esc
              </kbd>
            </div>

            {/* data-lenis-prevent: otherwise Lenis captures the wheel and the list can't scroll. */}
            <ul
              id="command-results"
              role="listbox"
              data-lenis-prevent
              className="max-h-80 overflow-y-auto overscroll-contain p-2"
            >
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nothing matches “{query}”.
                </li>
              )}
              {results.map((command, index) => {
                const selected = index === cursor
                return (
                  <li key={command.id} role="none">
                    <button
                      type="button"
                      id={`command-${command.id}`}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setCursor(index)}
                      onClick={() => runCommand(command)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        selected ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <command.Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1">{command.label}</span>
                      <span className="data-label !text-label-xs">{command.hint}</span>
                      {command.hint === 'External' && (
                        <ExternalLink className="size-3 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
