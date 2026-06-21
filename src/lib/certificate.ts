import { UserProgress } from '@/types';

export type CertificateTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface CertificateLevel {
  tier: CertificateTier;
  titleVi: string;
  emoji: string;
}

export interface CertificateData {
  name: string;
  level: CertificateLevel;
  wordsLearned: number;
  storiesCompleted: number;
  totalStars: number;
  dateVi: string;
}

const TIER_INFO: Record<CertificateTier, { titleVi: string; emoji: string }> = {
  bronze: { titleVi: 'Học Viên Đồng', emoji: '🥉' },
  silver: { titleVi: 'Học Viên Bạc', emoji: '🥈' },
  gold: { titleVi: 'Học Viên Vàng', emoji: '🥇' },
  diamond: { titleVi: 'Học Viên Kim Cương', emoji: '💎' },
};

/**
 * Determines the certificate tier based on the learner's progress.
 * The tier is decided by whichever metric (totalStars OR wordsLearned)
 * reaches the higher tier. Thresholds:
 *   diamond: >= 100 stars OR >= 100 words
 *   gold:    >= 50  stars OR >= 50  words
 *   silver:  >= 20  stars OR >= 20  words
 *   bronze:  otherwise
 */
export function getCertificateLevel(input: {
  wordsLearned: number;
  storiesCompleted: number;
  totalStars: number;
}): CertificateLevel {
  const best = Math.max(input.totalStars, input.wordsLearned);

  let tier: CertificateTier;
  if (best >= 100) {
    tier = 'diamond';
  } else if (best >= 50) {
    tier = 'gold';
  } else if (best >= 20) {
    tier = 'silver';
  } else {
    tier = 'bronze';
  }

  return { tier, ...TIER_INFO[tier] };
}

/**
 * Formats a date in Vietnamese as "ngày DD tháng MM năm YYYY"
 * with zero-padded day and month.
 */
export function formatCertDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}

/**
 * Builds the full certificate data object from the user's progress.
 * - wordsLearned   = number of saved words
 * - storiesCompleted = number of completed stories
 * - totalStars     = progress.totalStars
 */
export function buildCertificateData(
  progress: UserProgress,
  name: string,
  date: Date = new Date(),
): CertificateData {
  const wordsLearned = progress.savedWords.length;
  const storiesCompleted = Object.values(progress.storiesProgress).filter(
    (item) => item.completed,
  ).length;
  const totalStars = progress.totalStars;

  const level = getCertificateLevel({ wordsLearned, storiesCompleted, totalStars });

  return {
    name,
    level,
    wordsLearned,
    storiesCompleted,
    totalStars,
    dateVi: formatCertDate(date),
  };
}
