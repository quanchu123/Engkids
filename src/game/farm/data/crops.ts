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
 * Crop catalog. The first 6 are the original MVP crops (always unlocked);
 * the rest are unlocked progressively via `unlock` and grouped by `theme`
 * (season). `sellValue` scales loosely with `growthDays` (longer to grow →
 * worth more), kept as sensible round numbers for a children's game.
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
  // --- THÊM MỚI: cây mở khóa theo cấp + theme (mùa) ---
  {
    id: 'lettuce',
    en: 'Lettuce',
    vi: 'Xà lách',
    level: 'beginner',
    growthDays: 3,
    sellValue: 11,
    seedKey: 'seed:lettuce',
    spriteKey: 'lettuce',
    seedCost: 6,
    theme: 'spring',
  },
  {
    id: 'eggplant',
    en: 'Eggplant',
    vi: 'Cà tím',
    level: 'intermediate',
    growthDays: 5,
    sellValue: 22,
    seedKey: 'seed:eggplant',
    spriteKey: 'eggplant',
    seedCost: 12,
    unlock: { minLevel: 2 },
    theme: 'summer',
  },
  {
    id: 'cabbage',
    en: 'Cabbage',
    vi: 'Bắp cải',
    level: 'intermediate',
    growthDays: 4,
    sellValue: 18,
    seedKey: 'seed:cabbage',
    spriteKey: 'cabbage',
    seedCost: 10,
    unlock: { minLevel: 2 },
    theme: 'autumn',
  },
  {
    id: 'pepper',
    en: 'Bell Pepper',
    vi: 'Ớt chuông',
    level: 'intermediate',
    growthDays: 5,
    sellValue: 20,
    seedKey: 'seed:pepper',
    spriteKey: 'pepper',
    seedCost: 11,
    unlock: { minLevel: 2 },
    theme: 'summer',
  },
  {
    id: 'watermelon',
    en: 'Watermelon',
    vi: 'Dưa hấu',
    level: 'advanced',
    growthDays: 6,
    sellValue: 30,
    seedKey: 'seed:watermelon',
    spriteKey: 'watermelon',
    seedCost: 18,
    unlock: { minLevel: 3 },
    theme: 'summer',
  },
  {
    id: 'pineapple',
    en: 'Pineapple',
    vi: 'Dứa',
    level: 'advanced',
    growthDays: 6,
    sellValue: 28,
    seedKey: 'seed:pineapple',
    spriteKey: 'pineapple',
    seedCost: 16,
    unlock: { minLevel: 3 },
    theme: 'summer',
  },
  {
    id: 'broccoli',
    en: 'Broccoli',
    vi: 'Súp lơ',
    level: 'advanced',
    growthDays: 5,
    sellValue: 24,
    seedKey: 'seed:broccoli',
    spriteKey: 'broccoli',
    seedCost: 14,
    unlock: { minLevel: 4 },
    theme: 'winter',
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

/**
 * Whether `crop` is unlocked for a player at the given `level` and `coins`.
 * A crop with no `unlock` condition is always available. Otherwise every
 * present condition (`minLevel`, `minCoins`) must be satisfied.
 */
export function isCropUnlocked(crop: CropType, level: number, coins: number): boolean {
  const u = crop.unlock
  if (!u) return true
  if (u.minLevel != null && level < u.minLevel) return false
  if (u.minCoins != null && coins < u.minCoins) return false
  return true
}

/** Crops unlocked for the player's current `level` and `coins`. */
export function getUnlockedCrops(level: number, coins: number): CropType[] {
  return CROPS.filter((c) => isCropUnlocked(c, level, coins))
}
