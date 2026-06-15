import { describe, it, expect } from 'vitest';
import { createDefaultProgress, DEFAULT_SETTINGS, mergeProgressSnapshots } from './progress';
import type { ProgressSnapshot, StoryProgress, SavedWord } from '@/types';

function story(storyId: string, stars: number, panels: number[], completed = true): StoryProgress {
  return {
    storyId,
    completed,
    panelsViewed: panels,
    starsEarned: stars,
    completedAt: completed ? '2026-01-01T00:00:00.000Z' : undefined,
  };
}

function word(w: string): SavedWord {
  return {
    word: w,
    vi: `nghĩa ${w}`,
    ipa: '',
    savedAt: '2026-01-01T00:00:00.000Z',
    masteryLevel: 0,
    reviewCount: 0,
  };
}

function snapshot(overrides: Partial<ProgressSnapshot['progress']>): ProgressSnapshot {
  return {
    progress: { ...createDefaultProgress('2026-01-01'), ...overrides },
    settings: DEFAULT_SETTINGS,
  };
}

describe('mergeProgressSnapshots', () => {
  it('keeps stories from BOTH local and remote (login never wipes guest work)', () => {
    const local = snapshot({ storiesProgress: { A: story('A', 2, [0, 1]) } });
    const remote = snapshot({ storiesProgress: { B: story('B', 3, [0]) } });

    const merged = mergeProgressSnapshots(local, remote);

    expect(Object.keys(merged.progress.storiesProgress).sort()).toEqual(['A', 'B']);
  });

  it('takes the higher star count when the same story exists on both sides', () => {
    const local = snapshot({ storiesProgress: { A: story('A', 1, [0]) } });
    const remote = snapshot({ storiesProgress: { A: story('A', 3, [1, 2]) } });

    const merged = mergeProgressSnapshots(local, remote);

    expect(merged.progress.storiesProgress.A.starsEarned).toBe(3);
    // panels are unioned
    expect(merged.progress.storiesProgress.A.panelsViewed).toEqual([0, 1, 2]);
  });

  it('unions saved words from both sides (deduped, case-insensitive)', () => {
    const local = snapshot({ savedWords: [word('apple'), word('Banana')] });
    const remote = snapshot({ savedWords: [word('banana'), word('cherry')] });

    const merged = mergeProgressSnapshots(local, remote);
    const words = merged.progress.savedWords.map((w) => w.word.toLowerCase()).sort();

    expect(words).toEqual(['apple', 'banana', 'cherry']);
  });

  it('derives totalStars as the max across local, remote, and summed stories', () => {
    const local = snapshot({ storiesProgress: { A: story('A', 2, [0]) }, totalStars: 2 });
    const remote = snapshot({ storiesProgress: { B: story('B', 3, [0]) }, totalStars: 3 });

    const merged = mergeProgressSnapshots(local, remote);

    // Summed stories (2 + 3 = 5) wins over either side's standalone count.
    expect(merged.progress.totalStars).toBe(5);
  });

  it('is symmetric for disjoint stories regardless of argument order', () => {
    const a = snapshot({ storiesProgress: { A: story('A', 2, [0]) } });
    const b = snapshot({ storiesProgress: { B: story('B', 3, [0]) } });

    const ab = mergeProgressSnapshots(a, b);
    const ba = mergeProgressSnapshots(b, a);

    expect(Object.keys(ab.progress.storiesProgress).sort()).toEqual(
      Object.keys(ba.progress.storiesProgress).sort(),
    );
  });
});
