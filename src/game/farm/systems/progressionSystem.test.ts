import { describe, it, expect } from 'vitest'
import type { FarmState } from '../types'
import { addXp, xpForLevel } from './progressionSystem'

// Minimal FarmState factory for tests — only the fields the progression system
// reads/writes matter; the rest are filled with valid defaults.
function makeState(overrides: Partial<FarmState> = {}): FarmState {
  return {
    version: 1,
    day: 1,
    coins: 0,
    xp: 0,
    level: 1,
    grid: { cols: 6, rows: 4, plots: [] },
    inventory: { slotLimit: 20, items: [] },
    collectedWords: [],
    unlockedCropIds: [],
    dailyQuest: { goal: 'harvest', target: 3, progress: 0, rewardCoins: 15, claimed: false, issuedDay: 1 },
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('xpForLevel', () => {
  it('follows the documented 100 * level curve', () => {
    expect(xpForLevel(1)).toBe(100)
    expect(xpForLevel(2)).toBe(200)
    expect(xpForLevel(3)).toBe(300)
  })

  it('is strictly increasing across a range of levels', () => {
    for (let level = 1; level < 50; level++) {
      expect(xpForLevel(level + 1)).toBeGreaterThan(xpForLevel(level))
    }
  })

  it('is always > 0 for level >= 1 (and clamps non-positive levels)', () => {
    expect(xpForLevel(1)).toBeGreaterThan(0)
    expect(xpForLevel(0)).toBeGreaterThan(0)
    expect(xpForLevel(-5)).toBeGreaterThan(0)
  })
})

describe('addXp', () => {
  it('accumulates XP below the threshold without leveling up', () => {
    const start = makeState({ xp: 10, level: 1 })
    const { state, leveledUp } = addXp(start, 30)
    expect(leveledUp).toBe(false)
    expect(state.xp).toBe(40)
    expect(state.level).toBe(1)
  })

  it('crosses the threshold: increments level and carries remainder XP', () => {
    // level 1 needs 100 XP; 90 + 30 = 120 -> level 2 with 20 carried over.
    const start = makeState({ xp: 90, level: 1 })
    const { state, leveledUp } = addXp(start, 30)
    expect(leveledUp).toBe(true)
    expect(state.level).toBe(2)
    expect(state.xp).toBe(20)
  })

  it('levels up multiple times from one large award', () => {
    // From level 1 with 0 XP: thresholds 100 (L1->L2) + 200 (L2->L3) = 300.
    // 350 XP -> level 3, remainder 50.
    const start = makeState({ xp: 0, level: 1 })
    const { state, leveledUp } = addXp(start, 350)
    expect(leveledUp).toBe(true)
    expect(state.level).toBe(3)
    expect(state.xp).toBe(50)
  })

  it('treats a zero amount as a no-op', () => {
    const start = makeState({ xp: 25, level: 2 })
    const { state, leveledUp } = addXp(start, 0)
    expect(leveledUp).toBe(false)
    expect(state.xp).toBe(25)
    expect(state.level).toBe(2)
  })

  it('treats a negative amount as a no-op (no negative xp, no level change)', () => {
    const start = makeState({ xp: 25, level: 2 })
    const { state, leveledUp } = addXp(start, -100)
    expect(leveledUp).toBe(false)
    expect(state.xp).toBe(25)
    expect(state.level).toBe(2)
    expect(state.xp).toBeGreaterThanOrEqual(0)
  })

  it('does not mutate the input state', () => {
    const start = makeState({ xp: 90, level: 1 })
    const snapshot = JSON.parse(JSON.stringify(start))
    addXp(start, 50)
    expect(start).toEqual(snapshot)
  })

  // Invariant coverage across many deterministic inputs (no external deps).
  it('keeps xp and level non-negative with level >= 1 for any award', () => {
    const xpValues = [0, 1, 50, 99, 100, 199, 1000, 12_345]
    const levels = [1, 2, 5, 10, 42]
    const amounts = [-10_000, -1, 0, 1, 25, 100, 350, 5000, 100_000]

    for (const xp of xpValues) {
      for (const level of levels) {
        for (const amount of amounts) {
          const { state, leveledUp } = addXp(makeState({ xp, level }), amount)
          expect(state.xp).toBeGreaterThanOrEqual(0)
          expect(state.level).toBeGreaterThanOrEqual(1)
          // Level can only increase, never decrease.
          expect(state.level).toBeGreaterThanOrEqual(level)
          expect(leveledUp).toBe(state.level > level)
          // Remaining xp is always below the threshold for the current level.
          expect(state.xp).toBeLessThan(xpForLevel(state.level))
        }
      }
    }
  })
})
