/**
 * Pet evolution species — pure & testable (no React, no storage).
 *
 * Each species is a *chain* of stages a baby creature grows through as it
 * levels up ("cá chép hóa rồng", "trứng → phượng hoàng", "ngựa → kỳ lân",
 * "trứng → khủng long bạo chúa"). The pet's appearance is derived from its
 * species chain + current level, so the store only needs to remember the
 * chosen species id.
 *
 * Art lives in /public/avatars (colorful Icons8 creatures already shipped).
 */

export interface PetStage {
  /** Minimum pet level required to reach this stage. */
  minLevel: number;
  nameVi: string;
  /** Avatar art id in /public/avatars (without path / extension). */
  art: string;
}

export interface PetSpecies {
  id: string;
  nameVi: string;
  tagline: string;
  emoji: string;
  /** Tailwind gradient classes for the themed room background. */
  bg: string;
  /** Glow / aura colour behind the creature (rgba). */
  glow: string;
  /** Tailwind gradient for accents (bars, buttons). */
  accent: string;
  /** Ordered ascending by minLevel; first stage MUST be minLevel 1. */
  stages: PetStage[];
}

/**
 * Four mythical chains, each raised from an egg/baby into a powerful adult.
 * Stage thresholds are shared (1 / 3 / 6 / 10) so evolution feels consistent.
 */
export const PET_SPECIES: PetSpecies[] = [
  {
    id: 'ancient-dragon',
    nameVi: 'Rồng Cổ',
    tagline: 'Trứng cổ xưa nở ra rồng ma thuật đầy ánh sao.',
    emoji: '🐲',
    bg: 'from-cyan-300 via-sky-400 to-blue-600',
    glow: 'rgba(56,189,248,0.75)',
    accent: 'from-cyan-400 to-blue-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng rồng cổ', art: '/games/pet/stages/ancient-dragon-egg.png' },
      { minLevel: 3, nameVi: 'Rồng con', art: '/games/pet/stages/ancient-dragon-1.png' },
      { minLevel: 6, nameVi: 'Rồng trẻ', art: '/games/pet/stages/ancient-dragon-2.png' },
      { minLevel: 10, nameVi: 'Rồng Cổ', art: '/games/pet/stages/ancient-dragon-3.png' },
    ],
  },
  {
    id: 'fire-phoenix',
    nameVi: 'Phượng Lửa',
    tagline: 'Một chú chim lửa lớn lên từ trứng đến cánh rực sáng.',
    emoji: '🔥',
    bg: 'from-amber-300 via-orange-400 to-rose-500',
    glow: 'rgba(251,146,60,0.8)',
    accent: 'from-orange-400 to-rose-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng lửa', art: '/games/pet/stages/fire-phoenix-egg.png' },
      { minLevel: 3, nameVi: 'Chim lửa con', art: '/games/pet/stages/fire-phoenix-1.png' },
      { minLevel: 6, nameVi: 'Phượng trẻ', art: '/games/pet/stages/fire-phoenix-2.png' },
      { minLevel: 10, nameVi: 'Phượng Lửa', art: '/games/pet/stages/fire-phoenix-3.png' },
    ],
  },
  {
    id: 'white-tiger',
    nameVi: 'Bạch Hổ',
    tagline: 'Bé hổ dần hóa thành chúa sơn lâm ánh bạc.',
    emoji: '🐯',
    bg: 'from-slate-200 via-gray-300 to-zinc-500',
    glow: 'rgba(148,163,184,0.7)',
    accent: 'from-slate-300 to-zinc-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng hổ trắng', art: '/games/pet/stages/white-tiger-egg.png' },
      { minLevel: 3, nameVi: 'Hổ con', art: '/games/pet/stages/white-tiger-1.png' },
      { minLevel: 6, nameVi: 'Hổ trẻ', art: '/games/pet/stages/white-tiger-2.png' },
      { minLevel: 10, nameVi: 'Bạch Hổ', art: '/games/pet/stages/white-tiger-3.png' },
    ],
  },
  {
    id: 'dreamina-unicorn',
    nameVi: 'Kỳ Lân Thiên',
    tagline: 'Từ trứng ánh sáng tới kỳ lân cầu vồng lấp lánh.',
    emoji: '🦄',
    bg: 'from-fuchsia-300 via-purple-400 to-indigo-500',
    glow: 'rgba(217,70,239,0.72)',
    accent: 'from-fuchsia-400 to-purple-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng ánh sáng', art: '/games/pet/stages/unicorn-egg.png' },
      { minLevel: 3, nameVi: 'Ngựa con', art: '/games/pet/stages/unicorn-1.png' },
      { minLevel: 6, nameVi: 'Ngựa thần', art: '/games/pet/stages/unicorn-2.png' },
      { minLevel: 10, nameVi: 'Kỳ Lân Thiên', art: '/games/pet/stages/unicorn-3.png' },
    ],
  },
  {
    id: 'thuy-long',
    nameVi: 'Thủy Long',
    tagline: 'Cá chép bé nhỏ hóa thành rồng nước huyền thoại.',
    emoji: '🐉',
    bg: 'from-cyan-300 via-sky-400 to-blue-600',
    glow: 'rgba(56,189,248,0.75)',
    accent: 'from-cyan-400 to-blue-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng rồng nước', art: '/games/pet/stages/thuy-long-egg.png' },
      { minLevel: 3, nameVi: 'Cá chép con', art: '/games/pet/stages/thuy-long-1.png' },
      { minLevel: 6, nameVi: 'Cá Koi thần', art: '/games/pet/stages/thuy-long-2.png' },
      { minLevel: 10, nameVi: 'Thủy Long', art: '/games/pet/stages/thuy-long-3.png' },
    ],
  },
  {
    id: 'phuong-hoang',
    nameVi: 'Phượng Hoàng',
    tagline: 'Quả trứng lửa nở ra chim thần bất tử rực rỡ.',
    emoji: '🔥',
    bg: 'from-amber-300 via-orange-400 to-rose-500',
    glow: 'rgba(251,146,60,0.8)',
    accent: 'from-orange-400 to-rose-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng lửa', art: '/games/pet/stages/phuong-hoang-egg.png' },
      { minLevel: 3, nameVi: 'Gà lửa con', art: '/games/pet/stages/phuong-hoang-1.png' },
      { minLevel: 6, nameVi: 'Chim lửa', art: '/games/pet/stages/phuong-hoang-2.png' },
      { minLevel: 10, nameVi: 'Phượng Hoàng', art: '/games/pet/stages/phuong-hoang-3.png' },
    ],
  },
  {
    id: 'ky-lan',
    nameVi: 'Kỳ Lân',
    tagline: 'Chú ngựa con lớn lên thành kỳ lân ánh sáng.',
    emoji: '🦄',
    bg: 'from-fuchsia-300 via-purple-400 to-indigo-500',
    glow: 'rgba(217,70,239,0.72)',
    accent: 'from-fuchsia-400 to-purple-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng ánh sáng', art: '/games/pet/stages/ky-lan-egg.png' },
      { minLevel: 3, nameVi: 'Ngựa con', art: '/games/pet/stages/ky-lan-1.png' },
      { minLevel: 6, nameVi: 'Ngựa thần', art: '/games/pet/stages/ky-lan-2.png' },
      { minLevel: 10, nameVi: 'Kỳ Lân', art: '/games/pet/stages/ky-lan-3.png' },
    ],
  },
  {
    id: 'bao-chua',
    nameVi: 'Long Bạo Chúa',
    tagline: 'Trứng khủng long nở ra chúa tể bạo chúa hùng mạnh.',
    emoji: '🦖',
    bg: 'from-lime-300 via-green-400 to-emerald-600',
    glow: 'rgba(132,204,22,0.72)',
    accent: 'from-lime-400 to-emerald-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng khủng long', art: '/games/pet/stages/bao-chua-egg.png' },
      { minLevel: 3, nameVi: 'Khủng long nhí', art: '/games/pet/stages/bao-chua-1.png' },
      { minLevel: 6, nameVi: 'Raptor', art: '/games/pet/stages/bao-chua-2.png' },
      { minLevel: 10, nameVi: 'Long Bạo Chúa', art: '/games/pet/stages/bao-chua-3.png' },
    ],
  },
];

