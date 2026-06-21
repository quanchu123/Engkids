import { describe, it, expect } from 'vitest';
import { getActiveWordIndex, splitWords } from './subtitle-karaoke';

describe('splitWords', () => {
  it('splits on whitespace and drops empties', () => {
    expect(splitWords('  hello   world ')).toEqual(['hello', 'world']);
  });

  it('returns [] for empty text', () => {
    expect(splitWords('')).toEqual([]);
  });
});

describe('getActiveWordIndex', () => {
  it('returns -1 for empty text', () => {
    expect(getActiveWordIndex('', 0, 4, 1)).toBe(-1);
  });

  it('returns -1 when currentTime is before the cue', () => {
    expect(getActiveWordIndex('one two', 10, 14, 9.9)).toBe(-1);
  });

  it('returns -1 when currentTime is after the cue', () => {
    expect(getActiveWordIndex('one two', 10, 14, 14.1)).toBe(-1);
  });

  it('returns -1 for a zero/negative duration cue', () => {
    expect(getActiveWordIndex('one two', 5, 5, 5)).toBe(-1);
  });

  it('highlights the first word at the start', () => {
    expect(getActiveWordIndex('cat dog', 0, 4, 0)).toBe(0);
  });

  it('highlights the last word near the end', () => {
    expect(getActiveWordIndex('cat dog', 0, 4, 4)).toBe(1);
  });

  it('handles a single word across the whole cue', () => {
    expect(getActiveWordIndex('hello', 0, 2, 0)).toBe(0);
    expect(getActiveWordIndex('hello', 0, 2, 2)).toBe(0);
  });

  it('gives a longer word a larger time slice', () => {
    // words: "a" (1 char) + "elephant" (8 chars) over 9s starting at 0.
    // "a" slice = 1/9 * 9 = 1s; "elephant" occupies the remaining 8s.
    const text = 'a elephant';
    expect(getActiveWordIndex(text, 0, 9, 0.5)).toBe(0); // within first 1s
    expect(getActiveWordIndex(text, 0, 9, 5)).toBe(1); // well into the long word
  });
});
