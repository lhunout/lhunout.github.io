export const THEME_STORAGE_KEY = 'theme'

/**
 * Runs inline in <head> before first paint: applies the stored choice, else the
 * system setting, and follows system changes until the visitor picks a theme.
 */
export const THEME_SCRIPT = `(() => {
  const root = document.documentElement
  const media = matchMedia('(prefers-color-scheme: dark)')
  const stored = () => { try { return localStorage.getItem('${THEME_STORAGE_KEY}') } catch { return null } }
  const apply = () => root.classList.toggle('dark', (stored() ?? (media.matches ? 'dark' : 'light')) === 'dark')
  apply()
  media.addEventListener('change', () => { if (!stored()) apply() })
})()`
