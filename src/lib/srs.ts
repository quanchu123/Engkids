/**
 * SRS (Spaced Repetition System) — SM-2 core
 *
 * Pure, side-effect-free implementation of the SM-2 spaced-repetition
 * algorithm used by Engkids' vocabulary review. These helpers compute the
 * next review schedule (ease factor + interval) and the mastery level for a
 * word based on the user's self-graded quality (0-5).
 *
 * Kept dependency-free and deterministic so the core scheduling logic can be
 * unit-tested in isolation. `src/services/vocabulary.ts` imports these to
 * drive the server-side review flow (see getWordsForReview / submitReview).
 */

/**
 * SM-2 next-review calculation.
 *
 * @param easeFactor current ease factor (typically starts at 2.5)
 * @param interval   current interval in days
 * @param quality    self-graded recall quality, 0 (forgot) .. 5 (easy)
 * @returns the new ease factor (never below 1.3) and the new interval in days
 */
export function calculateNextReview(easeFactor: number, interval: number, quality: number): { newEase: number; newInterval: number } {
  const minEase = 1.3;

  // Calculate new ease factor
  let newEase = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEase < minEase) newEase = minEase;

  // Calculate new interval
  let newInterval: number;
  if (quality < 3) {
    // Failed: reset
    newInterval = 1;
  } else if (interval === 1) {
    newInterval = 1;
  } else if (interval <= 2) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEase);
  }

  return { newEase, newInterval };
}

/**
 * Derive a mastery level (0..5) from review stats.
 *
 * @param reviewCount  total number of reviews for the word
 * @param correctCount number of reviews graded as correct (quality >= 3)
 * @param interval     current interval in days
 * @returns mastery level: 0 (new) .. 5 (mastered)
 */
export function calculateMasteryLevel(reviewCount: number, correctCount: number, interval: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (reviewCount === 0) return 0; // New

  const accuracy = correctCount / reviewCount;

  if (interval >= 30 && accuracy >= 0.9) return 5; // Mastered
  if (interval >= 14 && accuracy >= 0.8) return 4; // Known
  if (interval >= 7 && accuracy >= 0.7) return 3; // Familiar
  if (reviewCount >= 3) return 2; // Reviewing
  return 1; // Learning
}
