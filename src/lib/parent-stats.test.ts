import { describe, it, expect } from 'vitest';
import type { UserProgress } from '@/types';
import {
  summarizeProgress,
  getRecentActivity,
  getWeeklyActivityCounts,
  dayKey,
} from '@/lib/parent-stats';

/**
 * Build a minimal but valid-enough UserProgress for the pure stat helpers.
 * Only the fields the helpers read need to be meaningful.
 */
function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    storiesProgress: {},
    savedWords: [],
    gameScores: [],
    totalStars: 0,
    currentStreak: 0,
    lastActiveDate: '2024-01-01',
    dailyQuestState: {
      date: '2024-01-01',
      steps: {} as never,
      completed: false,
    },
    badges: [],
    ...overrides,
  };
}

describe('summarizeProgress', () => {
  it('counts words, stories, games, stars, streak and badges', () => {
    const progress = makeProgress({
      savedWords: [
        { word: 'cat', vi: 'mèo', savedAt: '2024-01-01T00:00:00.000Z', masteryLevel: 1 },
        { word: 'dog', vi: 'chó', savedAt: '2024-01-02T00:00:00.000Z', masteryLevel: 4 },
      ],
      storiesProgress: {
        s1: { storyId: 's1', completed: true, panelsViewed: [], starsEarned: 3 },
        s2: { storyId: 's2', completed: false, panelsViewed: [], starsEarned: 0 },
      },
      gameScores: [
        { gameType: 'match', storyId: 's1', score: 5, totalQuestions: 5, playedAt: '2024-01-02T00:00:00.000Z' },
      ],
      totalStars: 12,
      currentStreak: 4,
      badges: [{ id: 'story_1', unlockedAt: '2024-01-01T00:00:00.000Z' }],
    });

    const summary = summarizeProgress(progress);

    expect(summary.wordsLearned).toBe(2);
    expect(summary.storiesCompleted).toBe(1);
    expect(summary.gamesPlayed).toBe(1);
    expect(summary.totalStars).toBe(12);
    expect(summary.currentStreak).toBe(4);
    expect(summary.badgesUnlocked).toBe(1);
  });

  it('counts words with masteryLevel >= 3 as mastered', () => {
    const progress = makeProgress({
      savedWords: [
        { word: 'a', vi: '', savedAt: '2024-01-01T00:00:00.000Z', masteryLevel: 2 },
        { word: 'b', vi: '', savedAt: '2024-01-01T00:00:00.000Z', masteryLevel: 3 },
        { word: 'c', vi: '', savedAt: '2024-01-01T00:00:00.000Z', masteryLevel: 5 },
        { word: 'd', vi: '', savedAt: '2024-01-01T00:00:00.000Z' }, // undefined -> 0
      ],
    });

    expect(summarizeProgress(progress).wordsMastered).toBe(2);
  });

  it('returns zeros for empty / nullish progress', () => {
    expect(summarizeProgress(undefined)).toEqual({
      wordsLearned: 0,
      wordsMastered: 0,
      storiesCompleted: 0,
      gamesPlayed: 0,
      totalStars: 0,
      currentStreak: 0,
      badgesUnlocked: 0,
    });
  });
});

describe('getRecentActivity', () => {
  it('merges and sorts activity by date descending', () => {
    const progress = makeProgress({
      savedWords: [
        { word: 'cat', vi: 'mèo', savedAt: '2024-01-01T08:00:00.000Z', masteryLevel: 0 },
      ],
      storiesProgress: {
        s1: { storyId: 's1', completed: true, panelsViewed: [], starsEarned: 3, completedAt: '2024-01-03T08:00:00.000Z' },
      },
      gameScores: [
        { gameType: 'match', storyId: 's1', score: 4, totalQuestions: 5, playedAt: '2024-01-02T08:00:00.000Z' },
      ],
    });

    const activity = getRecentActivity(progress);

    expect(activity.map((a) => a.kind)).toEqual(['story', 'game', 'word']);
    expect(activity[0].at).toBe('2024-01-03T08:00:00.000Z');
  });

  it('respects the limit parameter', () => {
    const savedWords = Array.from({ length: 20 }, (_, i) => ({
      word: `w${i}`,
      vi: '',
      savedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      masteryLevel: 0 as const,
    }));

    expect(getRecentActivity(makeProgress({ savedWords }), 5)).toHaveLength(5);
    expect(getRecentActivity(makeProgress({ savedWords })).length).toBe(10); // default
  });

  it('ignores stories that are not completed', () => {
    const progress = makeProgress({
      storiesProgress: {
        s1: { storyId: 's1', completed: false, panelsViewed: [], starsEarned: 0, completedAt: '2024-01-03T08:00:00.000Z' },
      },
    });

    expect(getRecentActivity(progress)).toHaveLength(0);
  });
});

describe('getWeeklyActivityCounts', () => {
  it('returns 7 day buckets with the last day equal to today', () => {
    const today = new Date('2024-01-07T12:00:00.000Z');
    const counts = getWeeklyActivityCounts(makeProgress(), today);

    expect(counts).toHaveLength(7);
    expect(counts[0].date).toBe('2024-01-01');
    expect(counts[6].date).toBe('2024-01-07');
    expect(counts.every((c) => c.count === 0)).toBe(true);
  });

  it('buckets activities by their YYYY-MM-DD prefix', () => {
    const today = new Date('2024-01-07T12:00:00.000Z');
    const progress = makeProgress({
      savedWords: [
        { word: 'a', vi: '', savedAt: '2024-01-07T01:00:00.000Z', masteryLevel: 0 },
        { word: 'b', vi: '', savedAt: '2024-01-07T23:59:00.000Z', masteryLevel: 0 },
      ],
      storiesProgress: {
        s1: { storyId: 's1', completed: true, panelsViewed: [], starsEarned: 3, completedAt: '2024-01-05T10:00:00.000Z' },
      },
      gameScores: [
        { gameType: 'match', storyId: 's1', score: 3, totalQuestions: 5, playedAt: '2024-01-05T11:00:00.000Z' },
        // Outside the 7-day window -> ignored.
        { gameType: 'match', storyId: 's1', score: 1, totalQuestions: 5, playedAt: '2023-12-30T11:00:00.000Z' },
      ],
    });

    const counts = getWeeklyActivityCounts(progress, today);
    const byDate = Object.fromEntries(counts.map((c) => [c.date, c.count]));

    expect(byDate['2024-01-07']).toBe(2); // two words
    expect(byDate['2024-01-05']).toBe(2); // story + game
    expect(byDate['2024-01-06']).toBe(0);
    // Total across the window excludes the out-of-window game.
    expect(counts.reduce((sum, c) => sum + c.count, 0)).toBe(4);
  });
});

describe('dayKey', () => {
  it('extracts the date prefix and handles missing input', () => {
    expect(dayKey('2024-01-07T12:00:00.000Z')).toBe('2024-01-07');
    expect(dayKey('')).toBe('');
    expect(dayKey(undefined)).toBe('');
  });
});
