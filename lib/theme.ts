/** Resolves a color token from globals.css, for WebGL code that can't use `var()`. */
export function themeColor(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim()
}
