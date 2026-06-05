// Save layer for the English Farming Game (MVP) — Requirement 11.
//
// This module is split into PURE and IMPURE parts:
//
//  - PURE (testable without browser/network): `createInitialFarmState`,
//    `serializeFarm`, `deserializeFarm`. These never touch `window`, the DOM,
//    `localStorage`, or `fetch`, so they can be unit-tested in a Node env.
//
//  - IMPURE (browser/network): `loadFarm`, `saveFarm`. These read the logged-in
//    user (Supabase) and talk to the farm save API or `localStorage`. They are
//    designed to NEVER throw: every failure path falls back to a safe default
//    (a fresh state on load, a localStorage write on save).
//
// Single source of truth: the whole game lives in one serializable `FarmState`
// object, so saving is just `JSON.stringify(state)` and loading is parse +
// validate. Corrupt / wrong-version / missing data always degrades to a fresh
// `createInitialFarmState()` rather than crashing the game.

import { getSupabaseClient } from '@/lib/auth-client'
import type { FarmState, Plot } from '../types'
import {
  GRID_COLS,
  GRID_ROWS,
  SCHEMA_VERSION,
  SLOT_LIMIT,
  STARTING_COINS,
  STARTING_SEEDS,
} from '../constants'

// --- storage / API config ---------------------------------------------------

/** localStorage key for anonymous (not-logged-in) saves, namespaced by device. */
export const storageKey = (deviceId: string): string => `engkids:farm:${deviceId}`

/** Server endpoint that persists the farm save for logged-in users (Task 8). */
const SAVE_ENDPOINT = '/api/games/farm/save'

/**
 * Resolve the device id used to namespace anonymous saves. The app does not
 * currently expose a shared device id, so we use a stable `'guest'` key. If a
 * device-id mechanism is added later, read it here and the storage key updates
 * automatically.
 */
function getDeviceId(): string {
  return 'guest'
}

// =============================================================================
// PURE functions (no browser / network) — unit tested
// =============================================================================

/** Build the default 6x4 grid of empty plots with sequential ids. */
function createInitialPlots(): Plot[] {
  const count = GRID_COLS * GRID_ROWS
  return Array.from({ length: count }, (_, id) => ({
    id,
    state: 'empty' as const,
    crop: null,
  }))
}

/**
 * Build a fresh, valid `FarmState` for a brand-new player. Also used as the
 * safe fallback whenever a save cannot be read or validated.
 */
export function createInitialFarmState(): FarmState {
  return {
    version: SCHEMA_VERSION,
    day: 1,
    coins: STARTING_COINS,
    xp: 0,
    level: 1,
    grid: {
      cols: GRID_COLS,
      rows: GRID_ROWS,
      plots: createInitialPlots(),
    },
    inventory: {
      slotLimit: SLOT_LIMIT,
      // Deep clone so callers can mutate inventory without touching the constant.
      items: STARTING_SEEDS.map((item) => ({ ...item })),
    },
    collectedWords: [],
    updatedAt: new Date().toISOString(),
  }
}

/** Serialize a `FarmState` to a JSON string for storage/transport. */
export function serializeFarm(state: FarmState): string {
  return JSON.stringify(state)
}

/**
 * Validate that an unknown value has the basic `FarmState` shape:
 * - matching `version`
 * - numeric `day`/`coins`/`xp`/`level`
 * - `grid.plots` array + numeric `grid.cols`/`grid.rows`
 * - `inventory.items` array + numeric `inventory.slotLimit`
 * - `collectedWords` array
 */
function isValidFarmState(value: unknown): value is FarmState {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>

  if (s.version !== SCHEMA_VERSION) return false
  if (typeof s.day !== 'number') return false
  if (typeof s.coins !== 'number') return false
  if (typeof s.xp !== 'number') return false
  if (typeof s.level !== 'number') return false

  const grid = s.grid as Record<string, unknown> | undefined
  if (!grid || typeof grid !== 'object') return false
  if (!Array.isArray(grid.plots)) return false
  if (typeof grid.cols !== 'number' || typeof grid.rows !== 'number') return false

  const inventory = s.inventory as Record<string, unknown> | undefined
  if (!inventory || typeof inventory !== 'object') return false
  if (!Array.isArray(inventory.items)) return false
  if (typeof inventory.slotLimit !== 'number') return false

  if (!Array.isArray(s.collectedWords)) return false

  return true
}

