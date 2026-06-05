// Crop definitions for the English Farming Game (MVP).
//
// Pure TypeScript only — NO Phaser, NO React imports. This module is the bridge
// between gameplay (grid/plots/inventory) and learning (vocabulary): each crop
// maps a plantable type to an English/Vietnamese word pair, a difficulty level,
// growth duration, sell value, and the asset keys used for rendering/icons.
//
// `seedKey` follows the same composite convention as `STARTING_SEEDS` in
// `constants.ts` (`seed:<id>`). `spriteKey` equals the farm icon name (which is
// also the crop id), so `farmIconSrc(crop.spriteKey)` resolves to the matching
// downloaded asset (with emoji fallback handled by the caller).

import type { CropType } from '../types'

/**
 * The 6 MVP crops. `sellValue` scales loosely with `growthDays` (longer to grow
 * → worth more), kept as sensible round numbers for a children's game.
 */
export const CROPS: CropType[] = [
  {
    id: 'carrot',
    en: 'Carrot',
    vi: 'Cà rốt',
    level: 'beginner',
    growthDays: 3,
    sellValue: 8,
    seedKey: 'seed:carrot',
    spriteKey: 'carrot',
  },
  {
    id: 'tomato',
    en: 'Tomato',
    vi: 'Cà chua',
    level: 'beginner',
    growthDays: 3,
    sellValue: 10,
    seedKey: 'seed:tomato',
    spriteKey: 'tomato',
  },
  {
    id: 'corn',
    en: 'Corn',
    vi: 'Ngô',
    level: 'beginner',
    growthDays: 4,
    sellValue: 14,
    seedKey: 'seed:corn',
    spriteKey: 'corn',
  },
  {
    id: 'pumpkin',
    en: 'Pumpkin',
    vi: 'Bí ngô',
    level: 'intermediate',
    growthDays: 5,
    sellValue: 20,
    seedKey: 'seed:pumpkin',
    spriteKey: 'pumpkin',
  },
  {
    id: 'strawberry',
    en: 'Strawberry',
    vi: 'Dâu tây',
    level: 'intermediate',
    growthDays: 4,
    sellValue: 16,
    seedKey: 'seed:strawberry',
    spriteKey: 'strawberry',
  },
  {
    id: 'potato',
    en: 'Potato',
    vi: 'Khoai tây',
    level: 'beginner',
    growthDays: 3,
    sellValue: 9,
    seedKey: 'seed:potato',
    spriteKey: 'potato',
  },
]

/** Lookup of crop definitions by id, built once from `CROPS`. */
export const CROP_BY_ID: Record<string, CropType> = CROPS.reduce(
  (acc, crop) => {
    acc[crop.id] = crop
    return acc
  },
  {} as Record<string, CropType>,
)

/** Returns the crop definition for the given id, or `undefined` if unknown. */
export function getCropById(id: string): CropType | undefined {
  return CROP_BY_ID[id]
}
