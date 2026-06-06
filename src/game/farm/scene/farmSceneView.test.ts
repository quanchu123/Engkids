import { describe, it, expect } from 'vitest'
import {
  computeGridLayout,
  plotCenter,
  describePlot,
  describeGrowthStage,
  isInventoryFullReason,
  fenceBounds,
  nearestPlotIndex,
  computeBackgroundLayout,
  gridTopInset,
  fencePostXs,
  wrapValue,
  shadeColor,
  computeDecorLayout,
  farmerHome,
} from './farmSceneView'
import { GRID_COLS, GRID_ROWS, GROWTH_STAGE_MAX } from '../constants'
import type { CropType, Plot } from '../types'

const CARROT: CropType = {
  id: 'carrot',
  en: 'Carrot',
  vi: 'Cà rốt',
  level: 'beginner',
  growthDays: 3,
  sellValue: 8,
  seedKey: 'seed:carrot',
  spriteKey: 'carrot',
}

describe('computeGridLayout', () => {
  it('produces a positive tile size and centers the grid', () => {
    const layout = computeGridLayout(1000, 800, GRID_COLS, GRID_ROWS)
    expect(layout.tileSize).toBeGreaterThan(0)
    expect(layout.originX).toBeGreaterThanOrEqual(0)
    expect(layout.originY).toBeGreaterThanOrEqual(0)
  })

  it('never returns NaN or negative tiles for degenerate sizes', () => {
    const layout = computeGridLayout(0, 0, GRID_COLS, GRID_ROWS)
    expect(Number.isFinite(layout.tileSize)).toBe(true)
    expect(layout.tileSize).toBeGreaterThanOrEqual(8)
  })

  it('fits the grid inside the available width/height', () => {
    const w = 640
    const h = 480
    const layout = computeGridLayout(w, h, GRID_COLS, GRID_ROWS)
    const gridW =
      layout.tileSize * GRID_COLS + layout.gap * (GRID_COLS - 1)
    const gridH =
      layout.tileSize * GRID_ROWS + layout.gap * (GRID_ROWS - 1)
    expect(gridW).toBeLessThanOrEqual(w)
    expect(gridH).toBeLessThanOrEqual(h)
  })
})

describe('plotCenter', () => {
  it('places consecutive columns to the right by one step', () => {
    const layout = computeGridLayout(1000, 800, GRID_COLS, GRID_ROWS)
    const a = plotCenter(layout, 0, GRID_COLS)
    const b = plotCenter(layout, 1, GRID_COLS)
    expect(b.x - a.x).toBeCloseTo(layout.tileSize + layout.gap)
    expect(b.y).toBeCloseTo(a.y)
  })

  it('wraps to the next row at the end of a row', () => {
    const layout = computeGridLayout(1000, 800, GRID_COLS, GRID_ROWS)
    const first = plotCenter(layout, 0, GRID_COLS)
    const nextRow = plotCenter(layout, GRID_COLS, GRID_COLS)
    expect(nextRow.y - first.y).toBeCloseTo(layout.tileSize + layout.gap)
    expect(nextRow.x).toBeCloseTo(first.x)
  })
})

