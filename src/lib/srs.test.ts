/**
 * Unit tests for the SM-2 SRS core (`./srs`).
 *
 * Uses Node's built-in test runner (`node:test`) + `node:assert` so no extra
 * test framework / dependency is required (the project has no vitest/jest).
 *
 * Run with a TypeScript-aware loader (sucrase is already in node_modules):
 *   node -r sucrase/register --test "src/lib/srs.test.ts"
 *
 * These tests validate Property 2 from the design (SM-2 schedule moves in the
 * right direction, ease floor, mastery bounds).
 *
 * Validates: Requirements 3.2, 3.3, 7.3
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calculateNextReview, calculateMasteryLevel } from './srs';

const QUALITIES = [0, 1, 2, 3, 4, 5];

test('quality < 3 resets the interval to 1 day', () => {
  // Validates: Requirements 3.2
  for (const quality of [0, 1, 2]) {
    for (const interval of [1, 2, 3, 6, 10, 30, 100]) {
      for (const ease of [1.3, 1.8, 2.5, 3.2]) {
        const { newInterval } = calculateNextReview(ease, interval, quality);
        assert.equal(
          newInterval,
          1,
          `quality=${quality} interval=${interval} ease=${ease} should reset to 1`
        );
      }
    }
  }
});

test('quality >= 3 with interval > 2 grows the interval to round(interval * newEase)', () => {
  // Validates: Requirements 3.3
  for (const quality of [3, 4, 5]) {
    for (const interval of [3, 6, 10, 30, 100]) {
      for (const ease of [1.3, 1.8, 2.5, 3.2]) {
        const { newEase, newInterval } = calculateNextReview(ease, interval, quality);
        assert.equal(
          newInterval,
          Math.round(interval * newEase),
          `interval=${interval} ease=${ease} quality=${quality}`
        );
        assert.ok(
          newInterval > interval,
          `expected growth: interval=${interval} -> newInterval=${newInterval} (newEase=${newEase})`
        );
      }
    }
  }
});

test('ease factor never drops below the 1.3 floor, even after repeated failures', () => {
  // Validates: Requirements 3.3
  let ease = 2.5;
  let interval = 10;
  for (let i = 0; i < 50; i++) {
    const result = calculateNextReview(ease, interval, 0); // worst quality every time
    ease = result.newEase;
    interval = result.newInterval;
    assert.ok(ease >= 1.3, `ease dropped below floor on iteration ${i}: ${ease}`);
  }
  // Across the full quality range the floor must also hold.
  for (const quality of QUALITIES) {
    for (const startEase of [1.3, 1.31, 1.5, 2.5]) {
      const { newEase } = calculateNextReview(startEase, 5, quality);
      assert.ok(newEase >= 1.3, `newEase ${newEase} < 1.3 (start ${startEase}, q ${quality})`);
    }
  }
});

test('first review steps follow SM-2: interval 1 -> 1, interval 2 -> 6 (for quality >= 3)', () => {
  // Validates: Requirements 3.3
  for (const quality of [3, 4, 5]) {
    for (const ease of [1.3, 2.5, 3.0]) {
      assert.equal(calculateNextReview(ease, 1, quality).newInterval, 1, `interval=1 q=${quality}`);
      assert.equal(calculateNextReview(ease, 2, quality).newInterval, 6, `interval=2 q=${quality}`);
    }
  }
});

test('calculateMasteryLevel returns 0 for a brand new word (reviewCount 0)', () => {
  // Validates: Requirements 7.3
  for (const interval of [0, 1, 7, 30, 100]) {
    assert.equal(calculateMasteryLevel(0, 0, interval), 0, `interval=${interval}`);
  }
});

test('calculateMasteryLevel reaches 5 for long interval + high accuracy', () => {
  // Validates: Requirements 7.3
  assert.equal(calculateMasteryLevel(10, 10, 30), 5);
  assert.equal(calculateMasteryLevel(20, 19, 60), 5);
});

test('calculateMasteryLevel is always within [0, 5] across a wide range of inputs', () => {
  // Validates: Requirements 7.3
  for (let reviewCount = 0; reviewCount <= 40; reviewCount++) {
    for (let correctCount = 0; correctCount <= reviewCount; correctCount++) {
      for (const interval of [0, 1, 3, 7, 14, 21, 30, 60, 365]) {
        const level = calculateMasteryLevel(reviewCount, correctCount, interval);
        assert.ok(
          level >= 0 && level <= 5 && Number.isInteger(level),
          `out of bounds: review=${reviewCount} correct=${correctCount} interval=${interval} -> ${level}`
        );
      }
    }
  }
});
