import { describe, it, expect } from 'vitest';
import {
  createPet,
  applyDecay,
  applyAction,
  clampStat,
  expForLevel,
  levelFromExp,
  petWellbeing,
  petMood,
  PET_ACTIONS,
  MAX_STAT,
} from './pet';

const HOUR = 3_600_000;

describe('clampStat', () => {
  it('clamps to 0..100 and rounds', () => {
    expect(clampStat(-5)).toBe(0);
    expect(clampStat(150)).toBe(100);
    expect(clampStat(42.6)).toBe(43);
    expect(clampStat(NaN)).toBe(0);
  });
});

describe('createPet', () => {
  it('starts with full stats', () => {
    const p = createPet('char-fox', 'Cáo', 1000);
    expect(p.hunger).toBe(100);
    expect(p.happiness).toBe(100);
    expect(p.clean).toBe(100);
    expect(p.energy).toBe(100);
    expect(p.exp).toBe(0);
    expect(p.lastTick).toBe(1000);
  });
});

describe('applyDecay', () => {
  it('reduces stats by the hourly rate', () => {
    const p = createPet('char-fox', 'Cáo', 0);
    const after = applyDecay(p, 1 * HOUR);
    expect(after.hunger).toBe(100 - 8);
    expect(after.energy).toBe(100 - 7);
    expect(after.lastTick).toBe(1 * HOUR);
  });

  it('never goes below 0 over a long absence', () => {
    const p = createPet('char-fox', 'Cáo', 0);
    const after = applyDecay(p, 100 * HOUR);
    expect(after.hunger).toBe(0);
    expect(after.happiness).toBe(0);
    expect(after.clean).toBe(0);
    expect(after.energy).toBe(0);
  });

  it('is a no-op (besides lastTick) when no time passed', () => {
    const p = { ...createPet('char-fox', 'Cáo', 500), hunger: 60 };
    const after = applyDecay(p, 500);
    expect(after.hunger).toBe(60);
    expect(after.lastTick).toBe(500);
  });
});

describe('applyAction', () => {
  it('feeding raises hunger and grants exp + reports cost', () => {
    const base = { ...createPet('char-fox', 'Cáo', 0), hunger: 40 };
    const { pet, cost } = applyAction(base, 'feed', 0);
    expect(cost).toBe(PET_ACTIONS.feed.coinCost);
    expect(pet.hunger).toBe(clampStat(40 + 35));
    expect(pet.exp).toBe(PET_ACTIONS.feed.exp);
  });

  it('never exceeds the max stat', () => {
    const base = createPet('char-fox', 'Cáo', 0); // all 100
    const { pet } = applyAction(base, 'feed', 0);
    expect(pet.hunger).toBe(MAX_STAT);
  });

  it('play reduces energy and hunger', () => {
    const base = { ...createPet('char-fox', 'Cáo', 0), happiness: 10, energy: 50, hunger: 50 };
    const { pet } = applyAction(base, 'play', 0);
    expect(pet.happiness).toBe(clampStat(10 + 35));
    expect(pet.energy).toBe(clampStat(50 - 12));
    expect(pet.hunger).toBe(clampStat(50 - 6));
  });

  it('applies decay before the action effect', () => {
    const base = createPet('char-fox', 'Cáo', 0); // full
    const { pet } = applyAction(base, 'bath', 2 * HOUR); // clean decays 5/h *2 = 10 -> 90, +45 -> 100
    expect(pet.clean).toBe(100);
    // hunger decayed 16 with no action effect
    expect(pet.hunger).toBe(100 - 16);
  });
});

describe('levels', () => {
  it('expForLevel grows with level', () => {
    expect(expForLevel(1)).toBe(100);
    expect(expForLevel(2)).toBe(160);
    expect(expForLevel(3)).toBe(220);
  });

  it('levelFromExp maps total exp to level + progress', () => {
    expect(levelFromExp(0).level).toBe(1);
    expect(levelFromExp(99).level).toBe(1);
    expect(levelFromExp(100).level).toBe(2);
    expect(levelFromExp(100 + 160).level).toBe(3);
    const l = levelFromExp(50);
    expect(l.intoLevel).toBe(50);
    expect(l.needed).toBe(100);
    expect(l.progress).toBeCloseTo(0.5, 5);
  });
});

describe('mood', () => {
  it('wellbeing averages the four needs', () => {
    const p = { ...createPet('char-fox', 'Cáo', 0), hunger: 80, happiness: 60, clean: 40, energy: 20 };
    expect(petWellbeing(p)).toBe(50);
  });

  it('maps wellbeing to mood buckets', () => {
    expect(petMood({ ...createPet('x', 'x', 0) })).toBe('happy'); // all 100
    expect(petMood({ ...createPet('x', 'x', 0), hunger: 40, happiness: 40, clean: 40, energy: 40 })).toBe('ok');
    expect(petMood({ ...createPet('x', 'x', 0), hunger: 10, happiness: 10, clean: 10, energy: 10 })).toBe('sad');
  });
});
