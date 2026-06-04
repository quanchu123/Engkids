'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';

const BADGE_LABELS = {
  streak_3: 'Streak 3 ngày',
  streak_7: 'Streak 7 ngày',
  story_1: 'Truyện đầu tiên',
  story_5: '5 truyện hoàn thành',
  vocab_10: '10 từ đã lưu',
  vocab_50: '50 từ đã lưu',
  game_master: 'Game master',
} as const;

export default function BadgeStrip() {
  const badges = useAppStore((state) => state.progress.badges);

  const items = useMemo(
    () => badges.slice().sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt)),
    [badges],
  );

  if (items.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-lg">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Badges</p>
        <h2 className="text-xl font-black text-slate-900">Thành tích đang mở khóa</h2>
        <p className="mt-2 text-sm text-slate-600">Hoàn thành quest và học đều mỗi ngày để mở badge đầu tiên.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500">Badges</p>
        <h2 className="text-xl font-black text-slate-900">Bộ sưu tập hiện tại</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {items.map((badge) => (
          <div
            key={badge.id}
            className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 px-4 py-3 text-sm font-bold text-amber-700"
          >
            {BADGE_LABELS[badge.id]}
          </div>
        ))}
      </div>
    </section>
  );
}
