'use client';

/**
 * BadgeGrid — shows ALL badges from BADGE_META. Unlocked badges (present in
 * `progress.badges`) render colorfully; locked ones are greyed out with a lock
 * overlay. A header shows "Đã mở X/Y huy hiệu". Read-only.
 */

import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getAllBadgeMeta } from '@/lib/badges';

export default function BadgeGrid() {
  const badges = useAppStore((state) => state.progress.badges);

  const unlockedIds = useMemo(() => new Set(badges.map((badge) => badge.id)), [badges]);
  const allMeta = getAllBadgeMeta();
  const unlockedCount = allMeta.filter((meta) => unlockedIds.has(meta.id)).length;

  return (
    <div className="toy-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🏅
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">Huy hiệu</h2>
            <p className="text-sm font-bold text-slate-500">Sưu tầm huy hiệu khi học nhé!</p>
          </div>
        </div>
        <span className="kid-chip px-3 py-1 text-sm font-black text-violet-700">
          Đã mở {unlockedCount}/{allMeta.length} huy hiệu
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {allMeta.map((meta) => {
          const unlocked = unlockedIds.has(meta.id);
          return (
            <div
              key={meta.id}
              className={`relative flex flex-col items-center rounded-2xl p-4 text-center transition-all ${
                unlocked ? meta.tint + ' shadow-lg' : 'bg-slate-100 text-slate-400 opacity-80 grayscale'
              }`}
            >
              {!unlocked && (
                <span className="absolute right-2 top-2 text-base" aria-hidden>
                  🔒
                </span>
              )}
              <span className="text-4xl" aria-hidden>
                {meta.emoji}
              </span>
              <h3 className="mt-2 text-sm font-black leading-tight">{meta.labelVi}</h3>
              <p className={`mt-1 text-xs font-bold ${unlocked ? 'text-white/85' : 'text-slate-400'}`}>
                {meta.descVi}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