/** Find a species chain by id. */
export function getSpecies(id: string): PetSpecies | undefined {
  return PET_SPECIES.find((s) => s.id === id);
}

/**
 * Index of the current stage for a level: the highest stage whose minLevel is
 * <= level. Always returns a valid index (0 for very low levels).
 */
export function stageIndexForLevel(species: PetSpecies, level: number): number {
  let idx = 0;
  for (let i = 0; i < species.stages.length; i += 1) {
    if (level >= species.stages[i].minLevel) idx = i;
  }
  return idx;
}

/** The current stage object for a level. */
export function currentStage(species: PetSpecies, level: number): PetStage {
  return species.stages[stageIndexForLevel(species, level)];
}

/** The next stage (to tease the upcoming evolution), or null if maxed. */
export function nextStage(species: PetSpecies, level: number): PetStage | null {
  const idx = stageIndexForLevel(species, level);
  return idx + 1 < species.stages.length ? species.stages[idx + 1] : null;
}

/** True when the pet has reached its final form. */
export function isFinalStage(species: PetSpecies, level: number): boolean {
  return stageIndexForLevel(species, level) === species.stages.length - 1;
}

/**
 * Resolve the art path for a pet. If `speciesId` is a known chain, returns the
 * stage art (already a full /games/pet/stages path) for the level; otherwise
 * treats the id as a legacy avatar id and returns its /avatars path.
 */
export function resolvePetArt(speciesId: string, level: number): string {
  const species = getSpecies(speciesId);
  if (species) return currentStage(species, level).art;
  return `/avatars/${speciesId}.png`;
}
