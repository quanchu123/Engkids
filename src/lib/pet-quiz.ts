/**
 * Pet game vocabulary quiz — pure & testable (no React, no storage).
 *
 * The mythical pet only grows when the child answers English questions, so
 * every care action (feed / play / bath / sleep) is gated behind a quick
 * multiple-choice quiz drawn from the shared word bank. This module turns a
 * WordPair list into 4-option questions in either direction.
 */

import { WordPair, DEFAULT_WORD_BANK } from './word-bank';

export type QuizDirection = 'vi-to-en' | 'en-to-vi';

export interface PetQuiz {
  /** The source word pair. */
  word: WordPair;
  direction: QuizDirection;
  /** Text shown to the child (the side they must translate FROM). */
  prompt: string;
  /** The correct option text (the side they translate TO). */
  answer: string;
  /** 4 options including the answer, shuffled. */
  options: string[];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick up to `count` distinct distractor strings from the bank on the given
 * side ('en' | 'vi'), excluding the correct answer (case-insensitive).
 */
export function pickDistractors(
  bank: WordPair[],
  answer: string,
  side: 'en' | 'vi',
  count: number,
  rng: () => number = Math.random,
): string[] {
  const lower = answer.toLowerCase();
  const seen = new Set<string>([lower]);
  const out: string[] = [];
  for (const w of shuffle(bank, rng)) {
    const val = w[side];
    const key = val.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(val);
    if (out.length >= count) break;
  }
  return out;
}

/**
 * Build a single quiz from the bank. Falls back to DEFAULT_WORD_BANK when the
 * provided bank is too small to make 4 distinct options.
 */
export function buildPetQuiz(
  bank: WordPair[],
  direction: QuizDirection,
  rng: () => number = Math.random,
): PetQuiz {
  const source = bank && bank.length >= 4 ? bank : DEFAULT_WORD_BANK;
  const word = source[Math.floor(rng() * source.length)];
  const promptSide: 'en' | 'vi' = direction === 'vi-to-en' ? 'vi' : 'en';
  const answerSide: 'en' | 'vi' = direction === 'vi-to-en' ? 'en' : 'vi';
  const answer = word[answerSide];
  const distractors = pickDistractors(source, answer, answerSide, 3, rng);
  const options = shuffle([answer, ...distractors], rng);
  return { word, direction, prompt: word[promptSide], answer, options };
}
