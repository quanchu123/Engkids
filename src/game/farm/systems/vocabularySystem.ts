// Vocabulary system for the English Farming Game (MVP).
//
// Pure TypeScript only — NO Phaser, NO React imports. These functions operate
// on the `collectedWords` slice of FarmState and never mutate their inputs.
//
// Validates: Requirements 5.1, 5.4 (Property 5: no duplicate words; mastery in [0,5]).

import type { CollectedWord, VocabLevel } from '../types'
import { MASTERED_THRESHOLD } from '../constants'

/** Lowest mastery score a word can have. */
const MASTERY_MIN = 0
/** Highest mastery score a word can have. */
const MASTERY_MAX = 5

/** Clamp a number into the inclusive range [min, max]. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

/** Case-insensitive equality on the English word (the dedupe key). */
function sameWord(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Collect a vocabulary word, deduping by `en` case-insensitively.
 *
 * - If the word already exists: returns a NEW array where that entry's
 *   `timesSeen` is incremented by 1 (all other fields preserved).
 * - If the word is new: appends a new CollectedWord with `timesSeen: 1`,
 *   `mastery: 0`, `firstCollectedAt: new Date().toISOString()`, `timesCorrect: 0`,
 *   and `nextReviewDay: currentDay` (lịch ôn cục bộ).
 *
 * `currentDay` (mặc định 0) là ngày game hiện tại dùng để khởi tạo lịch ôn;
 * tham số optional nên caller cũ không cần thay đổi.
 *
 * Never mutates the input array (returns a fresh array, with a fresh object
 * for the changed/added entry).
 */
export function collectWord(
  words: CollectedWord[],
  w: { en: string; vi: string; level: VocabLevel },
  currentDay = 0
): CollectedWord[] {
  const index = words.findIndex((entry) => sameWord(entry.en, w.en))

  if (index >= 0) {
    // Existing word: bump timesSeen, preserve all other fields.
    return words.map((entry, i) =>
      i === index ? { ...entry, timesSeen: entry.timesSeen + 1 } : entry
    )
  }

  // New word: append a fresh CollectedWord.
  const fresh: CollectedWord = {
    en: w.en,
    vi: w.vi,
    level: w.level,
    timesSeen: 1,
    mastery: 0,
    firstCollectedAt: new Date().toISOString(),
    timesCorrect: 0,
    nextReviewDay: currentDay,
  }
  return [...words, fresh]
}

/**
 * Adjust the mastery of a word found by `en` (case-insensitive) by `delta`,
 * clamping the result into [0, 5]. Returns a NEW array. If the word is not
 * found, returns a shallow copy of the input unchanged.
 */
export function bumpMastery(
  words: CollectedWord[],
  en: string,
  delta: number
): CollectedWord[] {
  const index = words.findIndex((entry) => sameWord(entry.en, en))
  if (index < 0) {
    // Not found: return a new array copy, unchanged.
    return [...words]
  }
  return words.map((entry, i) =>
    i === index
      ? { ...entry, mastery: clamp(entry.mastery + delta, MASTERY_MIN, MASTERY_MAX) }
      : entry
  )
}

/**
 * Đếm số từ đã thuộc — `mastery >= MASTERED_THRESHOLD`.
 * Pure: không mutate input.
 */
export function countMastered(words: CollectedWord[]): number {
  return words.reduce(
    (count, entry) => (entry.mastery >= MASTERED_THRESHOLD ? count + 1 : count),
    0
  )
}

/**
 * Infer the vocabulary level of an English word.
 *
 * MVP heuristic (deterministic): the level is derived from the number of
 * letters (alphabetic characters) in the word:
 *   - <= 4 letters  -> 'beginner'
 *   - 5 to 7 letters -> 'intermediate'
 *   - > 7 letters   -> 'advanced'
 *
 * The optional `bank` parameter is reserved for a future word-bank lookup
 * (e.g. mapping known words to curated levels); it is accepted now to keep the
 * signature stable but is not used by the MVP heuristic. The default is
 * 'beginner' for empty / non-alphabetic input.
 */
export function levelOfWord(
  en: string,
  bank?: { en: string; vi: string }[]
): VocabLevel {
  void bank // reserved for future curated lookups; unused in MVP.

  const letterCount = (en.match(/[a-zA-Z]/g) ?? []).length
  if (letterCount === 0) return 'beginner'
  if (letterCount <= 4) return 'beginner'
  if (letterCount <= 7) return 'intermediate'
  return 'advanced'
}
