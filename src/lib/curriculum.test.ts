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
  it('maps story levels to CEFR learning stages', () => {
    expect(stageForStoryLevel('Beginner')).toBe('pre-a1-starters');
    expect(stageForStoryLevel('Elementary')).toBe('a1-movers');
    expect(stageForStoryLevel('Intermediate')).toBe('a2-flyers');
  });

  it('maps game difficulty to stage', () => {
    expect(stageForDifficulty('easy')).toBe('pre-a1-starters');
    expect(stageForDifficulty('medium')).toBe('a1-movers');
    expect(stageForDifficulty('advanced')).toBe('a2-flyers');
  });
});

describe('getLearnerStageProgress', () => {
  it('starts a new learner in sound-play', () => {
    const result = getLearnerStageProgress(makeProgress({}));
    expect(result.stage.id).toBe('sound-play');
    expect(result.percent).toBe(0);
    expect(result.missing).toHaveLength(3);
  });

  it('advances to Pre A1 Starters after readiness targets are met', () => {
    const result = getLearnerStageProgress(makeProgress({ words: 50, stories: 1, games: 3 }));
    expect(result.stage.id).toBe('pre-a1-starters');
    expect(result.stats.masteredWords).toBe(50);
  });

  it('advances to A2 bridge when Flyers targets are met', () => {
    const result = getLearnerStageProgress(makeProgress({ words: 700, stories: 24, games: 32 }));
    expect(result.stage.id).toBe('a2-bridge');
    expect(result.nextStage).toBeNull();
  });
});
