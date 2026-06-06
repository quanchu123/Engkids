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
    id: 'thuy-long',
    nameVi: 'Thủy Long',
    tagline: 'Cá chép bé nhỏ hóa thành rồng nước huyền thoại.',
    emoji: '🐉',
    bg: 'from-cyan-300 via-sky-400 to-blue-600',
    glow: 'rgba(56,189,248,0.75)',
    accent: 'from-cyan-400 to-blue-500',
    stages: [
      { minLevel: 1, nameVi: 'Trứng rồng nước', art: 'char-dino-egg' },
      { minLevel: 3, nameVi: 'Cá chép con', art: 'char-fish' },
      { minLevel: 6, nameVi: 'Cá Koi thần', art: 'char-koi' },
      { minLevel: 10, nameVi: 'Thủy Long', art: 'char-dragon-eu' },
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
      { minLevel: 1, nameVi: 'Trứng lửa', art: 'char-dino-egg' },
      { minLevel: 3, nameVi: 'Gà lửa con', art: 'char-chick' },
      { minLevel: 6, nameVi: 'Chim lửa', art: 'char-parrot' },
      { minLevel: 10, nameVi: 'Phượng Hoàng', art: 'char-phoenix' },
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
      { minLevel: 1, nameVi: 'Trứng ánh sáng', art: 'char-dino-egg' },
      { minLevel: 3, nameVi: 'Ngựa con', art: 'char-horse' },
      { minLevel: 6, nameVi: 'Ngựa thần', art: 'char-pegasus' },
      { minLevel: 10, nameVi: 'Kỳ Lân', art: 'char-unicorn' },
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
      { minLevel: 1, nameVi: 'Trứng khủng long', art: 'char-dino-egg' },
      { minLevel: 3, nameVi: 'Khủng long nhí', art: 'char-kawaii-dino' },
      { minLevel: 6, nameVi: 'Raptor', art: 'char-velociraptor' },
      { minLevel: 10, nameVi: 'Long Bạo Chúa', art: 'char-tyrannosaur' },
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
 * stage art for the level; otherwise treats the id as a legacy avatar id
 * (older saved pets stored a character id directly) and returns it as-is.
 */
export function resolvePetArt(speciesId: string, level: number): string {
  const species = getSpecies(speciesId);
  if (species) return `/avatars/${currentStage(species, level).art}.png`;
  return `/avatars/${speciesId}.png`;
}
