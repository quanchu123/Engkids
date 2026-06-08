import { describe, it, expect } from 'vitest';
import {
  createPet,
  applyDecay,
  applyAction,
  clampStat,
  coinRewardForCombo,
  expForLevel,
  levelFromExp,
  petActionReadiness,
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

  it('caps long offline decay and never goes below 0', () => {
    const p = createPet('char-fox', 'Cáo', 0);
    const after = applyDecay(p, 100 * HOUR);
    expect(after.hunger).toBe(0);
    expect(after.happiness).toBe(0);
    expect(after.clean).toBe(10);
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
  it('feeding raises hunger and grants exp + reports coin reward', () => {
    const base = { ...createPet('char-fox', 'Cáo', 0), hunger: 40 };
    const { pet, coinReward, expReward, quality } = applyAction(base, 'feed', 0);
    expect(coinReward).toBe(PET_ACTIONS.feed.coinReward);
    expect(expReward).toBe(13);
    expect(quality).toBe('helpful');
    expect(pet.hunger).toBe(clampStat(40 + 35 * 1.08));
    expect(pet.exp).toBe(expReward);
  });

  it('never exceeds the max stat and reduces reward when care is wasted', () => {
    const base = createPet('char-fox', 'Cáo', 0); // all 100
    const { pet, coinReward, expReward, quality } = applyAction(base, 'feed', 0);
    expect(pet.hunger).toBe(MAX_STAT);
    expect(coinReward).toBe(1);
    expect(expReward).toBe(4);
    expect(quality).toBe('wasted');
  });

  it('play raises happiness and reduces energy', () => {
    const base = { ...createPet('char-fox', 'Cáo', 0), happiness: 10, energy: 50 };
    const { pet } = applyAction(base, 'play', 0);
    expect(pet.happiness).toBe(clampStat(10 + 35 * 1.2));
    expect(pet.energy).toBe(clampStat(50 - 8 * 1.2));
  });

  it('applies decay before the action effect', () => {
    const base = createPet('char-fox', 'Cáo', 0); // full
    const { pet } = applyAction(base, 'bath', 2 * HOUR); // clean decays 5/h *2 = 10 -> 90, +45 -> 100
    expect(pet.clean).toBe(100);
    // hunger decayed 16 with no action effect
    expect(pet.hunger).toBe(100 - 16);
  });

  it('reduces repeated care when the same action is spammed too soon', () => {
    const first = applyAction({ ...createPet('char-fox', 'CÃ¡o', 0), hunger: 70 }, 'feed', 0);
    const second = applyAction(first.pet, 'feed', 60_000);
    expect(second.quality).toBe('wasted');
    expect(second.expReward).toBeLessThan(first.expReward);
  });
});

describe('pet care rhythm', () => {
  it('rewards varied care with a small rhythm bonus', () => {
    const base = { ...createPet('char-fox', 'Cao', 0), hunger: 45, happiness: 45, clean: 45, energy: 45 };
    const feed = applyAction(base, 'feed', 0);
    const play = applyAction(feed.pet, 'play', 3 * 60_000);
    const bath = applyAction(play.pet, 'bath', 6 * 60_000);

    expect(feed.rhythmBonus).toBe(0);
    expect(play.rhythmBonus).toBe(0.05);
    expect(bath.rhythmBonus).toBe(0.1);
    expect(bath.pet.careRhythm?.chain).toBe(3);
  });
});

describe('coinRewardForCombo', () => {
  it('adds the combo as a bonus, capped at +5', () => {
    expect(coinRewardForCombo('feed', 0)).toBe(PET_ACTIONS.feed.coinReward);
    expect(coinRewardForCombo('feed', 3)).toBe(PET_ACTIONS.feed.coinReward + 3);
    expect(coinRewardForCombo('feed', 99)).toBe(PET_ACTIONS.feed.coinReward + 5);
  });

  it('treats negative combo as zero bonus', () => {
    expect(coinRewardForCombo('play', -4)).toBe(PET_ACTIONS.play.coinReward);
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

describe('petActionReadiness', () => {
  it('marks urgent actions when the primary need is low', () => {
    const p = { ...createPet('char-fox', 'CÃ¡o', 0), hunger: 18 };
    expect(petActionReadiness(p, 'feed', 0).tone).toBe('urgent');
  });

  it('warns when playing while the pet is exhausted', () => {
    const p = { ...createPet('char-fox', 'CÃ¡o', 0), happiness: 20, energy: 10 };
    expect(petActionReadiness(p, 'play', 0).tone).toBe('tired');
  });
});
