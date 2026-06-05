// Foundational constants for the English Farming Game (MVP).
//
// Pure TypeScript only — NO Phaser, NO React imports.

import type { InventoryItem } from './types'

/** Farm grid dimensions: 6 columns x 4 rows = 24 plots. */
export const GRID_COLS = 6
export const GRID_ROWS = 4

/** Maximum number of distinct inventory slots. */
export const SLOT_LIMIT = 20

/** Highest growth stage a crop can reach (mature). */
export const GROWTH_STAGE_MAX = 3

/** XP awarded for a correct quiz answer. */
export const XP_PER_CORRECT = 10

/** XP awarded for harvesting a crop. */
export const XP_PER_HARVEST = 5

/** Save payload schema version. */
export const SCHEMA_VERSION = 1

/** Coins the player starts a fresh game with. */
export const STARTING_COINS = 50

/** Seeds granted to a new player at the start of a fresh game. */
export const STARTING_SEEDS: InventoryItem[] = [
  { itemId: 'seed:carrot', kind: 'seed', refId: 'carrot', qty: 3 },
]
