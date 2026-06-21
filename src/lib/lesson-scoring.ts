// Pure scoring + helper logic for the lesson player. Kept free of React/DOM so
// it can be unit-tested directly (Vitest, environment: node). The lesson page
// imports these to aggregate per-step results into one honest lesson score and
// to bridge accuracy into the SM-2 review quality scale.

import type { LessonStepType } from '@/services/lessons';

// One word the child interacted with during a step, plus whether they got it
// right. Feeds the lesson -> SRS bridge (Stage 5).
export interface WordOutcome {
  en: string;
  vi: string;
  pos?: string;
  example?: string;
  correct: boolean;
  // How many tries before getting it right (1 = first try). Drives the SM-2
  // quality in qualityFromAccuracy. Defaults to 1 when omitted.
  attempts?: number;
  // True for words only shown passively (vocab card, reading) — never actively
  // tested. Stage 5 schedules these at PASSIVE_QUALITY instead of by accuracy.
  passive?: boolean;
}

// What every step renderer reports back to the player when the child finishes
// it. Passive steps report { correct: 0, total: 0, scorePercent: 100 } so they
// never drag the lesson score down or block the "next" gate.
export interface StepResult {
  stepId: string;
  stepType: LessonStepType;
  correct: number;
  total: number;
  scorePercent: number; // 0..100
  words: WordOutcome[];
}

function clampPercent(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Aggregate per-step results into a single 0..100 lesson score. Only steps that
// actually tested the child (total > 0) count toward the denominator; a lesson
// made entirely of passive steps falls back to 100 so legacy/old lessons aren't
// punished for having nothing to score.
export function aggregateLessonScore(results: StepResult[]): number {
  const scored = results.filter((r) => r.total > 0);
  if (scored.length === 0) return 100;

  const totalCorrect = scored.reduce((sum, r) => sum + r.correct, 0);
  const totalQuestions = scored.reduce((sum, r) => sum + r.total, 0);
  if (totalQuestions === 0) return 100;

  return clampPercent((totalCorrect / totalQuestions) * 100);
}

// Map a single word's performance to the SM-2 quality scale (0..5) used by
// submitReview. The policy mirrors how a teacher would grade recall:
//   - got it right on the first try        -> 5 (easy)
//   - right, but needed one or more retries -> 3 (passed, but shaky)
//   - wrong / failed pronunciation          -> 1 (lapse)
//   - only seen passively (no test)         -> 3 (enters the queue, not over-promoted)
// `attempts` is how many tries the child took before getting it right (1 = first
// try). For a wrong answer, pass correct = false.
export function qualityFromAccuracy(correct: boolean, attempts: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (!correct) return 1;
  if (attempts <= 1) return 5;
  if (attempts === 2) return 4;
  return 3;
}

// Quality for a word that was only shown passively (vocab card, reading) and
// never actively tested. Enters the SRS queue at a neutral level so it gets
// reviewed soon without being treated as mastered.
export const PASSIVE_QUALITY: 0 | 1 | 2 | 3 | 4 | 5 = 3;

// Build a multiple-choice option set: the correct answer plus up to (n-1)
// distractors drawn from `pool` (other answers in the same lesson). Distractors
// are de-duplicated against the answer and each other. The caller passes a
// shuffle fn so tests stay deterministic (default uses Math.random).
export function buildChoices(
  answer: string,
  pool: string[],
  n: number = 4,
  shuffle: <T>(arr: T[]) => T[] = defaultShuffle,
): string[] {
  const seen = new Set<string>([answer.trim().toLowerCase()]);
  const distractors: string[] = [];
  for (const candidate of shuffle(pool)) {
    const key = candidate.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate);
    if (distractors.length >= n - 1) break;
  }
  return shuffle([answer, ...distractors]);
}

// Fisher-Yates shuffle (returns a new array, leaves input untouched).
function defaultShuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Normalize a token for order-checking: lowercase, strip surrounding
// punctuation, collapse whitespace. So "Hello," and "hello" compare equal.
function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'-]/gu, '')
    .trim();
}

// Check whether the child's arranged tiles match the target word order,
// comparing token-by-token after normalization. Length mismatch = wrong.
export function checkWordOrder(tiles: string[], answer: string[]): boolean {
  if (tiles.length !== answer.length) return false;
  return tiles.every((tile, i) => normalizeToken(tile) === normalizeToken(answer[i]));
}
