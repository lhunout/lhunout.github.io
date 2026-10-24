/**
 * Company and school logos are sized by area, not by bounding box.
 *
 * Wordmark ratios range from 1.78 (TalTech) to 4.92 (Criteo). In a fixed box
 * with `object-contain`, wide logos end up thin and square ones bulky. At a
 * constant area every logo carries the same optical weight:
 *
 *   area = w · h  and  w = ratio · h   ⟹   h = √(area / ratio)
 */

/** Intrinsic sizes of the files in public/logos (viewBox for SVGs). */
const INTRINSIC: Record<string, { w: number; h: number }> = {
  'criteo.svg': { w: 118, h: 24 },
  'ens-paris-saclay.png': { w: 668, h: 291 },
  'insa.svg': { w: 292, h: 61 },
  'uni_tours.svg': { w: 216.57, h: 56.27 },
  'taltech.svg': { w: 144, h: 81 },
}

/** Logo tiles: outer size, plus the area and bounds the logo is fitted into. */
export const LOGO_TILES = {
  md: { width: 120, height: 64, area: 2600, maxWidth: 96, maxHeight: 40 },
  sm: { width: 84, height: 46, area: 1250, maxWidth: 66, maxHeight: 28 },
}

export type LogoTileSize = keyof typeof LOGO_TILES

export function logoRatio(src: string): number {
  const intrinsic = INTRINSIC[src.split('/').pop() ?? '']
  return intrinsic ? intrinsic.w / intrinsic.h : 3
}

export function logoSize(src: string, tile: LogoTileSize): { width: number; height: number } {
  const { area, maxWidth, maxHeight } = LOGO_TILES[tile]
  const ratio = logoRatio(src)
  let height = Math.sqrt(area / ratio)
  let width = ratio * height

  if (width > maxWidth) {
    width = maxWidth
    height = width / ratio
  }
  if (height > maxHeight) {
    height = maxHeight
    width = height * ratio
  }

  return { width: Math.round(width), height: Math.round(height) }
}
