import { describe, it, expect } from 'vitest';
import { buildPetQuiz, pickDistractors, QuizDirection } from './pet-quiz';
import { WordPair } from './word-bank';

const BANK: WordPair[] = [
  { en: 'Apple', vi: 'Quả táo' },
  { en: 'Ocean', vi: 'Đại dương' },
  { en: 'Cloud', vi: 'Đám mây' },
  { en: 'Flame', vi: 'Ngọn lửa' },
  { en: 'Magic', vi: 'Ma thuật' },
  { en: 'Sword', vi: 'Thanh kiếm' },
];

// Deterministic RNG (cycles through fixed values).
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('pickDistractors', () => {
  it('returns the requested count, excluding the answer', () => {
    const d = pickDistractors(BANK, 'Apple', 'en', 3, seq([0.1, 0.3, 0.5, 0.7, 0.9]));
    expect(d).toHaveLength(3);
    expect(d).not.toContain('Apple');
  });

  it('returns distinct values', () => {
    const d = pickDistractors(BANK, 'Quả táo', 'vi', 3);
    expect(new Set(d).size).toBe(d.length);
  });

  it('caps at available pool size', () => {
    const small: WordPair[] = [
      { en: 'A', vi: 'a' },
      { en: 'B', vi: 'b' },
    ];
    expect(pickDistractors(small, 'A', 'en', 3).length).toBeLessThanOrEqual(1);
  });
});

describe('buildPetQuiz', () => {
  const directions: QuizDirection[] = ['vi-to-en', 'en-to-vi'];

  for (const direction of directions) {
    it(`(${direction}) produces 4 options including the answer`, () => {
      const q = buildPetQuiz(BANK, direction, seq([0.2, 0.4, 0.6, 0.8, 0.1, 0.3]));
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(4);
    });

    it(`(${direction}) prompt and answer are on opposite sides`, () => {
      const q = buildPetQuiz(BANK, direction);
      if (direction === 'vi-to-en') {
        expect(q.prompt).toBe(q.word.vi);
        expect(q.answer).toBe(q.word.en);
      } else {
        expect(q.prompt).toBe(q.word.en);
        expect(q.answer).toBe(q.word.vi);
      }
    });
  }

  it('falls back to defaults when the bank is too small', () => {
    const q = buildPetQuiz([{ en: 'Solo', vi: 'Một mình' }], 'vi-to-en');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain(q.answer);
  });

  it('draws the question word from preferred words when provided', () => {
    const preferred: WordPair[] = [{ en: 'Wizard', vi: 'Phù thủy' }];
    const q = buildPetQuiz(BANK, 'vi-to-en', undefined, preferred);
    expect(q.word.en).toBe('Wizard');
    expect(q.prompt).toBe('Phù thủy');
    expect(q.answer).toBe('Wizard');
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain('Wizard');
  });
});
