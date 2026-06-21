/**
 * Reading speed mapping — pure helper translating the user's reading-speed
 * preference into a Web Speech API utterance rate.
 */

export type ReadingSpeed = 'slow' | 'normal' | 'fast';

const RATE_BY_SPEED: Record<ReadingSpeed, number> = {
  slow: 0.6,
  normal: 0.9,
  fast: 1.1,
};

/**
 * Map a reading-speed preference to a speechSynthesis rate.
 * Unknown values fall back to the 'normal' rate (0.9).
 */
export function readingRate(speed: ReadingSpeed): number {
  return RATE_BY_SPEED[speed] ?? 0.9;
}
