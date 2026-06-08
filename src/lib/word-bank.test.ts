import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORD_BANK,
  filterWordBank,
  getStageWordCount,
  getWordBankStats,
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

describe('DEFAULT_WORD_BANK curriculum seed', () => {
  it('covers every curriculum stage with metadata and examples', () => {
    const stats = getWordBankStats(DEFAULT_WORD_BANK);
    expect(stats.total).toBeGreaterThan(150);
    expect(stats.fiveLetterCount).toBeGreaterThanOrEqual(20);
    expect(stats.exampleCount).toBe(stats.total);
    expect(getStageWordCount('sound-play')).toBeGreaterThan(20);
    expect(getStageWordCount('pre-a1-starters')).toBeGreaterThan(40);
    expect(getStageWordCount('a1-movers')).toBeGreaterThan(40);
    expect(getStageWordCount('a2-flyers')).toBeGreaterThan(35);
    expect(getStageWordCount('a2-bridge')).toBeGreaterThan(20);
  });
  it('keeps each default word assigned to a level and topic', () => {
    expect(DEFAULT_WORD_BANK.every((word) => word.level && word.topic && word.example)).toBe(true);
  });
});

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
    const questions = toFillBlankQuestions(BANK, BANK.length);

    expect(questions.every((question) => question.sentence.includes('___'))).toBe(true);
    expect(questions.every((question) => question.sentence !== 'I can see ___.')).toBe(true);
    expect(questions.every((question) => question.options.includes(question.answer))).toBe(true);
  });

  it('creates sentence-scramble items from examples', () => {
    const [sentence] = toSentenceScrambles(BANK, 1);
    expect(sentence.text.split(' ').length).toBeGreaterThan(2);
    expect(sentence.hint).toBeTruthy();
  });
});
