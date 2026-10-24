'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { Download, ExternalLink, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { personalInfo } from '@/data/cv-data'

/**
 * CV preview modal, rendering the static PDF in an <iframe>. Exposed via
 * context because the nav, hero and command palette live in separate trees.
 */

const CV_PATH = '/cv.pdf'
const CV_FILENAME = 'CV_HUNOUT_Lilian.pdf'

const CvPreviewContext = createContext<{ open: () => void } | null>(null)

export function useCvPreview() {
  const context = useContext(CvPreviewContext)
  if (!context) {
    throw new Error('useCvPreview must be used within <CvPreviewProvider>')
  }
  return context
}

const NARROW_QUERY = '(max-width: 639px)'

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getNarrow() {
  return window.matchMedia(NARROW_QUERY).matches
}

/** Assume a wide screen during SSR; the client corrects it on hydration. */
function getNarrowServer() {
  return false
}

export default function CvPreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const returnFocusTo = useRef<HTMLElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const isNarrow = useSyncExternalStore(subscribeNarrow, getNarrow, getNarrowServer)

  const open = useCallback(() => {
    returnFocusTo.current = document.activeElement as HTMLElement
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    returnFocusTo.current?.focus()
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, close])

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus()
  }, [isOpen])

  return (
    <CvPreviewContext.Provider value={{ open }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              aria-label="Close CV preview"
              onClick={close}
              className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-sm"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`CV — ${personalInfo.name}`}
              className="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl glass"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-muted px-4 py-3">
                <span className="data-label">CV · {personalInfo.name}</span>
                <div className="flex items-center gap-1">
                  <a
                    href={CV_PATH}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                    New tab
                  </a>
                  <a
                    href={CV_PATH}
                    download={CV_FILENAME}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Download className="size-3.5" aria-hidden />
                    Download
                  </a>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </header>

              {isNarrow ? (
                /* Mobile browsers (notably iOS Safari) often render embedded PDFs as a blank frame. */
                <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Mobile browsers don’t reliably render embedded PDFs. Open it in a tab instead —
                    it’s two pages.
                  </p>
                  <a
                    href={CV_PATH}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Open the CV
                  </a>
                </div>
              ) : (
                <iframe
                  src={`${CV_PATH}#view=FitH`}
                  title={`CV — ${personalInfo.name}`}
                  className="h-[min(86vh,1200px)] w-full border-0 bg-secondary"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CvPreviewContext.Provider>
  )
}
