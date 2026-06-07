import { describe, it, expect } from 'vitest'
import {
  till,
  plant,
  water,
  advanceDay,
  harvest,
  canPlant,
  isMature,
  type CropTypeResolver,
} from './farmingSystem'
import { GROWTH_STAGE_MAX } from '../constants'
import type { CropType, FarmState, GrowthStage } from '../types'

// --- local test fixtures ----------------------------------------------------
// Task 7 owns createInitialFarmState; we build a minimal fixture locally so the
// farming-system tests stay decoupled from the save layer.

const CARROT: CropType = {
  id: 'carrot',
  en: 'Carrot',
  vi: 'Cà rốt',
  level: 'beginner',
  growthDays: 3,
  sellValue: 10,
  seedKey: 'seed-carrot',
  spriteKey: 'crop-carrot',
}

const resolver: CropTypeResolver = (id) => (id === 'carrot' ? CARROT : undefined)

/** Build a minimal FarmState with `plotCount` empty plots and given seeds. */
function makeState(
  opts: {
    plotCount?: number
    seedQty?: number
    slotLimit?: number
    items?: FarmState['inventory']['items']
  } = {},
): FarmState {
  const { plotCount = 4, seedQty = 3, slotLimit = 20, items } = opts
  const plots = Array.from({ length: plotCount }, (_, id) => ({
    id,
    state: 'empty' as const,
    crop: null,
  }))
  const seedItems =
    items ??
    (seedQty > 0
      ? [
          {
            itemId: 'seed:carrot',
            kind: 'seed' as const,
            refId: 'carrot',
            qty: seedQty,
          },
        ]
      : [])
  return {
    version: 1,
    day: 1,
    coins: 50,
    xp: 0,
    level: 1,
    grid: { cols: 2, rows: 2, plots },
    inventory: { slotLimit, items: seedItems },
    collectedWords: [],
    unlockedCropIds: [],
    dailyQuest: { goal: 'harvest', target: 3, progress: 0, rewardCoins: 15, claimed: false, issuedDay: 1 },
    updatedAt: new Date(0).toISOString(),
  }
}

/** Grow the crop on plotId to maturity by watering + advancing days. */
function growToMature(state: FarmState, plotId: number): FarmState {
  let s = state
  for (let i = 0; i < GROWTH_STAGE_MAX; i++) {
    const w = water(s, plotId)
    expect(w.ok).toBe(true)
    s = advanceDay(w.state)
  }
  return s
}

// --- Property 1: valid plot lifecycle --------------------------------------
// Validates: Requirements 1.1, 1.2, 1.5

