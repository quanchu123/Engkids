import { describe, it, expect } from 'vitest';
import {
  AVATAR_ITEMS,
  AVATAR_CATEGORIES,
  AvatarCategory,
  getItem,
  getItemsByCategory,
  isUnlocked,
  getDefaultEquipped,
} from '@/lib/avatar';

describe('avatar catalog', () => {
  it('has at least 12 items', () => {
    expect(AVATAR_ITEMS.length).toBeGreaterThanOrEqual(12);
  });

  it('every item has a unique id', () => {
    const ids = AVATAR_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every item has a valid category', () => {
    const valid = new Set<AvatarCategory>(AVATAR_CATEGORIES);
    AVATAR_ITEMS.forEach((item) => {
      expect(valid.has(item.category)).toBe(true);
    });
  });

  it('contains the expected increasing requiredStars thresholds', () => {
    const thresholds = AVATAR_ITEMS.map((item) => item.requiredStars).sort((a, b) => a - b);
    expect(thresholds).toEqual([0, 0, 5, 10, 15, 20, 30, 40, 50, 75, 100, 150]);
  });

  it('has exactly two free (requiredStars:0) items: a character and a frame', () => {
    const free = AVATAR_ITEMS.filter((item) => item.requiredStars === 0);
    expect(free.length).toBe(2);
    expect(free.some((item) => item.category === 'character')).toBe(true);
    expect(free.some((item) => item.category === 'frame')).toBe(true);
  });
});

describe('avatar helpers', () => {
  it('getItem resolves by id and returns undefined for unknown ids', () => {
    const first = AVATAR_ITEMS[0];
    expect(getItem(first.id)).toEqual(first);
    expect(getItem('does-not-exist')).toBeUndefined();
  });

  it('getItemsByCategory returns sorted items within the category', () => {
    AVATAR_CATEGORIES.forEach((cat) => {
      const items = getItemsByCategory(cat);
      expect(items.every((item) => item.category === cat)).toBe(true);
      const stars = items.map((item) => item.requiredStars);
      expect(stars).toEqual([...stars].sort((a, b) => a - b));
    });
  });

  it('isUnlocked uses a threshold (>=) check', () => {
    const item = AVATAR_ITEMS.find((candidate) => candidate.requiredStars === 20)!;
    expect(isUnlocked(item, 19)).toBe(false);
    expect(isUnlocked(item, 20)).toBe(true);
    expect(isUnlocked(item, 21)).toBe(true);
  });

  it('default equipped ids exist and are unlocked at 0 stars', () => {
    const equipped = getDefaultEquipped();
    const character = getItem(equipped.character);
    const frame = getItem(equipped.frame);

    expect(character).toBeDefined();
    expect(frame).toBeDefined();
    expect(character!.category).toBe('character');
    expect(frame!.category).toBe('frame');
    expect(isUnlocked(character!, 0)).toBe(true);
    expect(isUnlocked(frame!, 0)).toBe(true);
    // No accessories equipped by default.
    expect(equipped.hat).toBeUndefined();
    expect(equipped.pet).toBeUndefined();
  });
});
