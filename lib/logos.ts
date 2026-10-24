/**
 * Company and school logos are sized by area, not by bounding box.
 *
 * Wordmark ratios range from 1.79 (TalTech) to 4.98 (Criteo). In a fixed box
 * with `object-contain`, wide logos end up thin and square ones bulky. At a
 * constant area every logo carries the same optical weight:
 *
 *   area = w · h  and  w = ratio · h   ⟹   h = √(area / ratio)
 */

/** Intrinsic sizes of the files in public/logos. */
const INTRINSIC: Record<string, { w: number; h: number }> = {
  'criteo.png': { w: 1061, h: 213 },
  'ens-paris-saclay.png': { w: 672, h: 305 },
  'insa.png': { w: 867, h: 466 },
  'uni_tours.png': { w: 1280, h: 333 },
  'taltech.png': { w: 1305, h: 731 },
}

/** Common area in px², tuned so the squarest logo (TalTech) tops out at 30px high. */
const TARGET_AREA = 1611

const MAX_WIDTH = 96
const MAX_HEIGHT = 32

export function logoSize(src: string): { width: number; height: number } {
  const intrinsic = INTRINSIC[src.split('/').pop() ?? '']
  if (!intrinsic) return { width: 72, height: 24 }

  const ratio = intrinsic.w / intrinsic.h
  let height = Math.sqrt(TARGET_AREA / ratio)
  let width = ratio * height

  if (width > MAX_WIDTH) {
    width = MAX_WIDTH
    height = width / ratio
  }
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT
    width = height * ratio
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/** Logo column size: the largest possible logo, so every row lines up. */
export const LOGO_BOX_WIDTH = MAX_WIDTH
export const LOGO_BOX_HEIGHT = MAX_HEIGHT