describe('Property 1: valid plot lifecycle (empty -> tilled -> planted -> harvest -> empty)', () => {
  it('completes the full lifecycle and returns the plot to empty', () => {
    let s = makeState()

    const tilled = till(s, 0)
    expect(tilled.ok).toBe(true)
    expect(tilled.state.grid.plots[0].state).toBe('tilled')

    const planted = plant(tilled.state, 0, 'carrot')
    expect(planted.ok).toBe(true)
    expect(planted.state.grid.plots[0].state).toBe('planted')
    expect(planted.state.grid.plots[0].crop).toMatchObject({
      cropTypeId: 'carrot',
      stage: 0,
      wateredToday: false,
    })

    s = growToMature(planted.state, 0)

    const harvested = harvest(s, 0, resolver)
    expect(harvested.ok).toBe(true)
    expect(harvested.state.grid.plots[0].state).toBe('empty')
    expect(harvested.state.grid.plots[0].crop).toBeNull()
  })

  it('cannot plant on an un-tilled (empty) plot', () => {
    const s = makeState()
    const res = plant(s, 0, 'carrot')
    expect(res.ok).toBe(false)
    expect(res.reason).toBeTruthy()
    // state unchanged
    expect(res.state.grid.plots[0].state).toBe('empty')
    expect(canPlant(s.grid.plots[0])).toBe(false)
  })

  it('cannot plant on an already-planted plot', () => {
    const tilled = till(makeState(), 0)
    const planted = plant(tilled.state, 0, 'carrot')
    expect(planted.ok).toBe(true)

    const again = plant(planted.state, 0, 'carrot')
    expect(again.ok).toBe(false)
    expect(again.state.grid.plots[0].crop?.cropTypeId).toBe('carrot')
    expect(canPlant(planted.state.grid.plots[0])).toBe(false)
  })

  it('cannot till a non-empty plot', () => {
    const tilled = till(makeState(), 0)
    expect(tilled.ok).toBe(true)
    const again = till(tilled.state, 0)
    expect(again.ok).toBe(false)
    expect(again.state.grid.plots[0].state).toBe('tilled')

    // also cannot till a planted plot
    const planted = plant(tilled.state, 0, 'carrot')
    const tillPlanted = till(planted.state, 0)
    expect(tillPlanted.ok).toBe(false)
    expect(tillPlanted.state.grid.plots[0].state).toBe('planted')
  })

  it('canPlant is true only for tilled plots', () => {
    const s = makeState()
    expect(canPlant(s.grid.plots[0])).toBe(false) // empty
    const tilled = till(s, 0)
    expect(canPlant(tilled.state.grid.plots[0])).toBe(true) // tilled
    const planted = plant(tilled.state, 0, 'carrot')
    expect(canPlant(planted.state.grid.plots[0])).toBe(false) // planted
  })

  it('decrements one seed on successful planting', () => {
    const tilled = till(makeState({ seedQty: 2 }), 0)
    const planted = plant(tilled.state, 0, 'carrot')
    expect(planted.ok).toBe(true)
    const seed = planted.state.inventory.items.find(
      (i) => i.itemId === 'seed:carrot',
    )
    expect(seed?.qty).toBe(1)
  })

  it('refuses to plant without an available seed', () => {
    const tilled = till(makeState({ seedQty: 0 }), 0)
    const planted = plant(tilled.state, 0, 'carrot')
    expect(planted.ok).toBe(false)
    expect(planted.state.grid.plots[0].state).toBe('tilled')
  })
})

// --- Property 2: growth depends on watering --------------------------------
// Validates: Requirements 1.3

describe('Property 2: growth depends on watering', () => {
  it('a watered crop gains exactly 1 stage after advanceDay', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    const watered = water(planted.state, 0)
    expect(watered.ok).toBe(true)

    const before = watered.state.grid.plots[0].crop!.stage
    const next = advanceDay(watered.state)
    expect(next.grid.plots[0].crop!.stage).toBe(before + 1)
  })

  it('an un-watered crop keeps its stage after advanceDay', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    const before = planted.state.grid.plots[0].crop!.stage
    const next = advanceDay(planted.state)
    expect(next.grid.plots[0].crop!.stage).toBe(before)
  })

  it('wateredToday resets to false after advanceDay', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    const watered = water(planted.state, 0)
    expect(watered.state.grid.plots[0].crop!.wateredToday).toBe(true)
    const next = advanceDay(watered.state)
    expect(next.grid.plots[0].crop!.wateredToday).toBe(false)
  })

  it('stage never exceeds GROWTH_STAGE_MAX even if watered repeatedly', () => {
    let s = plant(till(makeState(), 0).state, 0, 'carrot').state
    for (let i = 0; i < GROWTH_STAGE_MAX + 3; i++) {
      const w = water(s, 0)
      // once mature & still planted, watering is allowed each day; stage clamps
      s = advanceDay(w.ok ? w.state : s)
    }
    expect(s.grid.plots[0].crop!.stage).toBe(GROWTH_STAGE_MAX)
  })

  it('cannot water an already-watered crop the same day', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    const watered = water(planted.state, 0)
    const again = water(watered.state, 0)
    expect(again.ok).toBe(false)
  })

  it('isMature reflects GROWTH_STAGE_MAX', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    expect(isMature(planted.state.grid.plots[0].crop!, CARROT)).toBe(false)
    const grown = growToMature(planted.state, 0)
    expect(grown.grid.plots[0].crop!.stage).toBe(GROWTH_STAGE_MAX)
    expect(isMature(grown.grid.plots[0].crop!, CARROT)).toBe(true)
  })
})

