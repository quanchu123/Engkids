import { PetStatKey } from './pet';

export type PetBattleMoveKey = 'spark' | 'guard' | 'mend';

export interface PetBattleMove {
  key: PetBattleMoveKey;
  labelVi: string;
  promptVi: string;
  stat: PetStatKey;
  basePower: number;
}

export interface PetBattleState {
  rivalName: string;
  round: number;
  playerHp: number;
  rivalHp: number;
  playerMaxHp: number;
  rivalMaxHp: number;
  shield: number;
  streak: number;
  log: string;
  finished: 'win' | 'lose' | null;
}

export const PET_BATTLE_MOVES: Record<PetBattleMoveKey, PetBattleMove> = {
  spark: {
    key: 'spark',
    labelVi: 'Tia sáng',
    promptVi: 'Trả lời đúng để tung đòn tấn công.',
    stat: 'happiness',
    basePower: 18,
  },
  guard: {
    key: 'guard',
    labelVi: 'Khiên sao',
    promptVi: 'Trả lời đúng để giảm sát thương lượt sau.',
    stat: 'clean',
    basePower: 14,
  },
  mend: {
    key: 'mend',
    labelVi: 'Hồi sức',
    promptVi: 'Trả lời đúng để hồi máu và phản công nhẹ.',
    stat: 'energy',
    basePower: 12,
  },
};

const RIVALS = ['Slime xanh', 'Robot tập đọc', 'Bóng mây', 'Sao nghịch'];

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

export function createPetBattle(level: number, rng: () => number = Math.random): PetBattleState {
  const safeLevel = Math.max(1, Math.floor(level));
  const playerMaxHp = 78 + safeLevel * 8;
  const rivalMaxHp = 64 + safeLevel * 7;
  return {
    rivalName: pick(RIVALS, rng),
    round: 1,
    playerHp: playerMaxHp,
    rivalHp: rivalMaxHp,
    playerMaxHp,
    rivalMaxHp,
    shield: 0,
    streak: 0,
    log: 'Chọn một kỹ năng rồi trả lời câu hỏi tiếng Anh.',
    finished: null,
  };
}

function rivalDamage(state: PetBattleState, level: number): number {
  const raw = 10 + Math.floor(Math.max(1, level) * 1.4) + (state.round % 3);
  return Math.max(2, raw - state.shield);
}

function clampHp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function applyPetBattleMove(
  state: PetBattleState,
  moveKey: PetBattleMoveKey,
  correct: boolean,
  level: number,
): PetBattleState {
  if (state.finished) return state;
  const move = PET_BATTLE_MOVES[moveKey];
  const next: PetBattleState = { ...state, round: state.round + 1, shield: 0 };

  if (correct) {
    const streak = state.streak + 1;
    const streakBonus = Math.min(streak - 1, 4) * 3;
    const power = move.basePower + Math.floor(Math.max(1, level) * 1.6) + streakBonus;
    next.streak = streak;

    if (moveKey === 'guard') {
      next.shield = 14 + streakBonus;
      next.rivalHp = clampHp(state.rivalHp - Math.round(power * 0.55), state.rivalMaxHp);
      next.log = `Đúng rồi! Khiên sao chặn ${next.shield} sát thương.`;
    } else if (moveKey === 'mend') {
      next.playerHp = Math.min(state.playerMaxHp, state.playerHp + 18 + streakBonus);
      next.rivalHp = clampHp(state.rivalHp - Math.round(power * 0.65), state.rivalMaxHp);
      next.log = `Đúng rồi! Pet hồi sức và phản công.`;
    } else {
      next.rivalHp = clampHp(state.rivalHp - power, state.rivalMaxHp);
      next.log = `Đúng rồi! Tia sáng gây ${power} sát thương.`;
    }
  } else {
    next.streak = 0;
    next.log = 'Chưa đúng, đối thủ phản công nhẹ.';
  }

  if (next.rivalHp <= 0) {
    return { ...next, rivalHp: 0, finished: 'win', log: 'Thắng rồi! Pet nhận thưởng luyện tập.' };
  }

  const damage = rivalDamage(next, level);
  next.playerHp = clampHp(next.playerHp - damage, next.playerMaxHp);
  if (next.playerHp <= 0) {
    return { ...next, playerHp: 0, finished: 'lose', log: 'Pet cần nghỉ một chút rồi thử lại nhé.' };
  }
  return next;
}

export function petBattleReward(state: PetBattleState): { coins: number; exp: number } {
  if (state.finished !== 'win') return { coins: 0, exp: 0 };
  return {
    coins: 5 + Math.min(state.streak, 5),
    exp: 16 + Math.min(state.round, 8) * 2,
  };
}
