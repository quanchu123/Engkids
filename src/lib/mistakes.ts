import type { MistakeItem, MistakeKind } from '@/types';

// ============================================================
// MISTAKES REVIEW MODEL
// ============================================================
// Pure helpers over the learner's collected wrong answers. The store owns the
// MistakeItem[] (persisted with the rest of progress); these functions turn that
// list into a review queue and summary without any React/DB dependency, so they
// can be unit tested in isolation. Mirrors the spaced-review idea: unresolved
// mistakes, fewest reviews first, come back until the child answers them right.

export interface MistakeSummary {
  total: number;
  unresolved: number;
  resolved: number;
  byKind: Record<MistakeKind, number>;
}

export interface MistakeReviewCard {
  mistake: MistakeItem;
  /** Shuffled answer choices: the correct answer plus distractors from siblings. */
  choices: string[];
}

const KINDS: MistakeKind[] = ['vocab', 'grammar', 'listening', 'reading', 'other'];

export function summarizeMistakes(mistakes: MistakeItem[]): MistakeSummary {
  const byKind = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<MistakeKind, number>;
  let unresolved = 0;
  for (const m of mistakes) {
    const kind: MistakeKind = KINDS.includes(m.kind) ? m.kind : 'other';
    byKind[kind] += 1;
    if (!m.resolved) unresolved += 1;
  }
  return {
    total: mistakes.length,
    unresolved,
    resolved: mistakes.length - unresolved,
    byKind,
  };
}

// The review queue: only unresolved mistakes, ordered so the least-practised and
// oldest come first (so nothing is starved). Deterministic — no randomness here.
export function buildMistakeQueue(mistakes: MistakeItem[], limit = 20): MistakeItem[] {
  return [...mistakes]
    .filter((m) => !m.resolved && (m.correctAnswer || '').trim())
    .sort((a, b) => {
      const r = (a.reviewCount || 0) - (b.reviewCount || 0);
      if (r !== 0) return r;
      return (a.addedAt || '').localeCompare(b.addedAt || '');
    })
    .slice(0, Math.max(limit, 1));
}

// Build multiple-choice options for one mistake: the correct answer plus up to
// `distractorCount` wrong answers drawn from OTHER mistakes' correct answers
// (so they look plausible). Falls back to the child's own wrong answer if there
// aren't enough siblings. Caller is responsible for shuffling for display; we
// return a stable order so tests stay deterministic.
export function buildChoices(
  target: MistakeItem,
  pool: MistakeItem[],
  distractorCount = 3,
): string[] {
  const correct = (target.correctAnswer || '').trim();
  const seen = new Set([correct.toLowerCase()]);
  const distractors: string[] = [];

  for (const m of pool) {
    if (distractors.length >= distractorCount) break;
    const candidate = (m.correctAnswer || '').trim();
    const key = candidate.toLowerCase();
    if (!candidate || seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate);
  }

  // Top up with the child's own wrong answer if we still need options.
  const own = (target.yourAnswer || '').trim();
  if (distractors.length < distractorCount && own && !seen.has(own.toLowerCase())) {
    distractors.push(own);
    seen.add(own.toLowerCase());
  }

  return [correct, ...distractors];
}

export const MISTAKE_KIND_LABELS: Record<MistakeKind, string> = {
  vocab: 'Từ vựng',
  grammar: 'Ngữ pháp',
  listening: 'Nghe',
  reading: 'Đọc hiểu',
  other: 'Khác',
};
