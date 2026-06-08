// Farming system for the English Farming Game (MVP) — Requirement 1.
//
// PURE TypeScript only — NO Phaser, NO React imports. Every function takes a
// `FarmState` (or `Plot`/`Crop`) and returns a NEW state without throwing.
// Invalid operations return `{ ok: false, reason, state }` with the state left
// unchanged, so callers (Phaser scene / React overlay) can show a friendly
// message instead of handling exceptions.
//
// Plot state machine: empty -> tilled -> planted -> (harvest) -> empty.
//
// Decoupling note: this module does NOT import `data/crops.ts` (owned by another
// task) nor `inventorySystem.ts` (owned by Task 3, not present yet). To resolve
// a crop's vocabulary word during `harvest`, callers pass an optional
// `cropTypeResolver`. When no resolver is supplied (or it returns undefined),
// the inventory/plot changes still succeed but `word` is returned as undefined.
// Inventory additions are performed by a small, self-contained `addCropItem`
// helper that respects `SLOT_LIMIT`; once Task 3 lands `inventorySystem`, the
// harvest path can be switched to reuse `addItem` without changing behaviour.

import type {
  Crop,
  CropType,
  FarmWeather,
  FarmState,
  GrowthStage,
  HarvestResult,
  Plot,
  Result,
} from '../types'
import { GROWTH_STAGE_MAX } from '../constants'

/** Resolves a CropType from its id. Supplied by the caller to stay decoupled. */
export type CropTypeResolver = (id: string) => CropType | undefined

export interface AdvanceDayForecast {
  weather: FarmWeather
  labelVi: string
  descriptionVi: string
}

// --- internal helpers -------------------------------------------------------

/**
 * Deep-ish clone of the parts of `FarmState` that systems mutate, so callers
 * can treat results immutably and compare against the input.
 */
function cloneState(state: FarmState): FarmState {
  return {
    ...state,
    grid: {
      ...state.grid,
      plots: state.grid.plots.map((p) => ({
        ...p,
        crop: p.crop ? { ...p.crop } : null,
      })),
    },
    inventory: {
      ...state.inventory,
      items: state.inventory.items.map((it) => ({ ...it })),
    },
    collectedWords: state.collectedWords.map((w) => ({ ...w })),
  }
}

/** Find a plot by id (plots are addressed by their grid index). */
function getPlot(state: FarmState, plotId: number): Plot | undefined {
  return state.grid.plots.find((p) => p.id === plotId)
}

/**
 * Safe inventory add for a harvested crop. Aggregates by `itemId` (no duplicate
 * slots) and refuses to open a NEW slot when the slot limit is reached.
 * Returns true on success, false when the inventory is full.
 *
 * Mutates the provided `inventory` object (already a clone in `harvest`).
 */
function addCropItem(
  inventory: FarmState['inventory'],
  cropTypeId: string,
): boolean {
  const itemId = `crop:${cropTypeId}`
  const existing = inventory.items.find((it) => it.itemId === itemId)
  if (existing) {
    existing.qty += 1
    return true
  }
  if (inventory.items.length >= inventory.slotLimit) {
    return false
  }
  inventory.items.push({ itemId, kind: 'crop', refId: cropTypeId, qty: 1 })
  return true
}

// --- public API -------------------------------------------------------------

/**
 * Till an empty plot. empty -> tilled.
 * If the plot is not empty (or missing), returns ok:false with state unchanged.
 */
export function till(state: FarmState, plotId: number): Result {
  const plot = getPlot(state, plotId)
  if (!plot) return { ok: false, reason: 'Plot not found', state }
  if (plot.state !== 'empty') {
    return { ok: false, reason: 'Plot is not empty', state }
  }
  const next = cloneState(state)
  const target = getPlot(next, plotId)!
  target.state = 'tilled'
  target.crop = null
  next.updatedAt = new Date().toISOString()
  return { ok: true, state: next }
}

/**
 * Plant a seed on a tilled plot. tilled -> planted (stage 0).
 * Requires the plot to be 'tilled' AND an inventory `seed:<cropTypeId>` with
 * qty > 0. On success decrements one seed (removing the slot when it hits 0).
 */
export function plant(
  state: FarmState,
  plotId: number,
  cropTypeId: string,
): Result {
  const plot = getPlot(state, plotId)
  if (!plot) return { ok: false, reason: 'Plot not found', state }
  if (plot.state !== 'tilled') {
    return { ok: false, reason: 'Plot must be tilled before planting', state }
  }
  const seedItemId = `seed:${cropTypeId}`
  const seed = state.inventory.items.find((it) => it.itemId === seedItemId)
  if (!seed || seed.qty <= 0) {
    return { ok: false, reason: 'No seed available', state }
  }

  const next = cloneState(state)
  const target = getPlot(next, plotId)!
  target.state = 'planted'
  target.crop = { cropTypeId, stage: 0, wateredToday: false }

  const nextSeed = next.inventory.items.find((it) => it.itemId === seedItemId)!
  nextSeed.qty -= 1
  if (nextSeed.qty <= 0) {
    next.inventory.items = next.inventory.items.filter(
      (it) => it.itemId !== seedItemId,
    )
  }
  next.updatedAt = new Date().toISOString()
  return { ok: true, state: next }
}

/**
 * Water a planted crop. planted & !wateredToday -> wateredToday = true.
 * Otherwise returns ok:false with state unchanged.
 */
