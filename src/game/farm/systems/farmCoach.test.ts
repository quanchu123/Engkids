import { describe, expect, it } from 'vitest';
import { applyFarmCoachAction, getFarmCoachSuggestion } from './farmCoach';
import { plant, till, water } from './farmingSystem';
import type { FarmState } from '../types';

function makeState(seedQty = 2): FarmState {
  return {
    version: 2,
    day: 1,
    coins: 50,
    xp: 0,
    level: 1,
    grid: {
      cols: 2,
      rows: 1,
      plots: [
        { id: 0, state: 'empty', crop: null },
        { id: 1, state: 'empty', crop: null },
      ],
    },
    inventory: {
      slotLimit: 20,
      items: seedQty > 0 ? [{ itemId: 'seed:carrot', kind: 'seed', refId: 'carrot', qty: seedQty }] : [],
    },
    collectedWords: [],
    unlockedCropIds: ['carrot'],
    dailyQuest: { goal: 'harvest', target: 2, progress: 0, rewardCoins: 10, claimed: false, issuedDay: 1 },
    updatedAt: new Date(0).toISOString(),
  };
}

describe('farm coach', () => {
  it('starts by tilling an empty plot', () => {
    const suggestion = getFarmCoachSuggestion(makeState());
    expect(suggestion.action).toBe('till');
    expect(suggestion.plotId).toBe(0);
  });

  it('plants tilled plots with an available seed', () => {
    const tilled = till(makeState(), 0).state;
    const suggestion = getFarmCoachSuggestion(tilled);
    expect(suggestion.action).toBe('plant');
    expect(suggestion.seedId).toBe('carrot');
    const applied = applyFarmCoachAction(tilled, suggestion);
    expect('ok' in applied && applied.ok).toBe(true);
  });

  it('waters planted crops before advancing the day', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot').state;
    expect(getFarmCoachSuggestion(planted).action).toBe('water');
    const watered = water(planted, 0).state;
    expect(getFarmCoachSuggestion(watered).action).toBe('till');
  });

  it('points to harvest when a crop is mature', () => {
    const planted = plant(till(makeState(), 0).state, 0, 'carrot').state;
    const mature: FarmState = {
      ...planted,
      grid: {
        ...planted.grid,
        plots: planted.grid.plots.map((plot) =>
          plot.id === 0 && plot.crop ? { ...plot, crop: { ...plot.crop, stage: 3 } } : plot,
        ),
      },
    };
    expect(getFarmCoachSuggestion(mature).action).toBe('harvest');
  });
});
