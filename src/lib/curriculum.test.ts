import { describe, expect, it } from 'vitest';
import type { GameScore, SavedWord, StoryProgress, UserProgress } from '@/types';
import { createDefaultProgress } from './progress';
import { getLearnerStageProgress, stageForDifficulty, stageForStoryLevel } from './curriculum';

function makeProgress({ words = 0, stories = 0, games = 0 }: { words?: number; stories?: number; games?: number }): UserProgress {
  const progress = createDefaultProgress('2024-01-01');
  progress.savedWords = Array.from({ length: words }, (_, index): SavedWord => ({
    word: `word-${index}`,
    vi: `vi-${index}`,
    savedAt: '2024-01-01',
    masteryLevel: 3,
  }));
  progress.storiesProgress = Object.fromEntries(
    Array.from({ length: stories }, (_, index): [string, StoryProgress] => [
      `story-${index}`,
      {
        storyId: `story-${index}`,
        completed: true,
        panelsViewed: [1],
        starsEarned: 3,
        completedAt: '2024-01-01',
      },
    ]),
  );
  progress.gameScores = Array.from({ length: games }, (_, index): GameScore => ({
    gameType: 'matching_pairs',
    storyId: `game-${index}`,
    score: 7,
    totalQuestions: 10,
    playedAt: '2024-01-01',
  }));
  return progress;
}

describe('curriculum stage mapping', () => {
  it('maps legacy story levels into the active A2 path', () => {
    expect(stageForStoryLevel('Beginner')).toBe('a2-key');
    expect(stageForStoryLevel('Elementary')).toBe('a2-key');
    expect(stageForStoryLevel('Intermediate')).toBe('a2-key');
  });

  it('maps game difficulty to active A2-C1 stages', () => {
    expect(stageForDifficulty('easy')).toBe('a2-key');
    expect(stageForDifficulty('medium')).toBe('b1-preliminary');
    expect(stageForDifficulty('advanced')).toBe('b2-first');
  });
});

describe('getLearnerStageProgress', () => {
  it('starts a new learner in A2 Key', () => {
    const result = getLearnerStageProgress(makeProgress({}));
    expect(result.stage.id).toBe('a2-key');
    expect(result.percent).toBe(0);
    expect(result.missing).toHaveLength(3);
  });

  it('stays in A2 Key until active A2 targets are met', () => {
    const result = getLearnerStageProgress(makeProgress({ words: 50, stories: 1, games: 3 }));
    expect(result.stage.id).toBe('a2-key');
    expect(result.stats.masteredWords).toBe(50);
  });

  it('advances through the active A2-C1 path when targets are met', () => {
    const result = getLearnerStageProgress(makeProgress({ words: 5200, stories: 90, games: 160 }));
    expect(result.stage.id).toBe('c1-advanced');
    expect(result.nextStage).toBeNull();
  });
});
