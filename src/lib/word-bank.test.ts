import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WORD_BANK,
  filterPlayableWordBank,
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
  { en: 'Apple', vi: 'Qua tao', level: 'a2-key', topic: 'food', example: 'I eat an apple.' },
  { en: 'River', vi: 'Dong song', level: 'a2-key', topic: 'nature', example: 'The river is blue.' },
  { en: 'Castle', vi: 'Lau dai', level: 'b1-preliminary', topic: 'places', example: 'The castle is tall.' },
  { en: 'Adventure', vi: 'Cuộc phiêu lưu', level: 'b2-first', topic: 'adventure', example: 'The adventure starts today.' },
  { en: 'Community', vi: 'Cong dong', level: 'b2-first', topic: 'community', example: 'Our community helps people.' },
];

describe('DEFAULT_WORD_BANK curriculum seed', () => {
  it('covers every curriculum stage with metadata and examples', () => {
    const stats = getWordBankStats(DEFAULT_WORD_BANK);
    expect(stats.total).toBeGreaterThan(150);
    expect(stats.fiveLetterCount).toBeGreaterThanOrEqual(20);
    expect(stats.exampleCount).toBe(stats.total);
    expect(getStageWordCount('a2-key')).toBeGreaterThan(150);
    expect(getStageWordCount('b1-preliminary')).toBeGreaterThanOrEqual(0);
    expect(getStageWordCount('b2-first')).toBeGreaterThanOrEqual(0);
    expect(getStageWordCount('c1-advanced')).toBeGreaterThanOrEqual(0);
  });
  it('keeps each default word assigned to a level and topic', () => {
    expect(DEFAULT_WORD_BANK.every((word) => word.level && word.topic && word.example)).toBe(true);
  });
});

describe('normalizeWordBank', () => {
  it('keeps curriculum metadata and drops malformed rows', () => {
    const normalized = normalizeWordBank([
      { en: ' Apple ', vi: ' Qua tao ', level: 'b1-preliminary', topic: ' Food ', example: 'I like Apple.' },
      { en: '', vi: 'Missing English' },
      { nope: true },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized?.[0]).toMatchObject({
      en: 'Apple',
      vi: 'Qua tao',
      level: 'b1-preliminary',
      topic: 'food',
      example: 'I like Apple.',
    });
  });

  it('preserves moderation metadata used by playable-word filtering', () => {
    const normalized = normalizeWordBank([
      { en: 'Unsafe', vi: 'Khong an toan', qualityStatus: 'blocked', viReviewStatus: 'blocked' },
    ]);

    expect(normalized?.[0]).toMatchObject({ qualityStatus: 'blocked', viReviewStatus: 'blocked' });
  });
});

describe('filterPlayableWordBank', () => {
  it('drops imported rows that are not playable for learner games', () => {
    const filtered = filterPlayableWordBank([
      { en: 'sm', vi: 'translation_pending', level: 'b1-preliminary', topic: 'science', example: 'WordNet definition: a master degree in science' },
      { en: 'River', vi: 'Dong song', level: 'a2-key', topic: 'nature', example: 'The river is blue.' },
      { en: 'Book', vi: 'Quyen sach', level: 'a2-key', topic: 'school', example: 'The book is open.' },
      { en: 'Garden', vi: 'Khu vuon', level: 'a2-key', topic: 'nature', example: 'The garden is green.' },
      { en: 'Teacher', vi: 'Giao vien', level: 'a2-key', topic: 'school', example: 'The teacher is kind.' },
    ]);

    expect(filtered.map((word) => word.en)).not.toContain('sm');
    expect(filtered.every((word) => word.vi !== 'translation_pending')).toBe(true);
    expect(filtered.map((word) => word.en)).toEqual(expect.arrayContaining(['River', 'Book', 'Garden', 'Teacher']));
  });
});
describe('filterWordBank', () => {
  it('includes words at or below the requested stage', () => {
    const filtered = filterWordBank(BANK, { level: 'b1-preliminary', min: 1 });
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

  it('does not expose untrusted imported examples in game questions', () => {
    const imported: WordPair[] = [
      { en: 'Novelword', vi: 'Tu moi', example: 'to stanf novelword the fire' },
      ...BANK,
    ];
    const fillQuestions = toFillBlankQuestions(imported, imported.length);
    const scrambleItems = toSentenceScrambles(imported, imported.length);

    expect(fillQuestions.find((question) => question.answer === 'novelword')?.sentence).toBe('The word for "Tu moi" is ___.');
    expect(scrambleItems.find((item) => item.hint === 'Tu moi')?.text).toBe('I am learning the word novelword.');
  });

  it('creates sentence-scramble items from examples', () => {
    const [sentence] = toSentenceScrambles(BANK, 1);
    expect(sentence.text.split(' ').length).toBeGreaterThan(2);
    expect(sentence.hint).toBeTruthy();
  });
});