describe('describePlot', () => {
  it('draws plain soil with no crop for an empty plot', () => {
    const plot: Plot = { id: 0, state: 'empty', crop: null }
    const v = describePlot(plot)
    expect(v.crop).toBeNull()
    expect(v.label).toBeNull()
    expect(v.furrows).toBe(false)
    expect(v.wet).toBe(false)
  })

  it('draws tilled soil (with furrows) and no crop for a tilled plot', () => {
    const plot: Plot = { id: 0, state: 'tilled', crop: null }
    const v = describePlot(plot)
    expect(v.crop).toBeNull()
    expect(v.label).toBeNull()
    expect(v.furrows).toBe(true)
    expect(v.wet).toBe(false)
  })

  it('shows a small sprout for a freshly seeded crop (stage 0)', () => {
    const plot: Plot = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'carrot', stage: 0, wateredToday: false },
    }
    const v = describePlot(plot, CARROT)
    expect(v.crop?.mature).toBe(false)
    expect(v.crop?.textureName).toBe('sprout')
    expect(v.crop?.scale).toBe(0.35)
    expect(v.label).toBe(`0/${GROWTH_STAGE_MAX}`)
  })

  it('shows a growing sprout (not mature) for an early-stage crop', () => {
    const plot: Plot = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'carrot', stage: 1, wateredToday: false },
    }
    const v = describePlot(plot, CARROT)
    expect(v.crop).not.toBeNull()
    expect(v.crop?.mature).toBe(false)
    expect(v.crop?.textureName).toBe('sprout')
    expect(v.crop?.scale).toBe(0.55)
    expect(v.label).toBe(`1/${GROWTH_STAGE_MAX}`)
  })

  it('shows a bush at the pre-mature stage (stage 2)', () => {
    const plot: Plot = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'carrot', stage: 2, wateredToday: false },
    }
    const v = describePlot(plot, CARROT)
    expect(v.crop?.mature).toBe(false)
    expect(v.crop?.textureName).toBe('bush')
    expect(v.crop?.scale).toBe(0.75)
  })

  it('shows the crop sprite + highlight when mature', () => {
    const plot: Plot = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'carrot', stage: GROWTH_STAGE_MAX, wateredToday: false },
    }
    const v = describePlot(plot, CARROT)
    expect(v.crop?.mature).toBe(true)
    expect(v.crop?.textureName).toBe('carrot')
    expect(v.crop?.scale).toBe(0.95)
    expect(v.borderWidth).toBeGreaterThan(2)
  })

  it('marks the soil wet when the crop was watered today', () => {
    const dry: Plot = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'carrot', stage: 1, wateredToday: false },
    }
    const wet: Plot = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'carrot', stage: 1, wateredToday: true },
    }
    expect(describePlot(dry, CARROT).wet).toBe(false)
    expect(describePlot(wet, CARROT).wet).toBe(true)
    // wet soil reads darker than dry tilled soil
    expect(describePlot(wet, CARROT).bgColor).not.toBe(
      describePlot(dry, CARROT).bgColor,
    )
  })

  it('falls back to sprout texture when crop type is unknown', () => {
    const plot: Plot = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'mystery', stage: GROWTH_STAGE_MAX, wateredToday: false },
    }
    const v = describePlot(plot, undefined)
    expect(v.crop?.textureName).toBe('sprout')
  })
})

describe('describeGrowthStage', () => {
  it('maps each stage to the expected texture + scale', () => {
    expect(describeGrowthStage(0, CARROT)).toMatchObject({
      textureName: 'sprout',
      scale: 0.35,
    })
    expect(describeGrowthStage(1, CARROT)).toMatchObject({
      textureName: 'sprout',
      scale: 0.55,
    })
    expect(describeGrowthStage(2, CARROT)).toMatchObject({
      textureName: 'bush',
      scale: 0.75,
    })
    expect(describeGrowthStage(GROWTH_STAGE_MAX, CARROT)).toMatchObject({
      textureName: 'carrot',
      scale: 0.95,
    })
  })

  it('clamps out-of-range stages and falls back when crop type is missing', () => {
    expect(describeGrowthStage(-5, CARROT).textureName).toBe('sprout')
    expect(describeGrowthStage(99, undefined).textureName).toBe('sprout')
    expect(describeGrowthStage(99, undefined).scale).toBe(0.95)
  })
})

describe('isInventoryFullReason', () => {
  it('detects the full-inventory reason case-insensitively', () => {
    expect(isInventoryFullReason('Inventory is full')).toBe(true)
    expect(isInventoryFullReason('FULL')).toBe(true)
  })

  it('returns false for other reasons or undefined', () => {
    expect(isInventoryFullReason('Crop is not mature yet')).toBe(false)
    expect(isInventoryFullReason(undefined)).toBe(false)
  })
})

describe('fenceBounds', () => {
  it('encloses the whole grid with a non-negative margin', () => {
    const layout = computeGridLayout(1000, 800, GRID_COLS, GRID_ROWS)
    const fb = fenceBounds(layout, GRID_COLS, GRID_ROWS)
    const gridW = layout.tileSize * GRID_COLS + layout.gap * (GRID_COLS - 1)
    const gridH = layout.tileSize * GRID_ROWS + layout.gap * (GRID_ROWS - 1)

    // Fence origin sits at or outside the grid origin (expanded by the margin).
    expect(fb.x).toBeLessThanOrEqual(layout.originX)
    expect(fb.y).toBeLessThanOrEqual(layout.originY)
    // Fence is at least as large as the grid it surrounds.
    expect(fb.width).toBeGreaterThanOrEqual(gridW)
    expect(fb.height).toBeGreaterThanOrEqual(gridH)
  })

  it('respects an explicit margin', () => {
    const layout = computeGridLayout(1000, 800, GRID_COLS, GRID_ROWS)
    const fb = fenceBounds(layout, GRID_COLS, GRID_ROWS, { margin: 10 })
    expect(fb.x).toBe(layout.originX - 10)
    expect(fb.y).toBe(layout.originY - 10)
  })
})

