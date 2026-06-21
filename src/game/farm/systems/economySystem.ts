// Economy system for the English Farming Game.
//
// Pure TypeScript only — NO Phaser, NO React imports. Operates on a FarmState
// and returns a new state (immutable-ish) via `Result`. These functions never
// throw; invalid operations are reported via `{ ok: false, reason, state }`
// and leave the input state unchanged.
//
// Reuses `inventorySystem.addItem/removeItem` for all inventory mutations —
// this module never re-implements add/remove logic. Keeps `coins >= 0`.

import type { FarmState, Result } from '../types'
import { getCropById, isCropUnlocked } from '../data/crops'
import { addItem, removeItem } from './inventorySystem'

/** Default seed cost when a crop does not specify `seedCost`. */
const DEFAULT_SEED_COST = 5

/**
 * Sell 1 harvested crop (`crop:<cropId>`): `coins += sellValue`, qty -= 1.
 *
 * - Rejected (state unchanged) when the inventory has no such crop (qty <= 0).
 * - Rejected when the crop id is not a valid crop type.
 */
export function sellCrop(state: FarmState, cropId: string): Result {
  const itemId = `crop:${cropId}`
  const item = state.inventory.items.find((it) => it.itemId === itemId)
  if (!item || item.qty <= 0) {
    return { ok: false, reason: 'Không có nông sản', state }
  }

  const crop = getCropById(cropId)
  if (!crop) {
    return { ok: false, reason: 'Cây không hợp lệ', state }
  }

  const removed = removeItem(state.inventory, itemId, 1)
  if (!removed.ok) {
    return { ok: false, reason: removed.reason, state }
  }

  const next: FarmState = {
    ...state,
    coins: state.coins + crop.sellValue,
    inventory: removed.inv,
  }
  return { ok: true, state: next }
}

/**
 * Buy 1 seed (`seed:<cropId>`): requires the crop to be unlocked and the
 * player to have enough coins.
 *
 * - Rejected (state unchanged) when the crop id is invalid or still locked.
 * - Rejected when the player cannot afford the seed cost.
 * - On success: `coins -= cost` (stays >= 0 by guard) and 1 seed is added.
 */
export function buySeed(state: FarmState, cropId: string): Result {
  const crop = getCropById(cropId)
  if (!crop || !isCropUnlocked(crop, state.level, state.coins)) {
    return { ok: false, reason: 'Chưa mở khóa', state }
  }

  const cost = crop.seedCost ?? DEFAULT_SEED_COST
  if (state.coins < cost) {
    return { ok: false, reason: 'Không đủ xu', state }
  }

  const added = addItem(state.inventory, { kind: 'seed', refId: cropId, qty: 1 })
  if (!added.ok) {
    return { ok: false, reason: added.reason, state }
  }

  const next: FarmState = {
    ...state,
    coins: state.coins - cost,
    inventory: added.inv,
  }
  return { ok: true, state: next }
}
