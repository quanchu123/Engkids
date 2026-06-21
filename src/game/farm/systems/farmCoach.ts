import { advanceDayWithWeather, plant, till, water } from './farmingSystem';
import type { FarmState, Plot, Result } from '../types';

export type FarmCoachAction = 'till' | 'plant' | 'water' | 'advance-day' | 'harvest' | 'none';

export interface FarmCoachSuggestion {
  action: FarmCoachAction;
  plotId?: number;
  seedId?: string;
  messageVi: string;
}

function firstPlot(state: FarmState, predicate: (plot: Plot) => boolean): Plot | undefined {
  return state.grid.plots.find(predicate);
}

export function getFarmCoachSuggestion(state: FarmState): FarmCoachSuggestion {
  const mature = firstPlot(state, (plot) => plot.state === 'planted' && !!plot.crop && plot.crop.stage >= 3);
  if (mature) {
    return { action: 'harvest', plotId: mature.id, messageVi: `Thu hoạch ô ${mature.id + 1} để mở quiz từ mới.` };
  }

  const unwatered = firstPlot(state, (plot) => plot.state === 'planted' && !!plot.crop && !plot.crop.wateredToday);
  if (unwatered) {
    return { action: 'water', plotId: unwatered.id, messageVi: `Tưới ô ${unwatered.id + 1} để cây lớn nhanh hơn.` };
  }

  const tilled = firstPlot(state, (plot) => plot.state === 'tilled');
  if (tilled) {
    const seedItem = state.inventory.items.find((item) => item.kind === 'seed' && item.qty > 0);
    return {
      action: 'plant',
      plotId: tilled.id,
      seedId: seedItem?.refId,
      messageVi: seedItem
        ? `Gieo ${seedItem.refId} vào ô ${tilled.id + 1}.`
        : `Không còn hạt giống, hãy vào cửa hàng trước.`,
    };
  }

  const empty = firstPlot(state, (plot) => plot.state === 'empty');
  if (empty) {
    return { action: 'till', plotId: empty.id, messageVi: `Cày ô ${empty.id + 1} để chuẩn bị gieo hạt.` };
  }

  return { action: 'advance-day', messageVi: 'Mọi ô đã tưới xong, bấm Ngày mới để cây lớn.' };
}

export function applyFarmCoachAction(state: FarmState, suggestion: FarmCoachSuggestion): Result | FarmState {
  switch (suggestion.action) {
    case 'harvest':
      return { ok: false, reason: suggestion.messageVi, state };
    case 'water':
      return water(state, suggestion.plotId ?? -1);
    case 'plant':
      return plant(state, suggestion.plotId ?? -1, suggestion.seedId ?? 'carrot');
    case 'till':
      return till(state, suggestion.plotId ?? -1);
    case 'advance-day':
      return advanceDayWithWeather(state).state;
    default:
      return state;
  }
}
