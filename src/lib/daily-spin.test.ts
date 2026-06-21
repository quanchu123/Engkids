import { describe, it, expect } from 'vitest';
import { SPIN_PRIZES, canSpin, rollSpinIndex, rollSpin } from './daily-spin';

describe('canSpin', () => {
  it('allows spinning when never spun before', () => {
    expect(canSpin(null, '2024-01-07')).toBe(true);
    expect(canSpin(undefined, '2024-01-07')).toBe(true);
  });

  it('blocks a second spin on the same day', () => {
    expect(canSpin('2024-01-07', '2024-01-07')).toBe(false);
  });

  it('allows spinning again on a new day', () => {
    expect(canSpin('2024-01-06', '2024-01-07')).toBe(true);
  });
});

describe('rollSpinIndex', () => {
  it('returns the first prize at rand 0', () => {
    expect(rollSpinIndex(0)).toBe(0);
  });

  it('returns a valid in-range index for the extremes', () => {
    expect(rollSpinIndex(0.999999)).toBe(SPIN_PRIZES.length - 1);
    expect(rollSpinIndex(1.5)).toBe(SPIN_PRIZES.length - 1); // clamped
    expect(rollSpinIndex(-1)).toBe(0); // clamped
  });

  it('always returns an index within the prize table', () => {
    for (let i = 0; i < 50; i++) {
      const idx = rollSpinIndex(i / 50);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(SPIN_PRIZES.length);
    }
  });

  it('maps weighted ranges correctly (first segment width)', () => {
    const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
    const firstWidth = SPIN_PRIZES[0].weight / total;
    // Just inside the first segment -> index 0; just past -> index 1.
    expect(rollSpinIndex(firstWidth - 0.001)).toBe(0);
    expect(rollSpinIndex(firstWidth + 0.001)).toBe(1);
  });
});

describe('rollSpin', () => {
  it('returns the prize object matching the index', () => {
    const { index, prize } = rollSpin(0);
    expect(index).toBe(0);
    expect(prize).toEqual(SPIN_PRIZES[0]);
  });

  it('every prize has positive amount and weight', () => {
    SPIN_PRIZES.forEach((p) => {
      expect(p.amount).toBeGreaterThan(0);
      expect(p.weight).toBeGreaterThan(0);
      expect(['coins', 'freeze']).toContain(p.kind);
    });
  });
});
