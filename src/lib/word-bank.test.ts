import { describe, expect, it } from 'vitest';
import {
  filterWordBank,
  normalizeWordBank,
  toCoinQuestions,
  toFillBlankQuestions,
  toMatchingPairs,
  toRpgQuestions,
  toSentenceScrambles,
  type WordPair,
} from './word-bank';

const BANK: WordPair[] = [
  { en: 'Apple', vi: 'Qua tao', level: 'pre-a1-starters', topic: 'food', example: 'I eat an apple.' },
  { en: 'River', vi: 'Dong song', level: 'pre-a1-starters', topic: 'nature', example: 'The river is blue.' },
  { en: 'Castle', vi: 'Lau dai', level: 'a1-movers', topic: 'places', example: 'The castle is tall.' },
  { en: 'Adventure', vi: 'Cuoc phieu luu', level: 'a2-flyers', topic: 'adventure', example: 'The adventure starts today.' },
  { en: 'Community', vi: 'Cong dong', level: 'a2-flyers', topic: 'community', example: 'Our community helps people.' },
];

describe('normalizeWordBank', () => {
  it('keeps curriculum metadata and drops malformed rows', () => {
    const normalized = normalizeWordBank([
      { en: ' Apple ', vi: ' Qua tao ', level: 'a1-movers', topic: ' Food ', example: 'I like Apple.' },
      { en: '', vi: 'Missing English' },
      { nope: true },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized?.[0]).toMatchObject({
      en: 'Apple',
      vi: 'Qua tao',
      level: 'a1-movers',
      topic: 'food',
      example: 'I like Apple.',
    });
  });
});

describe('filterWordBank', () => {
  it('includes words at or below the requested stage', () => {
    const filtered = filterWordBank(BANK, { level: 'a1-movers', min: 1 });
    expect(filtered.map((word) => word.en)).toEqual(expect.arrayContaining(['Apple', 'River', 'Castle']));
    expect(filtered.map((word) => word.en)).not.toContain('Adventure');
  });

  it('falls back to the enriched source when a filter would be too small', () => {
    const filtered = filterWordBank(BANK, { topic: 'missing-topic', min: 4 });
    expect(filtered).toHaveLength(BANK.length);
    expect(filtered[0].example).toBeTruthy();
  });
});

describe('word-bank game adapters', () => {
  it('creates matching-pairs data for the requested difficulty', () => {
    const pairs = toMatchingPairs(BANK, 'medium', 3);
    expect(pairs).toHaveLength(3);
    expect(pairs.every((pair) => pair.level === 'medium')).toBe(true);
  });

  it('creates 4-choice coin questions with the answer index pointing to the answer', () => {
    const [question] = toCoinQuestions(BANK, 1);
    expect(question.choices).toHaveLength(4);
    expect(question.choices[question.correct]).toBeTruthy();
  });

  it('creates RPG questions with Vietnamese answer choices', () => {
    const [question] = toRpgQuestions(BANK);
    expect(question.q).toContain('nghĩa là gì');
    expect(question.choices).toHaveLength(4);
    expect(question.correct).toBeGreaterThanOrEqual(0);
  });

  it('creates fill-blank questions from examples', () => {
    const [question] = toFillBlankQuestions(BANK, 1);
    expect(question.sentence).toContain('___');
    expect(question.options).toContain(question.answer);
  });

  it('creates sentence-scramble items from examples', () => {
    const [sentence] = toSentenceScrambles(BANK, 1);
    expect(sentence.text.split(' ').length).toBeGreaterThan(2);
    expect(sentence.hint).toBeTruthy();
  });
});
