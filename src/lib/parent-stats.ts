/**
 * Parent dashboard statistics — PURE helpers.
 *
 * These functions take a (loosely typed) `UserProgress` snapshot and derive
 * read-only summaries for the parent dashboard (F4). They never touch the
 * network, localStorage, the Zustand store or `Date.now()` side effects beyond
 * computing "today", so they are easy to unit test and safe to call anywhere.
 */

import type { UserProgress } from '@/types';

/** Mastery level at/above which a saved word is considered "mastered". */
export const MASTERED_THRESHOLD = 3;

export interface ProgressSummary {
  wordsLearned: number;
  wordsMastered: number;
  storiesCompleted: number;
  gamesPlayed: number;
  totalStars: number;
  currentStreak: number;
  badgesUnlocked: number;
}

export type ActivityKind = 'word' | 'story' | 'game';

export interface ActivityItem {
  kind: ActivityKind;
  labelVi: string;
  at: string;
}

export interface DailyCount {
  date: string;
  count: number;
}

/**
 * Loosely-typed view of the progress snapshot. We accept `UserProgress` from
 * callers but only read the fields we need, defensively, so partial/legacy
 * snapshots never throw.
 */
type LooseProgress = Partial<UserProgress> | null | undefined;

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Extract the YYYY-MM-DD prefix from an ISO-ish date string.
 * Returns an empty string for missing/invalid input.
 */
export function dayKey(value: string | undefined | null): string {
  if (!value || typeof value !== 'string') return '';
  return value.slice(0, 10);
}

/**
 * High-level counts shown in the big metric cards.
 * `wordsMastered` counts saved words whose masteryLevel >= MASTERED_THRESHOLD.
 */
export function summarizeProgress(progress: LooseProgress): ProgressSummary {
  const savedWords = asArray(progress?.savedWords);
  const storiesProgress = progress?.storiesProgress ?? {};
  const gameScores = asArray(progress?.gameScores);
  const badges = asArray(progress?.badges);

  const wordsMastered = savedWords.filter(
    (word) => (word?.masteryLevel ?? 0) >= MASTERED_THRESHOLD,
  ).length;

  const storiesCompleted = Object.values(storiesProgress).filter(
    (story) => Boolean(story?.completed),
  ).length;

  return {
    wordsLearned: savedWords.length,
    wordsMastered,
    storiesCompleted,
    gamesPlayed: gameScores.length,
    totalStars: progress?.totalStars ?? 0,
    currentStreak: progress?.currentStreak ?? 0,
    badgesUnlocked: badges.length,
  };
}

/**
 * Merge recent saved words, completed stories and game scores into a single
 * date-sorted (most recent first) activity feed.
 */
export function getRecentActivity(progress: LooseProgress, limit = 10): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const word of asArray(progress?.savedWords)) {
    if (!word?.savedAt) continue;
    const vi = word.vi ? ` (${word.vi})` : '';
    items.push({
      kind: 'word',
      labelVi: `Đã học từ "${word.word}"${vi}`,
      at: word.savedAt,
    });
  }

  const storiesProgress = progress?.storiesProgress ?? {};
  for (const story of Object.values(storiesProgress)) {
    if (!story?.completed || !story.completedAt) continue;
    items.push({
      kind: 'story',
      labelVi: `Hoàn thành truyện "${story.storyId}"`,
      at: story.completedAt,
    });
  }

  for (const game of asArray(progress?.gameScores)) {
    if (!game?.playedAt) continue;
    items.push({
      kind: 'game',
      labelVi: `Chơi game được ${game.score}/${game.totalQuestions} điểm`,
      at: game.playedAt,
    });
  }

  items.sort((a, b) => b.at.localeCompare(a.at));

  return items.slice(0, Math.max(0, limit));
}

/**
 * Count learning activities (saved words + completed stories + game plays) per
 * day for the last 7 days (oldest first). Days are compared by the YYYY-MM-DD
 * prefix of the relevant timestamp.
 *
 * `today` is injectable to keep the function pure and testable.
 */
export function getWeeklyActivityCounts(progress: LooseProgress, today: Date = new Date()): DailyCount[] {
  // Build the 7-day window (oldest -> newest), keyed by YYYY-MM-DD.
  const days: DailyCount[] = [];
  const index = new Map<string, number>();

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    index.set(key, days.length);
    days.push({ date: key, count: 0 });
  }

  const bump = (value: string | undefined | null) => {
    const key = dayKey(value);
    const pos = index.get(key);
    if (pos !== undefined) {
      days[pos].count += 1;
    }
  };

  for (const word of asArray(progress?.savedWords)) {
    bump(word?.savedAt);
  }

  const storiesProgress = progress?.storiesProgress ?? {};
  for (const story of Object.values(storiesProgress)) {
    if (story?.completed) bump(story.completedAt);
  }

  for (const game of asArray(progress?.gameScores)) {
    bump(game?.playedAt);
  }

  return days;
}
