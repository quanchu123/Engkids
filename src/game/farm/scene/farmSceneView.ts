// Pure view-math helpers for the farm Phaser scene (Task 11).
//
// PURE TypeScript only — NO Phaser, NO React imports. These functions compute
// *how* the grid + plots should look from a `FarmState`, so the Phaser scene can
// stay a thin renderer: it asks these helpers for layout/visual descriptors and
// applies them to Phaser game objects. Keeping this math here makes it unit
// testable without standing up a Phaser canvas, and keeps all game-RULE logic in
// the systems (this module only derives presentation, never mutates state).

import type { CropType, Plot } from '../types'
import { GROWTH_STAGE_MAX } from '../constants'

/** Geometry for laying out the centered farm grid within a screen rectangle. */
export interface GridLayout {
  /** Side length (px) of one square tile. */
  tileSize: number
  /** Gap (px) between adjacent tiles. */
  gap: number
  /** Top-left x of the whole grid (px). */
  originX: number
  /** Top-left y of the whole grid (px). */
  originY: number
}

/** A presentation descriptor for a single plot, derived from its state. */
export interface PlotVisual {
  /** Fill colour of the plot tile (0xRRGGBB). */
  bgColor: number
  /** Border colour of the plot tile (0xRRGGBB). */
  borderColor: number
  /** Border thickness (px). */
  borderWidth: number
  /** Crop overlay, or null when the plot has no crop to draw. */
  crop: {
    /** Texture key to draw when available (icon manifest name). */
    textureName: string
    /** Emoji shown when the texture is missing (loaderror fallback). */
    fallbackEmoji: string
    /** Relative size factor in (0,1]; scene multiplies by tile size. */
    scale: number
    /** Whether the crop is mature (ready to harvest). */
    mature: boolean
  } | null
  /** Small growth indicator text (e.g. "1/3"), or null when not planted. */
  label: string | null
}

// --- palette (kept local so the scene has a single source for plot colours) --

const SOIL_EMPTY = 0x9b6a3b // light brown — untouched soil
const SOIL_EMPTY_BORDER = 0x6b4a2b
const SOIL_TILLED = 0x6b4423 // darker brown — tilled, ready to plant
const SOIL_TILLED_BORDER = 0x4a3018
const MATURE_BORDER = 0xfacc15 // gold highlight for harvest-ready crops

/**
 * Compute a centered grid layout for `cols x rows` tiles inside a `width x
 * height` screen, leaving padding around the edges. The tile size is chosen so
 * the whole grid fits both dimensions. Inputs are clamped so degenerate sizes
 * (0 or negative) never produce NaN/negative tiles.
 */
export function computeGridLayout(
  width: number,
  height: number,
  cols: number,
  rows: number,
  opts: { padding?: number; gap?: number; topInset?: number } = {},
): GridLayout {
  const safeW = Math.max(1, width)
  const safeH = Math.max(1, height)
  const safeCols = Math.max(1, Math.floor(cols))
  const safeRows = Math.max(1, Math.floor(rows))

  const padding = Math.max(0, opts.padding ?? 24)
  const gap = Math.max(0, opts.gap ?? 8)
  // Reserve space at the top for the React HUD so tiles never hide behind it.
  const topInset = Math.max(0, opts.topInset ?? 96)

  const availW = Math.max(1, safeW - padding * 2)
  const availH = Math.max(1, safeH - padding * 2 - topInset)

  const tileFromW = (availW - gap * (safeCols - 1)) / safeCols
  const tileFromH = (availH - gap * (safeRows - 1)) / safeRows
  const tileSize = Math.max(8, Math.floor(Math.min(tileFromW, tileFromH)))

  const gridW = tileSize * safeCols + gap * (safeCols - 1)
  const gridH = tileSize * safeRows + gap * (safeRows - 1)

  const originX = Math.round((safeW - gridW) / 2)
  const originY = Math.round(topInset + (safeH - topInset - gridH) / 2)

  return { tileSize, gap, originX, originY }
}

/** Pixel center of the tile at grid `index` (row-major), given the layout. */
export function plotCenter(
  layout: GridLayout,
  index: number,
  cols: number,
): { x: number; y: number } {
  const safeCols = Math.max(1, Math.floor(cols))
  const col = index % safeCols
  const row = Math.floor(index / safeCols)
  const step = layout.tileSize + layout.gap
  const x = layout.originX + col * step + layout.tileSize / 2
  const y = layout.originY + row * step + layout.tileSize / 2
  return { x, y }
}

/**
 * Derive a {@link PlotVisual} for a plot. `cropType` is the resolved definition
 * for the planted crop (or undefined if unknown) — passed in so this helper has
 * no dependency on the crop data module. Never throws.
 */
export function describePlot(
  plot: Plot,
  cropType?: CropType,
): PlotVisual {
  if (plot.state === 'empty') {
    return {
      bgColor: SOIL_EMPTY,
      borderColor: SOIL_EMPTY_BORDER,
      borderWidth: 2,
      crop: null,
      label: null,
    }
  }

  if (plot.state === 'tilled' || !plot.crop) {
    return {
      bgColor: SOIL_TILLED,
      borderColor: SOIL_TILLED_BORDER,
      borderWidth: 2,
      crop: null,
      label: null,
    }
  }

  // planted with a crop
  const stage = Math.max(0, Math.min(plot.crop.stage, GROWTH_STAGE_MAX))
  const mature = stage >= GROWTH_STAGE_MAX
  const textureName = mature ? cropType?.spriteKey ?? 'sprout' : 'sprout'
  const fallbackEmoji = mature ? '🌾' : '🌱'
  // 0 -> 0.4, 1 -> 0.6, 2 -> 0.8, 3 -> 1.0
  const scale = Math.min(1, 0.4 + stage * 0.2)

  return {
    bgColor: SOIL_TILLED,
    borderColor: mature ? MATURE_BORDER : SOIL_TILLED_BORDER,
    borderWidth: mature ? 4 : 2,
    crop: { textureName, fallbackEmoji, scale, mature },
    label: `${stage}/${GROWTH_STAGE_MAX}`,
  }
}

/**
 * True when the given failure reason from `harvest` indicates a full inventory,
 * so the scene can route it to `bridge.onInventoryFull()` robustly even if the
 * exact wording changes.
 */
export function isInventoryFullReason(reason: string | undefined): boolean {
  return typeof reason === 'string' && /full/i.test(reason)
}