// --- Property 3: harvest preserves item + returns word ---------------------
// Validates: Requirements 1.4, 5.1

describe('Property 3: harvest preserves item + returns word', () => {
  it('adds exactly 1 crop item, empties the plot, and returns the word', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    const mature = growToMature(planted.state, 0)

    const before =
      mature.inventory.items.find((i) => i.itemId === 'crop:carrot')?.qty ?? 0
    const res = harvest(mature, 0, resolver)

    expect(res.ok).toBe(true)
    const after =
      res.state.inventory.items.find((i) => i.itemId === 'crop:carrot')?.qty ??
      0
    expect(after).toBe(before + 1)
    expect(res.state.grid.plots[0].state).toBe('empty')
    expect(res.state.grid.plots[0].crop).toBeNull()
    expect(res.word).toEqual({ en: 'Carrot', vi: 'Cà rốt', level: 'beginner' })
  })

  it('aggregates harvested crops into a single slot', () => {
    // grow two carrots on plots 0 and 1
    let s = makeState({ seedQty: 5 })
    s = plant(till(s, 0).state, 0, 'carrot').state
    s = plant(till(s, 1).state, 1, 'carrot').state
    for (let i = 0; i < GROWTH_STAGE_MAX; i++) {
      s = water(s, 0).state
      s = water(s, 1).state
      s = advanceDay(s)
    }
    const h0 = harvest(s, 0, resolver)
    expect(h0.ok).toBe(true)
    const h1 = harvest(h0.state, 1, resolver)
    expect(h1.ok).toBe(true)

    const cropSlots = h1.state.inventory.items.filter(
      (i) => i.itemId === 'crop:carrot',
    )
    expect(cropSlots).toHaveLength(1)
    expect(cropSlots[0].qty).toBe(2)
  })

  it('harvest succeeds without a resolver but returns word undefined', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    const mature = growToMature(planted.state, 0)
    const res = harvest(mature, 0)
    expect(res.ok).toBe(true)
    expect(res.word).toBeUndefined()
    expect(res.state.grid.plots[0].state).toBe('empty')
  })

  it('refuses to harvest an immature crop', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot')
    const res = harvest(planted.state, 0, resolver)
    expect(res.ok).toBe(false)
    expect(res.state.grid.plots[0].state).toBe('planted')
  })

  it('does not remove the crop when the inventory is full', () => {
    // Fill all slots with unrelated crop items so a NEW crop:carrot slot can't open.
    const slotLimit = 2
    const fullItems = [
      { itemId: 'crop:tomato', kind: 'crop' as const, refId: 'tomato', qty: 1 },
      { itemId: 'crop:corn', kind: 'crop' as const, refId: 'corn', qty: 1 },
    ]
    // Build a state that already has a mature carrot but a full inventory.
    let s = makeState({ slotLimit, items: fullItems })
    // Manually place a mature crop (no seed needed since inventory is full).
    s.grid.plots[0] = {
      id: 0,
      state: 'planted',
      crop: { cropTypeId: 'carrot', stage: GROWTH_STAGE_MAX as GrowthStage, wateredToday: false },
    }

    const res = harvest(s, 0, resolver)
    expect(res.ok).toBe(false)
    expect(res.reason).toBeTruthy()
    // crop preserved, plot still planted
    expect(res.state.grid.plots[0].state).toBe('planted')
    expect(res.state.grid.plots[0].crop?.cropTypeId).toBe('carrot')
  })
})
