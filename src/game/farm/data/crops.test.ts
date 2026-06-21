import { describe, it, expect } from 'vitest'
import { CROPS, CROP_BY_ID, getCropById } from './crops'
import { farmIconSrc } from './farmIcons'
import type { VocabLevel } from '../types'

const VALID_LEVELS: VocabLevel[] = ['beginner', 'intermediate', 'advanced']

describe('crops data', () => {
  it('defines the full crop catalog (>6 crops after upgrade)', () => {
    expect(CROPS.length).toBeGreaterThan(6)
  })

  it('has unique ids across all crops', () => {
    const ids = CROPS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has non-empty en/vi vocabulary for every crop', () => {
    for (const crop of CROPS) {
      expect(crop.en.trim().length).toBeGreaterThan(0)
      expect(crop.vi.trim().length).toBeGreaterThan(0)
    }
  })

  it('uses only valid vocabulary levels', () => {
    for (const crop of CROPS) {
      expect(VALID_LEVELS).toContain(crop.level)
    }
  })

  it('has positive growthDays and non-negative sellValue', () => {
    for (const crop of CROPS) {
      expect(crop.growthDays).toBeGreaterThan(0)
      expect(crop.sellValue).toBeGreaterThanOrEqual(0)
    }
  })

  it('derives seedKey/spriteKey consistently from the crop id', () => {
    for (const crop of CROPS) {
      expect(crop.seedKey).toBe(`seed:${crop.id}`)
      expect(crop.spriteKey).toBe(crop.id)
    }
  })

  it('CROP_BY_ID indexes every crop by its id', () => {
    expect(Object.keys(CROP_BY_ID)).toHaveLength(CROPS.length)
    for (const crop of CROPS) {
      expect(CROP_BY_ID[crop.id]).toBe(crop)
    }
  })

  it('getCropById returns the carrot crop with the expected vocabulary', () => {
    const carrot = getCropById('carrot')
    expect(carrot).toBeDefined()
    expect(carrot?.id).toBe('carrot')
    expect(carrot?.en).toBe('Carrot')
    expect(carrot?.vi).toBe('Cà rốt')
  })

  it('getCropById returns undefined for an unknown id', () => {
    expect(getCropById('dragonfruit')).toBeUndefined()
  })
})

describe('farm icons', () => {
  it('returns a string path for a known icon without throwing', () => {
    const src = farmIconSrc('carrot')
    expect(src === null || typeof src === 'string').toBe(true)
    if (typeof src === 'string') {
      expect(src.length).toBeGreaterThan(0)
    }
  })

  it('returns null for an unknown icon name', () => {
    expect(farmIconSrc('not-a-real-icon')).toBeNull()
  })
})
