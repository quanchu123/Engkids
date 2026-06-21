import { describe, it, expect } from 'vitest'
import { buildQuizForWord, gradeQuiz, type FarmQuiz } from './quizSystem'
import { DEFAULT_WORD_BANK, type WordPair } from '@/lib/word-bank'

// Property 6: Quiz luôn hợp lệ & chấm đúng.
// Quiz sinh ra luôn có đáp án đúng trong choices, đủ 4 lựa chọn, không trùng;
// gradeQuiz trả correct=true IFF choice == đáp án; bank rỗng vẫn sinh quiz hợp lệ.
// **Validates: Requirements 6.2, 6.5**

/** Assert a quiz satisfies the structural invariants of Property 6. */
function expectValidQuiz(quiz: FarmQuiz, answer: { en: string; vi: string }) {
  // Prompt + answer are wired correctly.
  expect(quiz.vi).toBe(answer.vi)
  expect(quiz.en).toBe(answer.en)
  // Exactly 4 choices.
  expect(quiz.choices).toHaveLength(4)
  // Correct answer is present among the choices.
  expect(quiz.choices).toContain(answer.en)
  // No duplicate choices (case-insensitive).
  const lower = quiz.choices.map((c) => c.toLowerCase())
  expect(new Set(lower).size).toBe(quiz.choices.length)
}

describe('buildQuizForWord — structure (Property 6)', () => {
  it('always includes the correct answer, has exactly 4 unique choices', () => {
    const answer = { en: 'Carrot', vi: 'Cà rốt' }
    const quiz = buildQuizForWord(DEFAULT_WORD_BANK, answer)
    expectValidQuiz(quiz, answer)
  })

  it('is robust to shuffle randomness across many words and iterations', () => {
    for (let iter = 0; iter < 50; iter++) {
      const w = DEFAULT_WORD_BANK[iter % DEFAULT_WORD_BANK.length]
      const answer = { en: w.en, vi: w.vi }
      const quiz = buildQuizForWord(DEFAULT_WORD_BANK, answer)
      expectValidQuiz(quiz, answer)
    }
  })

  it('tops up distractors from defaults when the bank is too small', () => {
    // A bank with only one usable distractor besides the answer.
    const tinyBank: WordPair[] = [
      { en: 'Carrot', vi: 'Cà rốt' },
      { en: 'Tomato', vi: 'Cà chua' },
    ]
    const answer = { en: 'Carrot', vi: 'Cà rốt' }
    const quiz = buildQuizForWord(tinyBank, answer)
    expectValidQuiz(quiz, answer)
  })

  it('builds a valid quiz from defaults when the bank is empty', () => {
    const answer = { en: 'Carrot', vi: 'Cà rốt' }
    const quiz = buildQuizForWord([], answer)
    expectValidQuiz(quiz, answer)
    // Choices must be non-empty (Req 6.5: never show an empty quiz).
    expect(quiz.choices.length).toBeGreaterThan(0)
  })

  it('builds a valid quiz from defaults when the bank is null/undefined', () => {
    const answer = { en: 'Tomato', vi: 'Cà chua' }
    const fromNull = buildQuizForWord(null, answer)
    const fromUndefined = buildQuizForWord(undefined, answer)
    expectValidQuiz(fromNull, answer)
    expectValidQuiz(fromUndefined, answer)
  })
})

describe('gradeQuiz — grading (Property 6)', () => {
  it('returns correct=true only when the choice equals the answer', () => {
    const answer = { en: 'Carrot', vi: 'Cà rốt' }
    const quiz = buildQuizForWord(DEFAULT_WORD_BANK, answer)

    for (const choice of quiz.choices) {
      const result = gradeQuiz(quiz, choice)
      expect(result.correct).toBe(choice === quiz.en)
      // correctAnswer always equals quiz.en regardless of the choice.
      expect(result.correctAnswer).toBe(quiz.en)
    }
  })

  it('returns correct=false for a choice not in the quiz', () => {
    const answer = { en: 'Carrot', vi: 'Cà rốt' }
    const quiz = buildQuizForWord(DEFAULT_WORD_BANK, answer)
    const result = gradeQuiz(quiz, '___not-a-choice___')
    expect(result.correct).toBe(false)
    expect(result.correctAnswer).toBe(quiz.en)
  })

  it('grades the exact correct answer as true across many words', () => {
    for (let iter = 0; iter < 50; iter++) {
      const w = DEFAULT_WORD_BANK[iter % DEFAULT_WORD_BANK.length]
      const answer = { en: w.en, vi: w.vi }
      const quiz = buildQuizForWord(DEFAULT_WORD_BANK, answer)
      expect(gradeQuiz(quiz, answer.en).correct).toBe(true)
    }
  })
})
