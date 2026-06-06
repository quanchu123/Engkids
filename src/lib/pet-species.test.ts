import { describe, it, expect } from 'vitest';
import {
  PET_SPECIES,
  getSpecies,
  stageIndexForLevel,
  currentStage,
  nextStage,
  isFinalStage,
  resolvePetArt,
} from './pet-species';

describe('PET_SPECIES shape', () => {
  it('every chain has 4 ascending stages starting at level 1', () => {
    expect(PET_SPECIES.length).toBeGreaterThanOrEqual(4);
    for (const s of PET_SPECIES) {
      expect(s.stages.length).toBe(4);
      expect(s.stages[0].minLevel).toBe(1);
      for (let i = 1; i < s.stages.length; i += 1) {
        expect(s.stages[i].minLevel).toBeGreaterThan(s.stages[i - 1].minLevel);
      }
      // ids unique within chain art names are non-empty
      for (const stage of s.stages) {
        expect(stage.art.length).toBeGreaterThan(0);
        expect(stage.nameVi.length).toBeGreaterThan(0);
      }
    }
  });

  it('species ids are unique', () => {
    const ids = PET_SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getSpecies', () => {
  it('finds a known chain and misses unknown', () => {
    expect(getSpecies('thuy-long')?.nameVi).toBe('Thủy Long');
    expect(getSpecies('nope')).toBeUndefined();
  });
});

describe('stageIndexForLevel', () => {
  const sp = getSpecies('thuy-long')!;
  it('maps level to the highest reached stage', () => {
    expect(stageIndexForLevel(sp, 1)).toBe(0);
    expect(stageIndexForLevel(sp, 2)).toBe(0);
    expect(stageIndexForLevel(sp, 3)).toBe(1);
    expect(stageIndexForLevel(sp, 5)).toBe(1);
    expect(stageIndexForLevel(sp, 6)).toBe(2);
    expect(stageIndexForLevel(sp, 9)).toBe(2);
    expect(stageIndexForLevel(sp, 10)).toBe(3);
    expect(stageIndexForLevel(sp, 99)).toBe(3);
  });

  it('clamps very low levels to stage 0', () => {
    expect(stageIndexForLevel(sp, 0)).toBe(0);
    expect(stageIndexForLevel(sp, -5)).toBe(0);
  });
});

describe('currentStage / nextStage / isFinalStage', () => {
  const sp = getSpecies('ky-lan')!;
  it('returns the matching stage art', () => {
    expect(currentStage(sp, 1).art).toBe('char-dino-egg');
    expect(currentStage(sp, 6).art).toBe('char-pegasus');
    expect(currentStage(sp, 10).art).toBe('char-unicorn');
  });

  it('nextStage teases the upcoming form, null when maxed', () => {
    expect(nextStage(sp, 1)?.nameVi).toBe('Ngựa con');
    expect(nextStage(sp, 10)).toBeNull();
  });

  it('isFinalStage true only at the last stage', () => {
    expect(isFinalStage(sp, 9)).toBe(false);
    expect(isFinalStage(sp, 10)).toBe(true);
  });
});

describe('resolvePetArt', () => {
  it('resolves chain stage art', () => {
    expect(resolvePetArt('thuy-long', 1)).toBe('/avatars/char-dino-egg.png');
    expect(resolvePetArt('thuy-long', 10)).toBe('/avatars/char-dragon-eu.png');
  });

  it('falls back to legacy avatar id', () => {
    expect(resolvePetArt('char-fox', 5)).toBe('/avatars/char-fox.png');
  });
});
