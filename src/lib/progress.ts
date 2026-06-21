import {
  BadgeId,
  BadgeProgress,
  DailyQuestState,
  DailyQuestStepType,
  GameResult,
  GameScore,
  MistakeItem,
  ProgressSnapshot,
  SavedWord,
  StoryProgress,
  UserProgress,
  UserSettings,
} from '@/types';

export const DEFAULT_SETTINGS: UserSettings = {
  showVietnamese: true,
  fontSize: 'medium',
  readingSpeed: 'normal',
  autoPlayAudio: false,
};

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function createDailyQuestState(date: string = getTodayDate()): DailyQuestState {
  return {
    date,
    steps: {
      story: { type: 'story', target: 1, completed: 0, done: false },
      media: { type: 'media', target: 1, completed: 0, done: false },
      game: { type: 'game', target: 1, completed: 0, done: false },
      saveWord: { type: 'saveWord', target: 3, completed: 0, done: false },
    },
    completed: false,
  };
}

export function createDefaultProgress(date: string = getTodayDate()): UserProgress {
  return {
    storiesProgress: {},
    savedWords: [],
    gameScores: [],
    totalStars: 0,
    currentStreak: 0,
    lastActiveDate: date,
    dailyQuestState: createDailyQuestState(date),
    badges: [],
    mistakes: [],
  };
}

function dedupeBadges(badges: BadgeProgress[]): BadgeProgress[] {
  const seen = new Map<BadgeId, BadgeProgress>();
  badges.forEach((badge) => {
    const existing = seen.get(badge.id);
    if (!existing || existing.unlockedAt > badge.unlockedAt) {
      seen.set(badge.id, badge);
    }
  });
  return Array.from(seen.values()).sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt));
}

function dedupeSavedWords(words: SavedWord[]): SavedWord[] {
  const byWord = new Map<string, SavedWord>();

  for (const word of words) {
    const key = word.word.toLowerCase().trim();
    const existing = byWord.get(key);
    if (!existing) {
      byWord.set(key, word);
      continue;
    }

    byWord.set(key, {
      ...existing,
      vi: existing.vi || word.vi,
      ipa: existing.ipa || word.ipa,
      storyId: existing.storyId || word.storyId,
      savedAt: [existing.savedAt, word.savedAt].filter(Boolean).sort()[0] || existing.savedAt,
      isFavorite: Boolean(existing.isFavorite || word.isFavorite),
      masteryLevel: Math.max(existing.masteryLevel || 0, word.masteryLevel || 0) as SavedWord['masteryLevel'],
      reviewCount: Math.max(existing.reviewCount || 0, word.reviewCount || 0),
      lastReviewedAt: [existing.lastReviewedAt, word.lastReviewedAt].filter(Boolean).sort().at(-1),
      exampleSentence: existing.exampleSentence || word.exampleSentence,
    });
  }

  return Array.from(byWord.values()).sort((a, b) => a.savedAt.localeCompare(b.savedAt));
}

