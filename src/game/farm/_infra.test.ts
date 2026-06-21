import { describe, it, expect } from 'vitest'
import {
  GRID_COLS,
  GRID_ROWS,
  SLOT_LIMIT,
  GROWTH_STAGE_MAX,
  XP_PER_CORRECT,
  XP_PER_HARVEST,
  SCHEMA_VERSION,
  STARTING_COINS,
  STARTING_SEEDS,
} from './constants'

describe('farm infrastructure sanity', () => {
  it('grid is 6x4 = 24 plots', () => {
    expect(GRID_COLS * GRID_ROWS).toBe(24)
  })

  it('exposes the expected foundational constants', () => {
    expect(SLOT_LIMIT).toBe(20)
    expect(GROWTH_STAGE_MAX).toBe(3)
    expect(XP_PER_CORRECT).toBe(10)
    expect(XP_PER_HARVEST).toBe(5)
    expect(SCHEMA_VERSION).toBe(2)
    expect(STARTING_COINS).toBe(50)
  })

  it('starts the player with valid carrot seeds', () => {
    expect(STARTING_SEEDS.length).toBeGreaterThan(0)
    const carrot = STARTING_SEEDS[0]
    expect(carrot.kind).toBe('seed')
    expect(carrot.refId).toBe('carrot')
    expect(carrot.qty).toBeGreaterThan(0)
  })
})