describe('nearestPlotIndex', () => {
  it('returns the index of the plot nearest the given point', () => {
    const layout = computeGridLayout(1000, 800, GRID_COLS, GRID_ROWS)
    const c5 = plotCenter(layout, 5, GRID_COLS)
    expect(nearestPlotIndex(layout, GRID_COLS, GRID_ROWS, c5.x, c5.y)).toBe(5)
  })

  it('clamps far-away points to the closest corner plot', () => {
    const layout = computeGridLayout(1000, 800, GRID_COLS, GRID_ROWS)
    const c0 = plotCenter(layout, 0, GRID_COLS)
    expect(
      nearestPlotIndex(layout, GRID_COLS, GRID_ROWS, c0.x - 9999, c0.y - 9999),
    ).toBe(0)
  })
})

describe('computeBackgroundLayout', () => {
  it('splits the screen into ~25% sky and the rest grass', () => {
    const bg = computeBackgroundLayout(1000, 800)
    expect(bg.skyHeight).toBe(200)
    expect(bg.grassHeight).toBe(600)
    expect(bg.skyHeight + bg.grassHeight).toBe(800)
  })

  it('clamps degenerate sizes and respects a custom sky ratio', () => {
    const bg = computeBackgroundLayout(0, 0)
    expect(Number.isFinite(bg.skyHeight)).toBe(true)
    expect(bg.skyHeight).toBeGreaterThanOrEqual(0)
    const tall = computeBackgroundLayout(400, 1000, { skyRatio: 0.3 })
    expect(tall.skyHeight).toBe(300)
  })
})

describe('gridTopInset', () => {
  it('reserves room below the sky band but never less than the HUD', () => {
    expect(gridTopInset(800, 200)).toBeGreaterThanOrEqual(200)
    // tiny screens still reserve at least the HUD height
    expect(gridTopInset(120, 0)).toBeGreaterThanOrEqual(100)
  })
})

describe('fencePostXs', () => {
  it('spans the full width with evenly spaced posts', () => {
    const xs = fencePostXs(500, 50)
    expect(xs.length).toBeGreaterThan(0)
    expect(xs[0]).toBeGreaterThan(0)
    // last post reaches at/past the right edge so the row looks continuous
    expect(xs[xs.length - 1]).toBeGreaterThanOrEqual(500)
  })

  it('clamps tiny spacing so the array can never explode', () => {
    const xs = fencePostXs(100, 1)
    expect(xs.length).toBeLessThan(20)
  })
})

describe('wrapValue', () => {
  it('wraps values into [min, max)', () => {
    expect(wrapValue(12, 0, 10)).toBe(2)
    expect(wrapValue(-3, 0, 10)).toBe(7)
    expect(wrapValue(5, 0, 10)).toBe(5)
  })

  it('returns min for a degenerate range', () => {
    expect(wrapValue(5, 10, 10)).toBe(10)
  })
})

describe('shadeColor', () => {
  it('lightens toward white and darkens toward black', () => {
    expect(shadeColor(0x808080, 1)).toBe(0xffffff)
    expect(shadeColor(0x808080, -1)).toBe(0x000000)
    // amount 0 is identity
    expect(shadeColor(0x123456, 0)).toBe(0x123456)
  })

  it('keeps channels within 0..255', () => {
    const c = shadeColor(0xffffff, 0.5)
    expect((c >> 16) & 0xff).toBeLessThanOrEqual(255)
    expect(c & 0xff).toBeGreaterThanOrEqual(0)
  })
})

describe('computeDecorLayout', () => {
  it('places scenery inside the screen with positive sizes', () => {
    const bg = computeBackgroundLayout(1000, 800)
    const decor = computeDecorLayout(bg)
    expect(decor.sun.x).toBeLessThanOrEqual(1000)
    expect(decor.sun.size).toBeGreaterThan(0)
    expect(decor.clouds.length).toBe(2)
    expect(decor.fence.xs.length).toBeGreaterThan(0)
    expect(decor.fence.y).toBe(bg.skyHeight)
    // barn/tree sit on the grass, below the sky seam
    expect(decor.barn.y).toBeGreaterThan(bg.skyHeight)
    expect(decor.tree.y).toBeGreaterThan(bg.skyHeight)
  })
})

describe('farmerHome', () => {
  it('stands the farmer on the grass, left of center', () => {
    const bg = computeBackgroundLayout(1000, 800)
    const home = farmerHome(bg)
    expect(home.x).toBeLessThan(500)
    expect(home.y).toBeGreaterThan(bg.skyHeight)
    expect(home.size).toBeGreaterThan(0)
  })
})
