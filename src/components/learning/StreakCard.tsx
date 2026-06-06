'use client';

/**
 * StreakCard — shows the current learning streak with a flame, a friendly
 * Vietnamese message and a 7-day mini calendar dots row. The dots are purely
 * visual: based on the streak count, the most recent `streak` days (capped at
 * 7) are lit, with the current day highlighted. Read-only.
 */

import { useAppStore } from '@/store/useAppStore';

const WEEK_LENGTH = 7;
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function friendlyMessage(streak: number): string {
  if (streak <= 0) return 'Bắt đầu chuỗi ngày học của bạn hôm nay nhé!';
  if (streak === 1) return 'Khởi đầu tuyệt vời! Quay lại ngày mai để giữ lửa nhé.';
  if (streak < 7) return `Giữ vững nhé! Học đều mỗi ngày để chuỗi dài hơn.`;
  return 'Quá đỉnh! Bạn đang giữ chuỗi học cực kỳ ấn tượng!';
}

export default function StreakCard() {
  const currentStreak = useAppStore((state) => state.progress.currentStreak);
  const streakFreezes = useAppStore((state) => state.streakFreezes);

  // Number of lit dots in the 7-day strip (capped at the week length).
  const litCount = Math.min(Math.max(currentStreak, 0), WEEK_LENGTH);
  // Index of the current (most recent) lit day, used for highlighting.
  const currentIndex = litCount > 0 ? litCount - 1 : -1;

  return (
    <div className="toy-panel p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-lg">
          <span className="text-3xl leading-none" aria-hidden>
            🔥
          </span>
          <span className="mt-1 text-2xl font-black leading-none">{currentStreak}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black text-slate-900">Chuỗi ngày học</h2>
          <p className="text-sm font-bold text-slate-500">
            {currentStreak} ngày liên tiếp 🔥
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600">{friendlyMessage(currentStreak)}</p>
          {streakFreezes > 0 && (
            <p className="mt-1 text-xs font-bold text-sky-600">🧊 {streakFreezes} vé giữ lửa</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        {Array.from({ length: WEEK_LENGTH }).map((_, index) => {
          const lit = index < litCount;
          const isCurrent = index === currentIndex;
          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition-all ${
                  lit
                    ? 'bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-300'
                } ${isCurrent ? 'ring-4 ring-amber-300 scale-110' : ''}`}
                aria-hidden
              >
                {lit ? '🔥' : '·'}
              </div>
              <span className="text-[10px] font-bold text-slate-400">{DAY_LABELS[index]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
