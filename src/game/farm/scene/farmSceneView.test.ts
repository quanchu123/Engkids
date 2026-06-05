import { describe, it, expect } from 'vitest'
import {
  computeGridLayout,
  plotCenter,
  describePlot,
  isInventoryFullReason,
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
  })

  it('draws tilled soil with no crop for a tilled plot', () => {
    const plot: Plot = { id: 0, state: 'tilled', crop: null }
    const v = describePlot(plot)
    expect(v.crop).toBeNull()
    expect(v.label).toBeNull()
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
    expect(v.label).toBe(`1/${GROWTH_STAGE_MAX}`)
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
    expect(v.crop?.scale).toBe(1)
    expect(v.borderWidth).toBeGreaterThan(2)
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
