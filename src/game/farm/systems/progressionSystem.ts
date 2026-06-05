// Progression system (minimal) for the English Farming Game (MVP).
//
// Pure TypeScript only — NO Phaser, NO React imports.
//
// MVP scope: just enough XP/level handling to reward correct quiz answers and
// show progress on the HUD. Full level/achievement design is a later round
// (extension point). All functions are deterministic and side-effect free.

import type { FarmState } from '../types'

/**
 * XP threshold required to advance FROM `level` TO the next level.
 *
 * Formula: `100 * level`
 *   - reaching level 2 costs 100 XP (threshold at level 1)
 *   - reaching level 3 costs 200 XP (threshold at level 2)
 *   - reaching level 4 costs 300 XP (threshold at level 3), ...
 *
 * This curve is simple, deterministic, strictly increasing, and always > 0 for
 * any `level >= 1`. Non-positive levels are clamped to 1 so the threshold is
 * never zero or negative (which would otherwise cause an infinite level-up
 * loop in `addXp`).
 */
export function xpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  return 100 * safeLevel
}

/**
 * Add `amount` XP to the state, leveling up as many times as the accumulated
 * XP allows (supports multiple level-ups from a single large award).
 *
 * Rules:
 *   - Negative `amount` is clamped to 0 (a no-op award).
 *   - Returns a NEW state; the input `state` is never mutated.
 *   - While `xp >= xpForLevel(level)`, subtract that threshold and `level++`.
 *   - `xp` and `level` never go negative; `level` is kept at >= 1.
 *   - `leveledUp` is true when the level increased at least once.
 */
export function addXp(
  state: FarmState,
  amount: number,
): { state: FarmState; leveledUp: boolean } {
  // Clamp negative/NaN awards to 0 so XP can only ever increase here.
  const award = Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0

  let xp = Math.max(0, state.xp) + award
  let level = Math.max(1, state.level)
  const startLevel = level

  // Spend XP on as many level-ups as it can afford, carrying the remainder.
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level)
    level += 1
  }

  const nextState: FarmState = {
    ...state,
    xp,
    level,
  }

  return { state: nextState, leveledUp: level > startLevel }
}
