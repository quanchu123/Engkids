/**
 * Pet game core — pure & testable (no React, no storage).
 *
 * A simple Tamagotchi-style pet: four needs decay over real time; the child
 * tops them up with care actions (which cost coins and grant a little EXP).
 * Keeping decay / action / level math here lets the store + UI stay thin and
 * lets us unit-test the boundaries.
 */

export type PetStatKey = 'hunger' | 'happiness' | 'clean' | 'energy';

export interface PetState {
  /** Avatar character id used as the pet's appearance (e.g. 'char-fox'). */
  species: string;
  name: string;
  hunger: number;
  happiness: number;
  clean: number;
  energy: number;
  exp: number;
  /** Epoch ms of the last time decay was applied. */
  lastTick: number;
}

export type PetActionKey = 'feed' | 'play' | 'bath' | 'sleep';

/** Quiz direction each action uses (the child must answer to succeed). */
export type PetQuizDirection = 'vi-to-en' | 'en-to-vi';

export interface PetAction {
  key: PetActionKey;
  labelVi: string;
  asset: string; // /games/pet/{asset}.png
  /** Coins EARNED for answering this action's question correctly. */
  coinReward: number;
  exp: number;
  /** Translation direction for this action's vocabulary question. */
  quizDirection: PetQuizDirection;
  /** Instruction shown above the answer choices. */
  promptLabelVi: string;
  /** Stat changes applied on a correct answer (then clamped to 0..100). */
  effects: Partial<Record<PetStatKey, number>>;
}

export const MAX_STAT = 100;
const STAT_KEYS: PetStatKey[] = ['hunger', 'happiness', 'clean', 'energy'];

/** How much each need drops per real hour. */
export const DECAY_PER_HOUR: Record<PetStatKey, number> = {
  hunger: 8,
  happiness: 6,
  clean: 5,
  energy: 7,
};

export const PET_ACTIONS: Record<PetActionKey, PetAction> = {
  feed: { key: 'feed', labelVi: 'Cho ăn', asset: 'food', coinReward: 3, exp: 12, quizDirection: 'vi-to-en', promptLabelVi: 'Chọn từ tiếng Anh để cho ăn:', effects: { hunger: 35, energy: 5 } },
  play: { key: 'play', labelVi: 'Chơi', asset: 'ball', coinReward: 3, exp: 12, quizDirection: 'en-to-vi', promptLabelVi: 'Chọn nghĩa tiếng Việt để cùng chơi:', effects: { happiness: 35, energy: -8 } },
  bath: { key: 'bath', labelVi: 'Tắm', asset: 'bath', coinReward: 3, exp: 12, quizDirection: 'vi-to-en', promptLabelVi: 'Chọn từ tiếng Anh để tắm mát:', effects: { clean: 45 } },
  sleep: { key: 'sleep', labelVi: 'Ngủ', asset: 'bed', coinReward: 3, exp: 12, quizDirection: 'en-to-vi', promptLabelVi: 'Chọn nghĩa tiếng Việt để ru ngủ:', effects: { energy: 50, happiness: 4 } },
};

export function clampStat(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(MAX_STAT, Math.round(v)));
}

/** Create a fresh pet with full stats. */
export function createPet(species: string, name: string, now: number = Date.now()): PetState {
  return {
    species,
    name,
    hunger: MAX_STAT,
    happiness: MAX_STAT,
    clean: MAX_STAT,
    energy: MAX_STAT,
    exp: 0,
    lastTick: now,
  };
}

/**
 * Apply time-based decay to a pet's needs based on elapsed time since lastTick.
 * Pure: returns a new pet, never mutates. Stats never go below 0.
 */
export function applyDecay(pet: PetState, now: number = Date.now()): PetState {
  const elapsedMs = Math.max(0, now - pet.lastTick);
  const hours = elapsedMs / 3_600_000;
  if (hours <= 0) return { ...pet, lastTick: now };
  const next: PetState = { ...pet, lastTick: now };
  STAT_KEYS.forEach((k) => {
    next[k] = clampStat(pet[k] - DECAY_PER_HOUR[k] * hours);
  });
  return next;
}

/**
 * Apply a care action AFTER decay. Returns the updated pet plus the coin cost
 * (the caller is responsible for checking/deducting coins). Stats are clamped.
 */
export function applyAction(pet: PetState, action: PetActionKey, now: number = Date.now()): { pet: PetState; coinReward: number } {
  const def = PET_ACTIONS[action];
  const base = applyDecay(pet, now);
  const next: PetState = { ...base, exp: base.exp + def.exp };
  (Object.entries(def.effects) as Array<[PetStatKey, number]>).forEach(([k, delta]) => {
    next[k] = clampStat(base[k] + delta);
  });
  return { pet: next, coinReward: def.coinReward };
}

/** Coins earned for a correct answer, with a small combo bonus (capped). */
export function coinRewardForCombo(action: PetActionKey, combo: number): number {
  const base = PET_ACTIONS[action].coinReward;
  return base + Math.min(Math.max(combo, 0), 5);
}

/** EXP needed to advance FROM the given level (1-based). */
export function expForLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

/** Resolve total EXP into a level + progress within the current level. */
export function levelFromExp(exp: number): { level: number; intoLevel: number; needed: number; progress: number } {
  let level = 1;
  let remaining = Math.max(0, Math.floor(exp));
  while (remaining >= expForLevel(level)) {
    remaining -= expForLevel(level);
    level += 1;
  }
  const needed = expForLevel(level);
  return { level, intoLevel: remaining, needed, progress: needed > 0 ? remaining / needed : 0 };
}

/** Average wellbeing 0..100. */
export function petWellbeing(pet: PetState): number {
  return Math.round((pet.hunger + pet.happiness + pet.clean + pet.energy) / 4);
}

/** A coarse mood used to pick the pet's expression. */
export function petMood(pet: PetState): 'happy' | 'ok' | 'sad' {
  const w = petWellbeing(pet);
  if (w >= 70) return 'happy';
  if (w >= 40) return 'ok';
  return 'sad';
}
