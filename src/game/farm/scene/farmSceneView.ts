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
  /** Base soil colour of the garden bed (0xRRGGBB). Scene derives highlight/shadow. */
  bgColor: number
  /** Accent/border colour (gold when mature) (0xRRGGBB). */
  borderColor: number
  /** Border thickness (px); thicker + gold when mature. */
  borderWidth: number
  /** Whether to draw furrow lines on the soil (tilled or planted beds). */
  furrows: boolean
  /** Whether the soil is freshly watered (darker/wet tint + drop indicator). */
  wet: boolean
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

const SOIL_EMPTY = 0xb07a47 // light brown — untouched soil
const SOIL_EMPTY_BORDER = 0x8a5f37
const SOIL_TILLED = 0x7a5230 // darker brown — tilled, ready to plant
const SOIL_TILLED_BORDER = 0x5c3d22
const SOIL_WET = 0x5f3f24 // darker still — wet/just watered soil
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
      furrows: false,
      wet: false,
      crop: null,
      label: null,
    }
  }

  if (plot.state === 'tilled' || !plot.crop) {
    return {
      bgColor: SOIL_TILLED,
      borderColor: SOIL_TILLED_BORDER,
      borderWidth: 2,
      furrows: true,
      wet: false,
      crop: null,
      label: null,
    }
  }

  // planted with a crop
  const stage = Math.max(0, Math.min(plot.crop.stage, GROWTH_STAGE_MAX))
  const mature = stage >= GROWTH_STAGE_MAX
  const wet = plot.crop.wateredToday === true

  // Growth-stage visual mapping (stage 0..3, GROWTH_STAGE_MAX = 3):
  //   0 -> small sprout, 1 -> bigger sprout, 2 -> bush, 3 -> the crop's own icon.
  const visual = describeGrowthStage(stage, cropType)

  return {
    bgColor: wet ? SOIL_WET : SOIL_TILLED,
    borderColor: mature ? MATURE_BORDER : SOIL_TILLED_BORDER,
    borderWidth: mature ? 4 : 2,
    furrows: true,
    wet,
    crop: { ...visual, mature },
    label: `${stage}/${GROWTH_STAGE_MAX}`,
  }
}

/**
 * Pure stage -> sprite descriptor mapping for a growing crop. Kept separate so
 * the scene (tweens/particles) and the tests share a single source of truth for
 * "what texture + how big" each growth stage draws. `cropType` only matters at
 * the mature stage, where the crop shows its own icon (falling back to 'sprout'
 * when the crop type is unknown). Never throws.
 */
