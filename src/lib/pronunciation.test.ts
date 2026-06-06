/**
 * Unit tests for the pure pronunciation scoring lib (`./pronunciation`).
 *
 * Uses Vitest (explicit imports). Deterministic — no DOM, no timers, no RNG.
 */

import { describe, it, expect } from 'vitest';

import {
  normalizeSpoken,
  scorePronunciation,
  PASS_THRESHOLD,
} from './pronunciation';

describe('normalizeSpoken', () => {
  it('lowercases, trims and collapses spaces', () => {
    expect(normalizeSpoken('  Hello   World  ')).toBe('hello world');
  });

  it('strips punctuation', () => {
    expect(normalizeSpoken('Hello, world!')).toBe('hello world');
    expect(normalizeSpoken('cat?')).toBe('cat');
  });

  it('returns empty string for empty/whitespace input', () => {
    expect(normalizeSpoken('')).toBe('');
    expect(normalizeSpoken('   ')).toBe('');
  });
});

describe('scorePronunciation', () => {
  it('exact match scores 100 and is correct + matched', () => {
    const r = scorePronunciation('carrot', 'carrot');
    expect(r.score).toBe(100);
    expect(r.correct).toBe(true);
    expect(r.matched).toBe(true);
  });

  it('is case- and punctuation-insensitive', () => {
    const r = scorePronunciation('Carrot', 'carrot!');
    expect(r.score).toBe(100);
    expect(r.correct).toBe(true);
    expect(r.matched).toBe(true);
  });

  it('close typo scores high but below 100', () => {
    const r = scorePronunciation('carrot', 'carot');
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.score).toBeLessThan(100);
    expect(r.matched).toBe(false);
  });

  it('totally different words score low and are not correct', () => {
    const r = scorePronunciation('elephant', 'sky');
    expect(r.score).toBeLessThan(PASS_THRESHOLD);
    expect(r.correct).toBe(false);
  });

  it('empty heard scores 0', () => {
    expect(scorePronunciation('carrot', '').score).toBe(0);
    expect(scorePronunciation('carrot', '   ').score).toBe(0);
  });

  it('empty target scores 0 (never throws)', () => {
    expect(scorePronunciation('', 'carrot').score).toBe(0);
  });

  it('matches a single-word target hidden inside a heard phrase', () => {
    // Kid says "say carrot", target is just "carrot".
    const r = scorePronunciation('carrot', 'say carrot');
    expect(r.score).toBe(100);
    expect(r.correct).toBe(true);
  });

  it('scores a multi-word phrase by whole-phrase similarity', () => {
    const exact = scorePronunciation('good morning', 'good morning');
    expect(exact.score).toBe(100);
    expect(exact.correct).toBe(true);

    const close = scorePronunciation('good morning', 'good mornin');
    expect(close.score).toBeGreaterThanOrEqual(80);
    expect(close.score).toBeLessThan(100);

    const wrong = scorePronunciation('good morning', 'banana');
    expect(wrong.correct).toBe(false);
  });

  it('does not throw on undefined-ish input via empty strings', () => {
    expect(() => scorePronunciation('', '')).not.toThrow();
    expect(scorePronunciation('', '').score).toBe(0);
  });
});