function dedupeGameScores(scores: GameScore[]): GameScore[] {
  const seen = new Set<string>();
  const merged: GameScore[] = [];

  for (const score of scores) {
    const key = `${score.gameType}|${score.storyId}|${score.playedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(score);
  }

  return merged.sort((a, b) => a.playedAt.localeCompare(b.playedAt));
}

function dedupeMistakes(mistakes: MistakeItem[]): MistakeItem[] {
  const byId = new Map<string, MistakeItem>();
  for (const m of mistakes) {
    if (!m || typeof m !== 'object') continue;
    const id = String(m.id || '').trim();
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, m);
      continue;
    }
    byId.set(id, {
      ...existing,
      ...m,
      reviewCount: Math.max(existing.reviewCount || 0, m.reviewCount || 0),
      resolved: Boolean(existing.resolved || m.resolved),
      lastReviewedAt: [existing.lastReviewedAt, m.lastReviewedAt].filter(Boolean).sort().at(-1),
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

function mergeStoryProgress(
  local: Record<string, StoryProgress>,
  remote: Record<string, StoryProgress>,
): Record<string, StoryProgress> {
  const merged: Record<string, StoryProgress> = {};
  const storyIds = new Set([...Object.keys(local), ...Object.keys(remote)]);

  storyIds.forEach((storyId) => {
    const localProgress = local[storyId];
    const remoteProgress = remote[storyId];

    if (!localProgress) {
      merged[storyId] = remoteProgress;
      return;
    }

    if (!remoteProgress) {
      merged[storyId] = localProgress;
      return;
    }

    merged[storyId] = {
      storyId,
      completed: Boolean(localProgress.completed || remoteProgress.completed),
      panelsViewed: Array.from(new Set([
        ...(localProgress.panelsViewed || []),
        ...(remoteProgress.panelsViewed || []),
      ])).sort((a, b) => a - b),
      starsEarned: Math.max(localProgress.starsEarned || 0, remoteProgress.starsEarned || 0),
      completedAt: [localProgress.completedAt, remoteProgress.completedAt].filter(Boolean).sort().at(-1),
    };
  });

  return merged;
}

export function normalizeDailyQuestState(
  quest: Partial<DailyQuestState> | null | undefined,
  date: string = getTodayDate(),
): DailyQuestState {
  const base = createDailyQuestState(date);
  if (!quest || quest.date !== date) {
    return base;
  }

  const next: DailyQuestState = {
    ...base,
    ...quest,
    date,
    steps: { ...base.steps },
  };

  (Object.keys(base.steps) as DailyQuestStepType[]).forEach((step) => {
    const current = quest.steps?.[step];
    if (!current) return;
    const completed = Math.max(0, Math.min(current.completed || 0, base.steps[step].target));
    next.steps[step] = {
      ...base.steps[step],
      ...current,
      completed,
      done: completed >= base.steps[step].target,
    };
  });

  next.completed = (Object.values(next.steps)).every((step) => step.done);
  return next;
}

export function normalizeProgress(progress: Partial<UserProgress> | null | undefined): UserProgress {
  const base = createDefaultProgress();
  if (!progress) {
    return base;
  }

  const storiesProgress = progress.storiesProgress || {};
  const savedWords = dedupeSavedWords(progress.savedWords || []);
  const badges = dedupeBadges(progress.badges || []);
  const dailyQuestState = normalizeDailyQuestState(progress.dailyQuestState, progress.lastActiveDate || getTodayDate());
  const derivedTotalStars = Object.values(storiesProgress).reduce(
    (sum, story) => sum + (story.starsEarned || 0),
    0,
  );

  return {
    ...base,
    ...progress,
    storiesProgress,
    savedWords,
    gameScores: dedupeGameScores(progress.gameScores || []),
    totalStars: Math.max(progress.totalStars || 0, derivedTotalStars),
    currentStreak: progress.currentStreak || 0,
    lastActiveDate: progress.lastActiveDate || getTodayDate(),
    dailyQuestState,
    badges,
    mistakes: dedupeMistakes(progress.mistakes || []),
  };
}

export function normalizeProgressSnapshot(snapshot: { progress?: Partial<UserProgress>; settings?: Partial<UserSettings> } | null | undefined): ProgressSnapshot {
  return {
    progress: normalizeProgress(snapshot?.progress),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(snapshot?.settings || {}),
    },
  };
}

export function mergeProgressSnapshots(local: ProgressSnapshot, remote: ProgressSnapshot): ProgressSnapshot {
  const normalizedLocal = normalizeProgressSnapshot(local);
  const normalizedRemote = normalizeProgressSnapshot(remote);

  const storiesProgress = mergeStoryProgress(
    normalizedLocal.progress.storiesProgress,
    normalizedRemote.progress.storiesProgress,
  );

  const progress: UserProgress = normalizeProgress({
    storiesProgress,
    savedWords: dedupeSavedWords([
      ...normalizedRemote.progress.savedWords,
      ...normalizedLocal.progress.savedWords,
    ]),
    gameScores: dedupeGameScores([
      ...normalizedRemote.progress.gameScores,
      ...normalizedLocal.progress.gameScores,
    ]),
    totalStars: Math.max(
      normalizedLocal.progress.totalStars,
      normalizedRemote.progress.totalStars,
      Object.values(storiesProgress).reduce((sum, story) => sum + (story.starsEarned || 0), 0),
    ),
    currentStreak:
      normalizedLocal.progress.lastActiveDate === normalizedRemote.progress.lastActiveDate
        ? Math.max(normalizedLocal.progress.currentStreak, normalizedRemote.progress.currentStreak)
        : normalizedLocal.progress.lastActiveDate > normalizedRemote.progress.lastActiveDate
          ? normalizedLocal.progress.currentStreak
          : normalizedRemote.progress.currentStreak,
    lastActiveDate: [normalizedLocal.progress.lastActiveDate, normalizedRemote.progress.lastActiveDate]
      .filter(Boolean)
      .sort()
      .at(-1) || getTodayDate(),
    dailyQuestState: normalizeDailyQuestState(
      normalizedLocal.progress.dailyQuestState.date >= normalizedRemote.progress.dailyQuestState.date
        ? normalizedLocal.progress.dailyQuestState
        : normalizedRemote.progress.dailyQuestState,
    ),
    badges: dedupeBadges([
      ...normalizedRemote.progress.badges,
      ...normalizedLocal.progress.badges,
    ]),
    mistakes: dedupeMistakes([
      ...normalizedRemote.progress.mistakes,
      ...normalizedLocal.progress.mistakes,
    ]),
  });

  return {
    progress,
    settings: {
      ...normalizedRemote.settings,
      ...normalizedLocal.settings,
    },
  };
}

export function incrementQuestStep(
  quest: DailyQuestState,
  stepType: DailyQuestStepType,
  amount: number = 1,
): DailyQuestState {
  const normalized = normalizeDailyQuestState(quest);
  const step = normalized.steps[stepType];
  const completed = Math.min(step.target, step.completed + amount);
  const next: DailyQuestState = {
    ...normalized,
    steps: {
      ...normalized.steps,
      [stepType]: {
        ...step,
        completed,
        done: completed >= step.target,
      },
    },
  };

  const completedQuest = Object.values(next.steps).every((item) => item.done);
  next.completed = completedQuest;
  if (completedQuest && !next.completedAt) {
    next.completedAt = new Date().toISOString();
  }
  return next;
}

export function getEligibleBadgeIds(progress: UserProgress): BadgeId[] {
  const badges = new Set<BadgeId>();
  const completedStories = Object.values(progress.storiesProgress).filter((story) => story.completed).length;
  const perfectGames = progress.gameScores.filter((score) => score.score >= score.totalQuestions).length;

  if (progress.currentStreak >= 3) badges.add('streak_3');
  if (progress.currentStreak >= 7) badges.add('streak_7');
  if (completedStories >= 1) badges.add('story_1');
  if (completedStories >= 5) badges.add('story_5');
  if (progress.savedWords.length >= 10) badges.add('vocab_10');
  if (progress.savedWords.length >= 50) badges.add('vocab_50');
  if (perfectGames >= 3) badges.add('game_master');

  return Array.from(badges);
}

export function applyBadgeUnlocks(progress: UserProgress): UserProgress {
  const unlockedIds = new Set(progress.badges.map((badge) => badge.id));
  const now = new Date().toISOString();
  const newBadges = getEligibleBadgeIds(progress)
    .filter((badgeId) => !unlockedIds.has(badgeId))
    .map((badgeId) => ({ id: badgeId, unlockedAt: now }));

  if (newBadges.length === 0) {
    return progress;
  }

  return {
    ...progress,
    badges: dedupeBadges([...progress.badges, ...newBadges]),
  };
}

export function createGameScore(result: GameResult): GameScore {
  return {
    gameType: result.gameType,
    storyId: result.storyId,
    score: result.score,
    totalQuestions: result.totalQuestions,
    playedAt: result.playedAt || new Date().toISOString(),
  };
}