export function water(state: FarmState, plotId: number): Result {
  const plot = getPlot(state, plotId)
  if (!plot) return { ok: false, reason: 'Plot not found', state }
  if (plot.state !== 'planted' || !plot.crop) {
    return { ok: false, reason: 'No crop to water', state }
  }
  if (plot.crop.wateredToday) {
    return { ok: false, reason: 'Crop already watered today', state }
  }
  const next = cloneState(state)
  const target = getPlot(next, plotId)!
  target.crop!.wateredToday = true
  next.updatedAt = new Date().toISOString()
  return { ok: true, state: next }
}

/**
 * Advance the farm by one day.
 * - day++
 * - every planted crop watered today grows by 1 stage, clamped at maturity.
 * - wateredToday is reset to false for ALL crops afterwards.
 * Crops that were NOT watered keep their current stage.
 *
 * Task 9.1 / design Property 2: operates on a clone (no input mutation) and
 * keeps the stage within 0..GROWTH_STAGE_MAX. Behaviour verified compatible
 * with the existing test suite; no changes required.
 */
export function advanceDay(state: FarmState): FarmState {
  const next = cloneState(state)
  next.day += 1
  for (const plot of next.grid.plots) {
    if (plot.state === 'planted' && plot.crop) {
      if (plot.crop.wateredToday) {
        plot.crop.stage = Math.min(
          plot.crop.stage + 1,
          GROWTH_STAGE_MAX,
        ) as GrowthStage
      }
      plot.crop.wateredToday = false
    }
  }
  next.updatedAt = new Date().toISOString()
  return next
}

export function getFarmWeather(day: number): AdvanceDayForecast {
  if (day > 0 && day % 7 === 0) {
    return {
      weather: 'sunny',
      labelVi: 'Nắng vàng',
      descriptionVi: 'Cây đã tưới lớn thêm 2 nấc.',
    }
  }
  if (day > 0 && day % 4 === 0) {
    return {
      weather: 'rain',
      labelVi: 'Mưa nhẹ',
      descriptionVi: 'Mọi cây được tưới miễn phí.',
    }
  }
  return {
    weather: 'clear',
    labelVi: 'Trời đẹp',
    descriptionVi: 'Cây đã tưới lớn như bình thường.',
  }
}

/**
 * Advance with the daily weather bonus used by the live game.
 * - rain: planted crops count as watered even if the player skipped watering
 * - sunny: watered crops gain 2 stages instead of 1
 * - clear: same growth rule as advanceDay
 */
export function advanceDayWithWeather(state: FarmState): { state: FarmState; forecast: AdvanceDayForecast } {
  const forecast = getFarmWeather(state.day)
  const next = cloneState(state)
  next.day += 1
  for (const plot of next.grid.plots) {
    if (plot.state === 'planted' && plot.crop) {
      const growsToday = plot.crop.wateredToday || forecast.weather === 'rain'
      if (growsToday) {
        const growth = forecast.weather === 'sunny' && plot.crop.wateredToday ? 2 : 1
        plot.crop.stage = Math.min(
          plot.crop.stage + growth,
          GROWTH_STAGE_MAX,
        ) as GrowthStage
      }
      plot.crop.wateredToday = false
    }
  }
  next.updatedAt = new Date().toISOString()
  return { state: next, forecast }
}

/**
 * Harvest a mature crop. planted & mature ->
 * - add 1 `crop:<cropTypeId>` to inventory (slot-limit aware),
 * - reset the plot to 'empty' (crop = null),
 * - return the vocabulary word resolved via `cropTypeResolver` (or undefined).
 *
 * If the inventory is full, returns ok:false and DOES NOT remove the crop.
 */
export function harvest(
  state: FarmState,
  plotId: number,
  cropTypeResolver?: CropTypeResolver,
): HarvestResult {
  const plot = getPlot(state, plotId)
  if (!plot) return { ok: false, reason: 'Plot not found', state }
  if (plot.state !== 'planted' || !plot.crop) {
    return { ok: false, reason: 'Nothing to harvest', state }
  }
  if (!isMature(plot.crop)) {
    return { ok: false, reason: 'Crop is not mature yet', state }
  }

  const cropTypeId = plot.crop.cropTypeId
  const next = cloneState(state)

  const added = addCropItem(next.inventory, cropTypeId)
  if (!added) {
    // Inventory full: keep the crop in place, return original state untouched.
    return { ok: false, reason: 'Inventory is full', state }
  }

  const target = getPlot(next, plotId)!
  target.state = 'empty'
  target.crop = null
  next.updatedAt = new Date().toISOString()

  const cropType = cropTypeResolver?.(cropTypeId)
  const word = cropType
    ? { en: cropType.en, vi: cropType.vi, level: cropType.level }
    : undefined

  return { ok: true, state: next, word }
}

/** True only when a plot is ready to be planted (i.e. tilled). */
export function canPlant(plot: Plot): boolean {
  return plot.state === 'tilled'
}

/**
 * A crop is mature when it has reached the maximum growth stage.
 * The optional `cropType` is accepted for signature compatibility, but maturity
 * is intentionally driven by the clamped stage to stay consistent with
 * `advanceDay` (which clamps stage at GROWTH_STAGE_MAX).
 */
export function isMature(crop: Crop, _cropType?: CropType): boolean {
  return crop.stage >= GROWTH_STAGE_MAX
}
