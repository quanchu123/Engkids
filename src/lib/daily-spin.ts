/**
 * Daily lucky-wheel logic — pure & testable (no React, no storage).
 *
 * Once per day the child can spin a wheel for a small reward (coins or a
 * streak-freeze token). Keeping the prize table + roll + eligibility check here
 * lets the store stay thin and lets us unit-test the randomness boundaries.
 */

export type SpinPrizeKind = 'coins' | 'freeze';

export interface SpinPrize {
  kind: SpinPrizeKind;
  amount: number;
  labelVi: string;
  /** Relative weight for the weighted roll (higher = more common). */
  weight: number;
  /** Tailwind-ish tint used by the wheel segment. */
  color: string;
}

// The wheel segments, in display order. Small coin rewards are common; the
// freeze token and the big coin prize are rare.
export const SPIN_PRIZES: SpinPrize[] = [
  { kind: 'coins', amount: 10, labelVi: '10 xu', weight: 30, color: '#fbbf24' },
  { kind: 'coins', amount: 20, labelVi: '20 xu', weight: 24, color: '#f472b6' },
  { kind: 'coins', amount: 5, labelVi: '5 xu', weight: 30, color: '#60a5fa' },
  { kind: 'coins', amount: 50, labelVi: '50 xu', weight: 8, color: '#34d399' },
  { kind: 'freeze', amount: 1, labelVi: '1 vé giữ lửa', weight: 8, color: '#22d3ee' },
  { kind: 'coins', amount: 100, labelVi: '100 xu', weight: 3, color: '#a78bfa' },
];

/** Whether the child may spin today (never spun, or last spin was a prior day). */
export function canSpin(lastSpinDate: string | null | undefined, today: string): boolean {
  if (!lastSpinDate) return true;
  return lastSpinDate !== today;
}

/**
 * Pick a prize index using the weighted table. `rand` is injectable (defaults
 * to Math.random) for deterministic tests; expected in [0, 1).
 */
export function rollSpinIndex(rand: number = Math.random()): number {
  const total = SPIN_PRIZES.reduce((sum, p) => sum + p.weight, 0);
  // Clamp to a valid [0,1) range so out-of-range inputs never escape the table.
  const r = Math.min(Math.max(rand, 0), 0.999999) * total;
  let acc = 0;
  for (let i = 0; i < SPIN_PRIZES.length; i++) {
    acc += SPIN_PRIZES[i].weight;
    if (r < acc) return i;
  }
  return SPIN_PRIZES.length - 1;
}

/** Resolve a roll value to the prize object. */
export function rollSpin(rand?: number): { index: number; prize: SpinPrize } {
  const index = rollSpinIndex(rand);
  return { index, prize: SPIN_PRIZES[index] };
}
