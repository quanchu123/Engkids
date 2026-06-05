// Quiz system for the English Farming Game (MVP) — R6.
//
// Pure TypeScript only — NO Phaser, NO React imports. Builds a short
// multiple-choice quiz for a harvested word and grades the player's answer.
// Reuses the shared word bank (`buildDistractors`, `DEFAULT_WORD_BANK`) so the
// quiz content stays consistent with the other vocabulary games and never
// shows an empty quiz (Property 6 / Req 6.5).

import { buildDistractors, DEFAULT_WORD_BANK, type WordPair } from '@/lib/word-bank'

/** Number of answer choices presented to the player (1 correct + 3 distractors). */
const CHOICE_COUNT = 4
const DISTRACTOR_COUNT = CHOICE_COUNT - 1

/** A multiple-choice quiz: prompt is the Vietnamese meaning, answer is English. */
export interface FarmQuiz {
  /** Vietnamese prompt shown to the player. */
  vi: string
  /** The correct English answer. */
  en: string
  /** Shuffled list of choices; always includes `en`, always unique. */
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
 * Build a quiz for the given answer word.
 *
 * Produces exactly `CHOICE_COUNT` unique choices: the correct answer plus
 * distractors drawn from `bank`. If `bank` is empty/null or cannot supply
 * enough distinct distractors, the choices are topped up from
 * `DEFAULT_WORD_BANK` so the quiz is always valid and non-empty.
 */
export function buildQuizForWord(
  bank: WordPair[] | null | undefined,
  answer: { en: string; vi: string }
): FarmQuiz {
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
    vi: answer.vi,
    en: answer.en,
    choices: shuffle([answer.en, ...distractors]),
  }
}

/**
 * Grade a quiz answer. `correct` is true if and only if the chosen string
 * exactly matches the quiz's correct answer; `correctAnswer` always echoes the
 * correct answer so the UI can display it (e.g. on a wrong answer).
 */
export function gradeQuiz(
  quiz: FarmQuiz,
  choice: string
): { correct: boolean; correctAnswer: string } {
  return { correct: choice === quiz.en, correctAnswer: quiz.en }
}
