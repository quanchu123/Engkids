import { describe, it, expect } from 'vitest';
import {
  aggregateLessonScore,
  qualityFromAccuracy,
  buildChoices,
  checkWordOrder,
  PASSIVE_QUALITY,
  type StepResult,
} from './lesson-scoring';

function step(partial: Partial<StepResult>): StepResult {
  return {
    stepId: partial.stepId ?? 's',
    stepType: partial.stepType ?? 'quiz',
    correct: partial.correct ?? 0,
    total: partial.total ?? 0,
    scorePercent: partial.scorePercent ?? 0,
    words: partial.words ?? [],
  };
}

describe('aggregateLessonScore', () => {
  it('returns 100 when every step is passive (no scored step)', () => {
    const results = [
      step({ stepType: 'vocab', total: 0, correct: 0, scorePercent: 100 }),
      step({ stepType: 'reading', total: 0, correct: 0, scorePercent: 100 }),
    ];
    expect(aggregateLessonScore(results)).toBe(100);
  });

  it('returns 100 for an empty lesson', () => {
    expect(aggregateLessonScore([])).toBe(100);
  });

  it('counts only scored steps toward the denominator', () => {
    // 4/5 correct on the one scored step; passive steps ignored.
    const results = [
      step({ stepType: 'vocab', total: 0, correct: 0, scorePercent: 100 }),
      step({ stepType: 'quiz', total: 5, correct: 4, scorePercent: 80 }),
    ];
    expect(aggregateLessonScore(results)).toBe(80);
  });

  it('pools correct/total across multiple scored steps', () => {
    // (4 + 1) / (5 + 5) = 50%
    const results = [
      step({ stepType: 'quiz', total: 5, correct: 4 }),
      step({ stepType: 'quiz', total: 5, correct: 1 }),
    ];
    expect(aggregateLessonScore(results)).toBe(50);
  });

  it('returns 0 when all scored answers are wrong', () => {
    expect(aggregateLessonScore([step({ total: 4, correct: 0 })])).toBe(0);
  });

  it('rounds to the nearest integer', () => {
    // 2/3 = 66.66 -> 67
    expect(aggregateLessonScore([step({ total: 3, correct: 2 })])).toBe(67);
  });
});

describe('qualityFromAccuracy', () => {
  it('wrong answer is a lapse (1) regardless of attempts', () => {
    expect(qualityFromAccuracy(false, 1)).toBe(1);
    expect(qualityFromAccuracy(false, 9)).toBe(1);
  });

  it('first-try correct is easy (5)', () => {
    expect(qualityFromAccuracy(true, 1)).toBe(5);
    expect(qualityFromAccuracy(true, 0)).toBe(5);
  });

  it('correct after one retry is 4', () => {
    expect(qualityFromAccuracy(true, 2)).toBe(4);
  });

  it('correct after several retries is a shaky pass (3)', () => {
    expect(qualityFromAccuracy(true, 3)).toBe(3);
    expect(qualityFromAccuracy(true, 7)).toBe(3);
  });

  it('passive quality enters the queue without over-promoting', () => {
    expect(PASSIVE_QUALITY).toBe(3);
  });
});

describe('buildChoices', () => {
  // Deterministic identity shuffle so assertions are stable.
  const identity = <T,>(arr: T[]): T[] => [...arr];

  it('always includes the correct answer', () => {
    const choices = buildChoices('cat', ['dog', 'fish', 'bird'], 4, identity);
    expect(choices).toContain('cat');
  });

  it('produces up to n options', () => {
    const choices = buildChoices('cat', ['dog', 'fish', 'bird', 'cow'], 4, identity);
    expect(choices).toHaveLength(4);
  });

  it('never duplicates the answer among distractors (case-insensitive)', () => {
    const choices = buildChoices('Cat', ['cat', 'CAT', 'dog'], 4, identity);
    const cats = choices.filter((c) => c.toLowerCase() === 'cat');
    expect(cats).toHaveLength(1);
  });

  it('de-duplicates distractors against each other', () => {
    const choices = buildChoices('cat', ['dog', 'dog', 'dog'], 4, identity);
    expect(choices).toEqual(expect.arrayContaining(['cat', 'dog']));
    expect(choices).toHaveLength(2);
  });

  it('shrinks gracefully when the pool is too small', () => {
    const choices = buildChoices('cat', [], 4, identity);
    expect(choices).toEqual(['cat']);
  });
});

describe('checkWordOrder', () => {
  it('accepts an exact match', () => {
    expect(checkWordOrder(['I', 'like', 'cats'], ['I', 'like', 'cats'])).toBe(true);
  });

  it('ignores case and surrounding punctuation', () => {
    expect(checkWordOrder(['i', 'like', 'cats'], ['I', 'like', 'cats.'])).toBe(true);
  });

  it('rejects a wrong order', () => {
    expect(checkWordOrder(['like', 'I', 'cats'], ['I', 'like', 'cats'])).toBe(false);
  });

  it('rejects a length mismatch', () => {
    expect(checkWordOrder(['I', 'like'], ['I', 'like', 'cats'])).toBe(false);
  });
});
