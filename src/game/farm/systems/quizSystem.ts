// Quiz system for the English Farming Game — R6 / Quiz_System upgrade.
//
// Pure TypeScript only — NO Phaser, NO React imports. Builds a short quiz for a
// harvested word and grades the player's answer. Supports multiple quiz modes
// (`meaning`, `listen`, `spelling`). Reuses the shared word bank
// (`buildDistractors`, `DEFAULT_WORD_BANK`) so the quiz content stays consistent
// with the other vocabulary games and never shows an empty quiz
// (Property 3 / Req 2.8).

import { buildDistractors, DEFAULT_WORD_BANK, type WordPair } from '@/lib/word-bank'
import type { QuizMode } from '../types'

export type { QuizMode }

/** Number of answer choices presented to the player (1 correct + 3 distractors). */
const CHOICE_COUNT = 4
const DISTRACTOR_COUNT = CHOICE_COUNT - 1

/** A quiz for a collected word. Prompt is the Vietnamese meaning, answer is English. */
export interface FarmQuiz {
  /** Quiz mode: `meaning` (choose meaning), `listen` (hear & choose), `spelling` (type). */
  mode: QuizMode
  /** Vietnamese prompt shown to the player. */
  vi: string
  /** The correct English answer. */
  en: string
  /**
   * For `meaning`/`listen`: exactly 4 unique choices (case-insensitive),
   * always including `en`.
   * For `spelling`: empty (the player types/assembles the word).
   */
  choices: string[]
}

/** Fisher-Yates shuffle (returns a new array; does not mutate the input). */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Build a quiz for the given answer word and mode.
 *
 * - `meaning`/`listen`: produces exactly `CHOICE_COUNT` unique choices
 *   (case-insensitive) — the correct answer plus distractors drawn from `bank`.
 *   If `bank` is empty/null or cannot supply enough distinct distractors, the
 *   choices are topped up from `DEFAULT_WORD_BANK` so the quiz is always valid
 *   and non-empty.
 * - `spelling`: `choices` is empty; the player types/assembles the word.
 *
 * The returned quiz always carries the requested `mode`.
 */
export function buildQuizForWord(
  bank: WordPair[] | null | undefined,
  answer: { en: string; vi: string },
  mode: QuizMode = 'meaning'
): FarmQuiz {
  // Spelling mode has no multiple-choice options.
  if (mode === 'spelling') {
    return { mode, vi: answer.vi, en: answer.en, choices: [] }
  }

  const safeBank = Array.isArray(bank) && bank.length > 0 ? bank : DEFAULT_WORD_BANK

  // Track choices case-insensitively to guarantee uniqueness (incl. the answer).
  const used = new Set<string>([answer.en.toLowerCase()])
  const distractors: string[] = []

  const addDistractor = (en: string) => {
    const key = en.toLowerCase()
    if (used.has(key)) return
    used.add(key)
    distractors.push(en)
  }

  // First pass: distractors from the provided bank.
  for (const d of buildDistractors(safeBank, answer.en, DISTRACTOR_COUNT)) {
    addDistractor(d)
    if (distractors.length >= DISTRACTOR_COUNT) break
  }

  // Top up from the default bank if the provided bank was too small.
  if (distractors.length < DISTRACTOR_COUNT) {
    for (const w of DEFAULT_WORD_BANK) {
      addDistractor(w.en)
      if (distractors.length >= DISTRACTOR_COUNT) break
    }
  }

  return {
    mode,
    vi: answer.vi,
    en: answer.en,
    choices: shuffle([answer.en, ...distractors]),
  }
}

/**
 * Grade a quiz answer.
 *
 * - If `choice` is null/undefined/empty, the answer is graded as incorrect
 *   (Req 2.6).
 * - `spelling`: correct iff the choice matches `en` after trimming surrounding
 *   whitespace and ignoring case (Req 2.4).
 * - `meaning`/`listen`: correct iff the choice matches `en` (case-insensitive,
 *   trimmed) (Req 2.5).
 *
 * `correctAnswer` always echoes `quiz.en` so the UI can display it.
 */
export function gradeQuiz(
  quiz: FarmQuiz,
  choice: string | null | undefined
): { correct: boolean; correctAnswer: string } {
  const correctAnswer = quiz.en

  // Undetermined answer (null/undefined/empty) → incorrect (Req 2.6).
  if (choice == null || choice.trim() === '') {
    return { correct: false, correctAnswer }
  }

  const normalizedChoice = choice.trim().toLowerCase()
  const correct = normalizedChoice === quiz.en.trim().toLowerCase()
  return { correct, correctAnswer }
}
