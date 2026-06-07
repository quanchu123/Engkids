import { describe, it, expect } from 'vitest'
import {
  createInitialFarmState,
  serializeFarm,
  deserializeFarm,
} from './farmSave'
import {
  GRID_COLS,
  GRID_ROWS,
  SCHEMA_VERSION,
  SLOT_LIMIT,
  STARTING_COINS,
} from '../constants'
import type { FarmState } from '../types'

// These tests cover ONLY the PURE save functions (createInitialFarmState,
// serializeFarm, deserializeFarm). loadFarm/saveFarm need browser/network and
// are intentionally not exercised here.

/**
 * Build a mutated state from a fresh initial one: plant a crop, add an inventory
 * item, and collect a word. Exercises every array/object field of FarmState so
 * the round-trip property is meaningful.
 */
function makeMutatedState(): FarmState {
  const s = createInitialFarmState()

  // Plant something on the first plot.
  s.grid.plots[0] = {
    id: 0,
    state: 'planted',
    crop: { cropTypeId: 'carrot', stage: 2, wateredToday: true },
  }

  // Add a harvested crop to the inventory.
  s.inventory.items.push({
    itemId: 'crop:carrot',
    kind: 'crop',
    refId: 'carrot',
    qty: 4,
  })

  // Collect a word.
  s.collectedWords.push({
    en: 'Carrot',
    vi: 'Cà rốt',
    level: 'beginner',
    timesSeen: 2,
    mastery: 3,
    firstCollectedAt: new Date(0).toISOString(),
    timesCorrect: 1,
    nextReviewDay: 5,
  })

  s.day = 5
  s.coins = 120
  s.xp = 80
  s.level = 3
  s.updatedAt = new Date(1234567890).toISOString()

  return s
}

// --- createInitialFarmState shape -------------------------------------------

describe('createInitialFarmState', () => {
  it('produces GRID_COLS*GRID_ROWS plots, all empty with sequential ids', () => {
    const s = createInitialFarmState()
    expect(s.grid.cols).toBe(GRID_COLS)
    expect(s.grid.rows).toBe(GRID_ROWS)
    expect(s.grid.plots).toHaveLength(GRID_COLS * GRID_ROWS)
    s.grid.plots.forEach((plot, index) => {
      expect(plot.id).toBe(index)
      expect(plot.state).toBe('empty')
      expect(plot.crop).toBeNull()
    })
  })

  it('uses the configured slot limit, starting coins, and schema version', () => {
    const s = createInitialFarmState()
    expect(s.inventory.slotLimit).toBe(SLOT_LIMIT)
    expect(s.coins).toBe(STARTING_COINS)
    expect(s.version).toBe(SCHEMA_VERSION)
    expect(s.day).toBe(1)
    expect(s.xp).toBe(0)
    expect(s.level).toBe(1)
    expect(Array.isArray(s.collectedWords)).toBe(true)
    expect(s.collectedWords).toHaveLength(0)
  })

  it('clones STARTING_SEEDS so mutating one state does not affect a new one', () => {
    const a = createInitialFarmState()
    a.inventory.items[0].qty = 999
    const b = createInitialFarmState()
    expect(b.inventory.items[0].qty).not.toBe(999)
  })
})

// --- Property 7: round-trip + corrupt input safety --------------------------
// Validates: Requirements 11.3, 11.4

describe('Property 7: save/load round-trip is safe', () => {
  it('round-trips a fresh initial state to a deep-equal value', () => {
    const s = createInitialFarmState()
    const restored = deserializeFarm(serializeFarm(s))
    expect(restored).toEqual(s)
  })

  it('round-trips a mutated state (planted crop, inventory item, collected word)', () => {
    const s = makeMutatedState()
    const restored = deserializeFarm(serializeFarm(s))
    expect(restored).toEqual(s)
  })

  it('accepts an already-parsed object payload (as returned by the API)', () => {
    const s = makeMutatedState()
    const restored = deserializeFarm(JSON.parse(serializeFarm(s)))
    expect(restored).toEqual(s)
  })
})

describe('Property 7: corrupt input degrades to a fresh initial state without throwing', () => {
  const initial = createInitialFarmState()

  it('null → initial state', () => {
    expect(() => deserializeFarm(null)).not.toThrow()
    expect(deserializeFarm(null).version).toBe(initial.version)
    expect(deserializeFarm(null).grid.plots).toHaveLength(
      GRID_COLS * GRID_ROWS,
    )
  })

  it('empty string → initial state', () => {
    expect(() => deserializeFarm('')).not.toThrow()
    expect(deserializeFarm('').inventory.slotLimit).toBe(SLOT_LIMIT)
  })

  it('non-JSON string → initial state', () => {
    expect(() => deserializeFarm('not json')).not.toThrow()
    expect(deserializeFarm('not json').coins).toBe(STARTING_COINS)
  })

  it('JSON object with wrong version → initial state', () => {
    const wrongVersion = serializeFarm({
      ...createInitialFarmState(),
      version: SCHEMA_VERSION + 99,
    })
    expect(() => deserializeFarm(wrongVersion)).not.toThrow()
    expect(deserializeFarm(wrongVersion).version).toBe(SCHEMA_VERSION)
  })

  it('JSON object missing grid → initial state', () => {
    const broken = createInitialFarmState() as Partial<FarmState>
    delete broken.grid
    const raw = JSON.stringify(broken)
    expect(() => deserializeFarm(raw)).not.toThrow()
    expect(deserializeFarm(raw).grid.plots).toHaveLength(GRID_COLS * GRID_ROWS)
  })

  it('JSON object missing inventory → initial state', () => {
    const broken = createInitialFarmState() as Partial<FarmState>
    delete broken.inventory
    const raw = JSON.stringify(broken)
    expect(() => deserializeFarm(raw)).not.toThrow()
    expect(deserializeFarm(raw).inventory.slotLimit).toBe(SLOT_LIMIT)
  })

  it('JSON object with non-numeric coins → initial state', () => {
    const broken = { ...createInitialFarmState(), coins: 'lots' }
    const raw = JSON.stringify(broken)
    expect(() => deserializeFarm(raw)).not.toThrow()
    expect(deserializeFarm(raw).coins).toBe(STARTING_COINS)
  })
})
