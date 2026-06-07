'use client';

/**
 * DailyGoalBar — a small always-visible floating pill showing today's quest
 * progress (X/4), nudging the child to finish their daily goal. Tapping it
 * opens the progress page. Hidden on admin / auth routes and once the goal is
 * complete (replaced by a celebratory "done" pill that fades less urgently).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import type { DailyQuestStepType } from '@/types';

const STEP_ORDER: DailyQuestStepType[] = ['story', 'media', 'game', 'saveWord'];
// Hidden on admin / auth routes and inside full-screen games (/games/<id>),
// where the floating pill would overlap the game's own bottom UI.
const HIDDEN_PREFIXES = ['/admin', '/login', '/auth', '/games/'];

export default function DailyGoalBar() {
  const pathname = usePathname();
  const hydrated = useAppStore((state) => state.hydrated);
  const dailyQuestState = useAppStore((state) => state.progress.dailyQuestState);

  if (!hydrated) return null;
  if (pathname && HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const done = STEP_ORDER.filter((k) => dailyQuestState.steps[k].done).length;
  const total = STEP_ORDER.length;
  const allDone = dailyQuestState.completed;
  const percent = Math.round((done / total) * 100);

  return (
    <Link
      href="/progress"
      aria-label={`Nhiệm vụ hôm nay ${done} trên ${total}`}
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/60 bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur transition-transform hover:scale-105"
    >
      <span className="text-xl" aria-hidden>
        {allDone ? '🏆' : '🎯'}
      </span>
      <div className="flex flex-col">
        <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
          {allDone ? 'Hoàn thành hôm nay!' : 'Nhiệm vụ hôm nay'}
        </span>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                allDone ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-violet-500 to-pink-500'
              }`}
              style={{ width: `${Math.max(percent, 6)}%` }}
            />
          </div>
          <span className="text-xs font-black text-slate-700">
            {done}/{total}
          </span>
        </div>
      </div>
    </Link>
  );
}
