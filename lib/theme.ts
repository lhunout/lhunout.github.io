import { useSyncExternalStore } from 'react'
import { THEME_STORAGE_KEY } from '@/lib/theme-script'

export type Theme = 'light' | 'dark'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

const currentTheme = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light'

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'light')
}

export function toggleTheme() {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.classList.toggle('dark', next === 'dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Private mode: the choice just won't persist.
  }
}

/** Resolves a color token from globals.css, for WebGL code that can't use `var()`. */
export function themeColor(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim()
}
