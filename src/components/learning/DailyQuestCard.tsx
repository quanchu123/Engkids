'use client';

/**
 * DailyQuestCard — kid-friendly checklist of the 4 daily quest steps.
 *
 * Reads `dailyQuestState` from the global app store and renders each step as a
 * checklist row with its own progress (completed/target), an overall progress
 * bar, and a celebratory banner once all steps are done. Read-only: it never
 * mutates store state.
 */

import { useAppStore } from '@/store/useAppStore';
import type { DailyQuestStepType } from '@/types';

const STEP_META: Record<DailyQuestStepType, { labelVi: string; emoji: string }> = {
  story: { labelVi: 'Đọc 1 truyện', emoji: '📖' },
  media: { labelVi: 'Xem 1 video/nhạc', emoji: '🎬' },
  game: { labelVi: 'Chơi 1 game', emoji: '🎮' },
  saveWord: { labelVi: 'Lưu 3 từ mới', emoji: '⭐' },
};

const STEP_ORDER: DailyQuestStepType[] = ['story', 'media', 'game', 'saveWord'];

export default function DailyQuestCard() {
  const dailyQuestState = useAppStore((state) => state.progress.dailyQuestState);
  const steps = dailyQuestState.steps;

  const doneCount = STEP_ORDER.filter((key) => steps[key].done).length;
  const overallPercent = Math.round((doneCount / STEP_ORDER.length) * 100);
  const allDone = dailyQuestState.completed;

  return (
    <div className="toy-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🎯
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">Nhiệm vụ hằng ngày</h2>
            <p className="text-sm font-bold text-slate-500">Hoàn thành 4 nhiệm vụ để nhận thưởng!</p>
          </div>
        </div>
        <span className="kid-chip px-3 py-1 text-sm font-black text-violet-700">
          {doneCount}/{STEP_ORDER.length}
        </span>
      </div>

      {allDone && (
        <div className="soft-feature mb-4 rounded-2xl p-4 text-center text-white">
          <p className="text-xl font-black">🎉 Hoàn thành hết rồi! 🎉</p>
          <p className="mt-1 text-sm font-bold text-white/90">Tuyệt vời lắm! Hẹn gặp lại ngày mai nhé.</p>
        </div>
      )}

      <div className="mb-5 h-4 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
          style={{ width: `${Math.max(overallPercent, 2)}%` }}
        />
      </div>

      <div className="space-y-3">
        {STEP_ORDER.map((key) => {
          const step = steps[key];
          const meta = STEP_META[key];
          const stepPercent = Math.round((step.completed / step.target) * 100);

          return (
            <div
              key={key}
              className={`toy-surface flex items-center gap-4 rounded-2xl p-3 ${step.done ? '' : 'opacity-95'}`}
            >
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-2xl ${
                  step.done
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                    : 'bg-gradient-to-br from-amber-100 to-pink-100'
                }`}
                aria-hidden
              >
                {step.done ? '✅' : meta.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`font-black ${step.done ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {meta.labelVi}
                  </h3>
                  <span className="text-xs font-black text-slate-400">
                    {step.completed}/{step.target}
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      step.done
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    }`}
                    style={{ width: `${Math.max(Math.min(stepPercent, 100), 2)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
