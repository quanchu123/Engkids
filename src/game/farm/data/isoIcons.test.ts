import { describe, it, expect } from 'vitest'
import { isoIconSrc, isoFallbackSrc } from './isoIcons'

describe('isoIconSrc (preferred override source)', () => {
  it('prefers a user override path under assets/<name>.png for known art', () => {
    expect(isoIconSrc('carrot')).toBe('/games/english-farm/assets/carrot.png')
    expect(isoIconSrc('farmer')).toBe('/games/english-farm/assets/farmer.png')
    expect(isoIconSrc('watering-can')).toBe(
      '/games/english-farm/assets/watering-can.png',
    )
  })

  it('returns null for unknown names (never references arbitrary files)', () => {
    expect(isoIconSrc('not-a-real-icon')).toBeNull()
    expect(isoIconSrc('')).toBeNull()
  })

  it('never throws for odd inputs', () => {
    expect(() => isoIconSrc(undefined as unknown as string)).not.toThrow()
    expect(isoIconSrc(undefined as unknown as string)).toBeNull()
  })
})

describe('isoFallbackSrc (bundled iso art)', () => {
  it('returns the manifest iso path for known art', () => {
    expect(isoFallbackSrc('carrot')).toBe('/games/english-farm/iso/carrot.png')
    expect(isoFallbackSrc('star')).toBe('/games/english-farm/iso/star.png')
  })

  it('returns null for unknown names', () => {
    expect(isoFallbackSrc('not-a-real-icon')).toBeNull()
  })

  it('points at a different location than the override so the scene can fall back', () => {
    const override = isoIconSrc('tomato')
    const fallback = isoFallbackSrc('tomato')
    expect(override).not.toBeNull()
    expect(fallback).not.toBeNull()
    expect(override).not.toBe(fallback)
  })
})
