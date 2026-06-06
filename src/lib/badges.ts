/**
 * Pure badge metadata module.
 *
 * Maps each {@link BadgeId} (defined in `@/types`) to kid-friendly Vietnamese
 * presentation data: a label, a short description, an emoji and a Tailwind tint
 * class used for colorful badge tiles. This module is intentionally free of any
 * React / store imports so it can be unit-tested in isolation and reused by any
 * UI component.
 */

import { BadgeId } from '@/types';

export interface BadgeMeta {
  id: BadgeId;
  /** Short Vietnamese label shown under the badge. */
  labelVi: string;
  /** Vietnamese description explaining how to earn the badge. */
  descVi: string;
  /** Kid-friendly emoji icon. */
  emoji: string;
  /** Tailwind tint classes (gradient + text) for the unlocked tile. */
  tint: string;
}

/**
 * Metadata for every badge. Keyed by {@link BadgeId} so TypeScript guarantees
 * that adding a new badge id to the union forces a matching entry here.
 */
export const BADGE_META: Record<BadgeId, BadgeMeta> = {
  streak_3: {
    id: 'streak_3',
    labelVi: 'Chăm chỉ 3 ngày',
    descVi: 'Học liên tục 3 ngày liền',
    emoji: '🔥',
    tint: 'bg-gradient-to-br from-orange-400 to-rose-400 text-white',
  },
  streak_7: {
    id: 'streak_7',
    labelVi: 'Siêu bền bỉ',
    descVi: 'Học liên tục 7 ngày liền',
    emoji: '👑',
    tint: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
  },
  story_1: {
    id: 'story_1',
    labelVi: 'Đọc truyện đầu tiên',
    descVi: 'Hoàn thành 1 truyện',
    emoji: '📖',
    tint: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white',
  },
  story_5: {
    id: 'story_5',
    labelVi: 'Mọt sách nhí',
    descVi: 'Hoàn thành 5 truyện',
    emoji: '📚',
    tint: 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white',
  },
  vocab_10: {
    id: 'vocab_10',
    labelVi: 'Thu thập từ',
    descVi: 'Lưu 10 từ mới',
    emoji: '⭐',
    tint: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white',
  },
  vocab_50: {
    id: 'vocab_50',
    labelVi: 'Kho báu từ vựng',
    descVi: 'Lưu 50 từ mới',
    emoji: '💎',
    tint: 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white',
  },
  game_master: {
    id: 'game_master',
    labelVi: 'Vua trò chơi',
    descVi: 'Đạt điểm tuyệt đối 3 game',
    emoji: '🏆',
    tint: 'bg-gradient-to-br from-fuchsia-400 to-purple-500 text-white',
  },
};

/** Returns metadata for all badges in a stable order. */
export function getAllBadgeMeta(): BadgeMeta[] {
  return Object.values(BADGE_META);
}

/** Returns metadata for a single badge id. */
export function getBadgeMeta(id: BadgeId): BadgeMeta {
  return BADGE_META[id];
}