export function describeGrowthStage(
  stage: number,
  cropType?: CropType,
): { textureName: string; fallbackEmoji: string; scale: number } {
  const clamped = Math.max(0, Math.min(Math.floor(stage), GROWTH_STAGE_MAX))
  switch (clamped) {
    case 0:
      // tiny seedling just breaking the soil
      return { textureName: 'sprout', fallbackEmoji: '🌱', scale: 0.35 }
    case 1:
      // bigger sprout
      return { textureName: 'sprout', fallbackEmoji: '🌱', scale: 0.55 }
    case 2:
      // leafy bush, nearly grown
      return { textureName: 'bush', fallbackEmoji: '🌿', scale: 0.75 }
    default:
      // mature: the crop's own icon, large, ready to harvest
      return {
        textureName: cropType?.spriteKey ?? 'sprout',
        fallbackEmoji: '🌾',
        scale: 0.95,
      }
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

/** Axis-aligned rectangle in screen pixels (used for fence + character bounds). */
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Compute the fenced play area that encloses the whole plot grid, expanded by a
 * margin on every side. The Phaser scene uses this to draw the wooden fence and
 * to constrain the character so it can roam around (and between) the plots while
 * never leaving the farm. Pure math — never throws.
 */
export function fenceBounds(
  layout: GridLayout,
  cols: number,
  rows: number,
  opts: { margin?: number } = {},
): Bounds {
  const safeCols = Math.max(1, Math.floor(cols))
  const safeRows = Math.max(1, Math.floor(rows))
  const margin = Math.max(0, opts.margin ?? Math.round(layout.tileSize * 0.6))

  const gridW = layout.tileSize * safeCols + layout.gap * (safeCols - 1)
  const gridH = layout.tileSize * safeRows + layout.gap * (safeRows - 1)

  return {
    x: layout.originX - margin,
    y: layout.originY - margin,
    width: gridW + margin * 2,
    height: gridH + margin * 2,
  }
}

/**
 * Index of the plot whose center is closest to the point (x, y). Used to route a
 * keyboard "act" (Space) and tap-to-walk-then-act to the plot the character is
 * standing on/next to. Returns 0 for an empty grid; never throws.
 */
export function nearestPlotIndex(
  layout: GridLayout,
  cols: number,
  rows: number,
  x: number,
  y: number,
): number {
  const safeCols = Math.max(1, Math.floor(cols))
  const safeRows = Math.max(1, Math.floor(rows))
  const count = safeCols * safeRows

  let bestIndex = 0
  let bestDistSq = Number.POSITIVE_INFINITY
  for (let i = 0; i < count; i += 1) {
    const c = plotCenter(layout, i, safeCols)
    const dx = c.x - x
    const dy = c.y - y
    const distSq = dx * dx + dy * dy
    if (distSq < bestDistSq) {
      bestDistSq = distSq
      bestIndex = i
    }
  }
  return bestIndex
}

// --- scenery / background math (pure) ---------------------------------------

/** Geometry describing the sky band and grass field for the farm backdrop. */
export interface BackgroundLayout {
  width: number
  height: number
  /** Height (px) of the sky band; also the y of the sky/grass seam. */
  skyHeight: number
  /** Height (px) of the grass field below the sky. */
  grassHeight: number
}

/**
 * Split the screen into a top sky band (~25%) and a grass field (~75%). Inputs
 * are clamped so degenerate sizes never yield NaN/negative bands. Pure.
 */
export function computeBackgroundLayout(
  width: number,
  height: number,
  opts: { skyRatio?: number } = {},
): BackgroundLayout {
  const safeW = Math.max(1, width)
  const safeH = Math.max(1, height)
  const ratio = Math.min(0.9, Math.max(0.05, opts.skyRatio ?? 0.25))
  const skyHeight = Math.round(safeH * ratio)
  return {
    width: safeW,
    height: safeH,
    skyHeight,
    grassHeight: safeH - skyHeight,
  }
}

/**
 * Top inset to reserve for the React HUD + sky/fence band so the plot grid sits
 * on the grass below the fence line. Always leaves room for the HUD (>= 100px).
 * Pure.
 */
export function gridTopInset(height: number, skyHeight: number): number {
  const safeH = Math.max(1, height)
  const safeSky = Math.max(0, skyHeight)
  return Math.max(100, Math.round(safeSky + safeH * 0.06))
}

/**
 * Center x positions for a repeating row of fence posts spanning the full width.
 * `spacing` is clamped to a sane minimum so the array can never explode. Pure.
 */
export function fencePostXs(width: number, spacing: number): number[] {
  const safeW = Math.max(1, width)
  const step = Math.max(16, Math.floor(spacing))
  const xs: number[] = []
  for (let x = step / 2; x < safeW + step; x += step) {
    xs.push(Math.round(x))
  }
  return xs
}

/**
 * Wrap a value into the half-open range [min, max), used to loop drifting clouds
 * back to the other edge of the sky. Returns `min` for a degenerate range. Pure.
 */
export function wrapValue(value: number, min: number, max: number): number {
  const span = max - min
  if (span <= 0) return min
  let v = value
  while (v < min) v += span
  while (v >= max) v -= span
  return v
}

/**
 * Lighten (amount > 0, toward white) or darken (amount < 0, toward black) a
 * 0xRRGGBB colour by a fraction in [-1, 1]. Used to derive the 3D highlight band
 * and drop shadow of a garden bed from its single base soil colour. Pure.
 */
export function shadeColor(color: number, amount: number): number {
  const a = Math.max(-1, Math.min(1, amount))
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  const adj = (c: number): number => {
    const next = a >= 0 ? c + (255 - c) * a : c * (1 + a)
    return Math.max(0, Math.min(255, Math.round(next)))
  }
  return (adj(r) << 16) | (adj(g) << 8) | adj(b)
}

/** A placed scenery item (image) in screen pixels. */
export interface DecorItem {
  x: number
  y: number
  /** Target longest-side size in px (scene scales the source image to fit). */
  size: number
}

/** Positions for the static + animated scenery framing the farm. */
export interface DecorLayout {
  sun: DecorItem
  clouds: DecorItem[]
  fence: { y: number; size: number; xs: number[] }
  barn: DecorItem
  tree: DecorItem
  scarecrow: DecorItem
}

/**
 * Derive positions for all scenery (sun, clouds, fence row, barn, tree,
 * scarecrow) from the screen + background bands. Decor is pushed toward the
 * edges/corners so it frames the field without sitting on the plot grid. Pure —
 * the scene just creates images at these coordinates. Never throws.
 */
export function computeDecorLayout(bg: BackgroundLayout): DecorLayout {
  const { width, height, skyHeight } = bg
  const unit = Math.max(24, Math.round(Math.min(width, height) * 0.09))

  const sun: DecorItem = {
    x: Math.round(width - unit * 0.9),
    y: Math.round(skyHeight * 0.5),
    size: Math.round(unit * 1.3),
  }

  const cloudSize = Math.round(unit * 1.2)
  const clouds: DecorItem[] = [
    { x: Math.round(width * 0.2), y: Math.round(skyHeight * 0.4), size: cloudSize },
    {
      x: Math.round(width * 0.6),
      y: Math.round(skyHeight * 0.62),
      size: Math.round(cloudSize * 0.8),
    },
  ]

  const fenceSize = Math.max(20, Math.round(unit * 0.7))
  const fence = {
    y: skyHeight,
    size: fenceSize,
    xs: fencePostXs(width, fenceSize * 0.82),
  }

  const barnSize = Math.round(unit * 1.5)
  const barn: DecorItem = {
    x: Math.round(unit * 0.85),
    y: Math.round(height - barnSize * 0.5 - unit * 0.2),
    size: barnSize,
  }

  const treeSize = Math.round(unit * 1.6)
  const tree: DecorItem = {
    x: Math.round(width - unit * 0.8),
    y: Math.round(height - treeSize * 0.5 - unit * 0.1),
    size: treeSize,
  }

  const scarecrowSize = Math.round(unit * 1.1)
  const scarecrow: DecorItem = {
    x: Math.round(width - unit * 0.8),
    y: Math.round(skyHeight + scarecrowSize * 0.6),
    size: scarecrowSize,
  }

  return { sun, clouds, fence, barn, tree, scarecrow }
}

/**
 * Home/idle position for the farmer character: standing on the grass near the
 * lower-left of the field, clear of the plot grid. Pure.
 */
export function farmerHome(
  bg: BackgroundLayout,
): { x: number; y: number; size: number } {
  const { width, height, skyHeight } = bg
  const size = Math.max(28, Math.round(Math.min(width, height) * 0.1))
  return {
    x: Math.round(width * 0.12),
    y: Math.round(skyHeight + (height - skyHeight) * 0.55),
    size,
  }
}
