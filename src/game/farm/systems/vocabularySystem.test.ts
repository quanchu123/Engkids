import { describe, it, expect } from 'vitest'
import { collectWord, bumpMastery, levelOfWord } from './vocabularySystem'
import type { CollectedWord } from '../types'

// Validates: Requirements 5.1, 5.4
// Property 5: collectWord never creates two entries with the same `en`
// (case-insensitive); repeat encounters only bump timesSeen. mastery always
// stays within [0, 5]. collectWord never mutates its input.

describe('collectWord — dedupe & no mutation (Property 5)', () => {
  it('collecting the same word twice (different case) yields ONE entry with timesSeen===2', () => {
    const start: CollectedWord[] = []
    const afterFirst = collectWord(start, { en: 'Carrot', vi: 'Cà rốt', level: 'beginner' })
    const afterSecond = collectWord(afterFirst, { en: 'carrot', vi: 'Cà rốt', level: 'beginner' })

    expect(afterSecond).toHaveLength(1)
    expect(afterSecond[0].en).toBe('Carrot') // original entry preserved
    expect(afterSecond[0].timesSeen).toBe(2)
    expect(afterSecond[0].mastery).toBe(0)
    expect(afterSecond[0].vi).toBe('Cà rốt')
  })

  it('appends a new word with timesSeen:1, mastery:0 and an ISO firstCollectedAt', () => {
    const result = collectWord([], { en: 'Tomato', vi: 'Cà chua', level: 'intermediate' })

    expect(result).toHaveLength(1)
    const word = result[0]
    expect(word.timesSeen).toBe(1)
    expect(word.mastery).toBe(0)
    expect(word.level).toBe('intermediate')
    // firstCollectedAt is a valid ISO timestamp.
    expect(() => new Date(word.firstCollectedAt).toISOString()).not.toThrow()
    expect(new Date(word.firstCollectedAt).toISOString()).toBe(word.firstCollectedAt)
  })

  it('keeps distinct words separate', () => {
    let words: CollectedWord[] = []
    words = collectWord(words, { en: 'Carrot', vi: 'Cà rốt', level: 'beginner' })
    words = collectWord(words, { en: 'Tomato', vi: 'Cà chua', level: 'intermediate' })
    words = collectWord(words, { en: 'Corn', vi: 'Ngô', level: 'beginner' })

    expect(words).toHaveLength(3)
    expect(words.map((w) => w.en)).toEqual(['Carrot', 'Tomato', 'Corn'])
  })

  it('does not mutate the input array (reference inequality + original unchanged)', () => {
    const original: CollectedWord[] = [
      {
        en: 'Carrot',
        vi: 'Cà rốt',
        level: 'beginner',
        timesSeen: 1,
        mastery: 2,
        firstCollectedAt: '2024-01-01T00:00:00.000Z',
        timesCorrect: 0,
        nextReviewDay: 0,
      },
    ]
    const snapshot = JSON.parse(JSON.stringify(original))

    // Re-collecting an existing word.
    const bumped = collectWord(original, { en: 'carrot', vi: 'Cà rốt', level: 'beginner' })
    expect(bumped).not.toBe(original) // new array reference
    expect(bumped[0]).not.toBe(original[0]) // new entry object
    expect(original).toEqual(snapshot) // original untouched

    // Collecting a brand-new word.
    const appended = collectWord(original, { en: 'Tomato', vi: 'Cà chua', level: 'intermediate' })
    expect(appended).not.toBe(original)
    expect(appended).toHaveLength(2)
    expect(original).toEqual(snapshot) // still untouched
  })
})

describe('bumpMastery — clamp to [0,5] (Property 5)', () => {
  const base: CollectedWord[] = [
    {
      en: 'Carrot',
      vi: 'Cà rốt',
      level: 'beginner',
      timesSeen: 1,
      mastery: 4,
      firstCollectedAt: '2024-01-01T00:00:00.000Z',
      timesCorrect: 0,
      nextReviewDay: 0,
    },
  ]

  it('never exceeds 5 when bumping beyond the max', () => {
    const result = bumpMastery(base, 'Carrot', 10)
    expect(result[0].mastery).toBe(5)
  })

  it('never goes below 0 with a large negative delta', () => {
    const result = bumpMastery(base, 'Carrot', -10)
    expect(result[0].mastery).toBe(0)
  })

  it('applies a normal delta within range', () => {
    const result = bumpMastery(base, 'carrot', 1) // case-insensitive match
    expect(result[0].mastery).toBe(5)
  })

  it('returns a new array unchanged when the word is not found', () => {
    const result = bumpMastery(base, 'Tomato', 3)
    expect(result).not.toBe(base)
    expect(result).toEqual(base)
  })

  it('does not mutate the input array', () => {
    const snapshot = JSON.parse(JSON.stringify(base))
    const result = bumpMastery(base, 'Carrot', 2)
    expect(result).not.toBe(base)
    expect(result[0]).not.toBe(base[0])
    expect(base).toEqual(snapshot)
  })

  it('clamps repeated bumps so mastery always stays within [0,5]', () => {
    let words: CollectedWord[] = [
      {
        en: 'Corn',
        vi: 'Ngô',
        level: 'beginner',
        timesSeen: 1,
        mastery: 0,
        firstCollectedAt: '2024-01-01T00:00:00.000Z',
        timesCorrect: 0,
        nextReviewDay: 0,
      },
    ]
    // Apply many positive then negative bumps; mastery must never leave [0,5].
    for (let i = 0; i < 10; i++) {
      words = bumpMastery(words, 'Corn', 1)
      expect(words[0].mastery).toBeGreaterThanOrEqual(0)
      expect(words[0].mastery).toBeLessThanOrEqual(5)
    }
    for (let i = 0; i < 10; i++) {
      words = bumpMastery(words, 'Corn', -1)
      expect(words[0].mastery).toBeGreaterThanOrEqual(0)
      expect(words[0].mastery).toBeLessThanOrEqual(5)
    }
  })
})

describe('levelOfWord — deterministic length heuristic', () => {
  it('classifies <=4 letters as beginner', () => {
    expect(levelOfWord('Corn')).toBe('beginner')
    expect(levelOfWord('Pea')).toBe('beginner')
  })

  it('classifies 5-7 letters as intermediate', () => {
    expect(levelOfWord('Carrot')).toBe('intermediate') // 6 letters
    expect(levelOfWord('Tomato')).toBe('intermediate') // 6 letters
  })

  it('classifies >7 letters as advanced', () => {
    expect(levelOfWord('Strawberry')).toBe('advanced') // 10 letters
  })

  it('defaults to beginner for empty / non-alphabetic input', () => {
    expect(levelOfWord('')).toBe('beginner')
    expect(levelOfWord('123')).toBe('beginner')
  })

  it('is deterministic (same input -> same output)', () => {
    expect(levelOfWord('Pumpkin')).toBe(levelOfWord('Pumpkin'))
  })
})
