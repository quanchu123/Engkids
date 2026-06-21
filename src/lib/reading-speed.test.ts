import { describe, it, expect } from 'vitest';
import { readingRate } from './reading-speed';

describe('readingRate', () => {
  it('maps slow to 0.6', () => {
    expect(readingRate('slow')).toBe(0.6);
  });

  it('maps normal to 0.9', () => {
    expect(readingRate('normal')).toBe(0.9);
  });

  it('maps fast to 1.1', () => {
    expect(readingRate('fast')).toBe(1.1);
  });

  it('falls back to 0.9 for an unknown value', () => {
    // Force an invalid value to exercise the default branch.
    expect(readingRate('turbo' as unknown as 'fast')).toBe(0.9);
  });

  it('returns a positive number for every valid speed', () => {
    (['slow', 'normal', 'fast'] as const).forEach((speed) => {
      expect(readingRate(speed)).toBeGreaterThan(0);
    });
  });
});
