/**
 * Unit tests for the pure badge metadata lib (`./badges`).
 *
 * Uses Vitest (explicit imports). Deterministic — no DOM, no timers, no RNG.
 */

import { describe, it, expect } from 'vitest';

import { BadgeId } from '@/types';
import { BADGE_META, getAllBadgeMeta, getBadgeMeta, BadgeMeta } from './badges';

// The full set of badge ids in the BadgeId union. Kept in sync manually so the
// test fails loudly if the union changes without metadata being updated.
const ALL_BADGE_IDS: BadgeId[] = [
  'streak_3',
  'streak_7',
  'story_1',
  'story_5',
  'vocab_10',
  'vocab_50',
  'game_master',
];

describe('BADGE_META', () => {
  it('has metadata for every BadgeId in the union', () => {
    ALL_BADGE_IDS.forEach((id) => {
      expect(BADGE_META[id]).toBeDefined();
    });
    expect(getAllBadgeMeta()).toHaveLength(ALL_BADGE_IDS.length);
  });

  it('uses non-empty Vietnamese labels and descriptions', () => {
    getAllBadgeMeta().forEach((meta: BadgeMeta) => {
      expect(meta.labelVi.trim().length).toBeGreaterThan(0);
      expect(meta.descVi.trim().length).toBeGreaterThan(0);
    });
  });

  it('uses a non-empty emoji and tint for every badge', () => {
    getAllBadgeMeta().forEach((meta: BadgeMeta) => {
      expect(meta.emoji.trim().length).toBeGreaterThan(0);
      expect(meta.tint.trim().length).toBeGreaterThan(0);
    });
  });

  it('has unique badge ids', () => {
    const ids = getAllBadgeMeta().map((meta) => meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps each entry id consistent with its map key', () => {
    (Object.keys(BADGE_META) as BadgeId[]).forEach((key) => {
      expect(BADGE_META[key].id).toBe(key);
    });
  });
});

describe('getBadgeMeta', () => {
  it('returns the matching metadata for a known id', () => {
    const meta = getBadgeMeta('streak_3');
    expect(meta.id).toBe('streak_3');
    expect(meta.labelVi.length).toBeGreaterThan(0);
  });
});
