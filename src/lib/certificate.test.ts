import { describe, it, expect } from 'vitest';
import { UserProgress } from '@/types';
import {
  getCertificateLevel,
  formatCertDate,
  buildCertificateData,
} from './certificate';

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
      steps: {} as UserProgress['dailyQuestState']['steps'],
      completed: false,
    },
    badges: [],
    mistakes: [],
    ...overrides,
  };
}

describe('getCertificateLevel', () => {
  it('returns bronze below all thresholds', () => {
    const level = getCertificateLevel({ wordsLearned: 5, storiesCompleted: 1, totalStars: 10 });
    expect(level.tier).toBe('bronze');
    expect(level.emoji).toBe('🥉');
  });

  it('returns silver at the 20 boundary (by stars)', () => {
    const level = getCertificateLevel({ wordsLearned: 0, storiesCompleted: 0, totalStars: 20 });
    expect(level.tier).toBe('silver');
  });

  it('returns gold at the 50 boundary (by words)', () => {
    const level = getCertificateLevel({ wordsLearned: 50, storiesCompleted: 0, totalStars: 0 });
    expect(level.tier).toBe('gold');
  });

  it('returns diamond at the 100 boundary', () => {
    const level = getCertificateLevel({ wordsLearned: 0, storiesCompleted: 0, totalStars: 100 });
    expect(level.tier).toBe('diamond');
    expect(level.emoji).toBe('💎');
  });

  it('uses whichever metric reaches the higher tier', () => {
    // Low stars but high words -> diamond.
    const level = getCertificateLevel({ wordsLearned: 120, storiesCompleted: 0, totalStars: 3 });
    expect(level.tier).toBe('diamond');
  });

  it('stays one tier below at the threshold minus one', () => {
    const level = getCertificateLevel({ wordsLearned: 19, storiesCompleted: 0, totalStars: 19 });
    expect(level.tier).toBe('bronze');
  });
});

describe('formatCertDate', () => {
  it('formats with zero-padded day and month', () => {
    expect(formatCertDate(new Date(2024, 0, 5))).toBe('ngày 05 tháng 01 năm 2024');
  });

  it('formats double-digit day and month correctly', () => {
    expect(formatCertDate(new Date(2023, 11, 25))).toBe('ngày 25 tháng 12 năm 2023');
  });
});

describe('buildCertificateData', () => {
  it('maps progress into certificate data', () => {
    const progress = makeProgress({
      totalStars: 55,
      savedWords: [
        { word: 'cat', vi: 'mèo', savedAt: '', isFavorite: false, masteryLevel: 0, reviewCount: 0 },
        { word: 'dog', vi: 'chó', savedAt: '', isFavorite: false, masteryLevel: 0, reviewCount: 0 },
      ] as UserProgress['savedWords'],
      storiesProgress: {
        s1: { storyId: 's1', completed: true, panelsViewed: [], starsEarned: 3 },
        s2: { storyId: 's2', completed: false, panelsViewed: [], starsEarned: 0 },
      },
    });

    const data = buildCertificateData(progress, 'Bé An', new Date(2024, 2, 9));

    expect(data.name).toBe('Bé An');
    expect(data.wordsLearned).toBe(2);
    expect(data.storiesCompleted).toBe(1);
    expect(data.totalStars).toBe(55);
    expect(data.level.tier).toBe('gold');
    expect(data.dateVi).toBe('ngày 09 tháng 03 năm 2024');
  });
});