/**
 * Parse + validate a saved farm payload back into a `FarmState`.
 *
 * Accepts a raw JSON string (e.g. from localStorage), an already-parsed object
 * (e.g. the API's `payload`), or `null`/`undefined`. On ANY problem — null,
 * malformed JSON, wrong version, missing fields — it returns a fresh
 * `createInitialFarmState()`. It NEVER throws.
 */
export function deserializeFarm(raw: string | null | unknown): FarmState {
  try {
    if (raw == null) return createInitialFarmState()

    let parsed: unknown
    if (typeof raw === 'string') {
      if (raw.trim() === '') return createInitialFarmState()
      parsed = JSON.parse(raw)
    } else {
      parsed = raw
    }

    if (isValidFarmState(parsed)) {
      return parsed
    }
    return createInitialFarmState()
  } catch {
    // Malformed JSON or any unexpected error → safe default.
    return createInitialFarmState()
  }
}

// =============================================================================
// IMPURE helpers (browser / network) — guarded, never throw
// =============================================================================

/** True only in a browser context where localStorage is usable. */
function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

/** Read the raw saved payload from localStorage (null when absent/unavailable). */
function readLocal(): string | null {
  if (!hasWindow()) return null
  try {
    return window.localStorage.getItem(storageKey(getDeviceId()))
  } catch {
    return null
  }
}

/** Write the serialized state to localStorage; swallow any failure. */
function writeLocal(state: FarmState): void {
  if (!hasWindow()) return
  try {
    window.localStorage.setItem(storageKey(getDeviceId()), serializeFarm(state))
  } catch {
    // Quota / disabled storage — non-fatal for gameplay.
  }
}

/**
 * Resolve the current logged-in user via Supabase. Returns `null` on any error
 * (e.g. misconfigured client, offline) so callers treat the player as anonymous.
 */
async function getLoggedInUserId(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

// =============================================================================
// IMPURE public API
// =============================================================================

/**
 * Load the player's farm state.
 *
 * - Logged in  → GET the save from the server API and deserialize `payload`.
 *   If the request fails, fall back to localStorage.
 * - Anonymous  → read from localStorage.
 *
 * Any missing/corrupt data degrades to `createInitialFarmState()`. Never throws.
 */
export async function loadFarm(): Promise<FarmState> {
  try {
    const userId = await getLoggedInUserId()

    if (userId) {
      try {
        const res = await fetch(SAVE_ENDPOINT, { method: 'GET' })
        if (res.ok) {
          const data = (await res.json()) as { payload?: unknown } | null
          // payload may be a JSON object or null when there is no save yet.
          return deserializeFarm(data?.payload ?? null)
        }
        // Non-OK response → fall through to localStorage.
      } catch {
        // Network error → fall through to localStorage.
      }
    }

    return deserializeFarm(readLocal())
  } catch {
    return createInitialFarmState()
  }
}

/**
 * Persist the player's farm state.
 *
 * - Logged in  → PUT `{ payload: state }` to the server API. If the request
 *   fails, fall back to writing localStorage so progress is not lost.
 * - Anonymous  → write localStorage.
 *
 * Debouncing/throttling is the caller's responsibility (see `debounce` below);
 * this function itself is safe to call and never throws.
 */
export async function saveFarm(state: FarmState): Promise<void> {
  try {
    const userId = await getLoggedInUserId()

    if (userId) {
      try {
        const res = await fetch(SAVE_ENDPOINT, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: state }),
        })
        if (res.ok) return
        // Server rejected → fall back to localStorage.
      } catch {
        // Network error → fall back to localStorage.
      }
    }

    writeLocal(state)
  } catch {
    // Last-resort guard: never let a save error bubble into the game loop.
  }
}

/**
 * Small debounce helper for callers that want non-blocking, coalesced saves
 * (e.g. `const debouncedSave = debounce(saveFarm, 1500)`). Trailing-edge: only
 * the final call within `delayMs` runs. Lives here so the page does not have to
 * re-implement it.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  delayMs: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void fn(...args)
    }, delayMs)
  }
}
