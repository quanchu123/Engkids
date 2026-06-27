'use client';

/**
 * DailyGoalBar — a small always-visible floating pill showing today's quest
 * progress (X/4), nudging the child to finish their daily goal. Tapping it
 * opens the progress page. Hidden on admin / auth routes and once the goal is
 * complete (replaced by a celebratory "done" pill that fades less urgently).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { DailyQuestStepType } from '@/types';

const STEP_ORDER: DailyQuestStepType[] = ['story', 'media', 'game', 'saveWord'];
// Hidden on routes where the floating pill would overlap focused flows.
const HIDDEN_PREFIXES = ['/admin', '/login', '/auth', '/onboarding', '/games/', '/pricing', '/checkout'];
const DISMISS_STORAGE_PREFIX = 'engkids.daily_goal_bar.dismissed.';

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${DISMISS_STORAGE_PREFIX}${year}-${month}-${day}`;
}

export default function DailyGoalBar() {
  const pathname = usePathname();
  const [dismissReady, setDismissReady] = useState(false);
  const [dismissedToday, setDismissedToday] = useState(false);
  const hydrated = useAppStore((state) => state.hydrated);
  const dailyQuestState = useAppStore((state) => state.progress.dailyQuestState);

  useEffect(() => {
    try {
      setDismissedToday(localStorage.getItem(getTodayKey()) === '1');
    } catch {
      setDismissedToday(false);
    } finally {
      setDismissReady(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(getTodayKey(), '1');
    } catch {
      // Non-critical: the current view should still hide even if storage is blocked.
    }
    setDismissedToday(true);
  };

  if (!hydrated || !dismissReady || dismissedToday) return null;
  if (pathname && HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const done = STEP_ORDER.filter((k) => dailyQuestState.steps[k].done).length;
  const total = STEP_ORDER.length;
  const allDone = dailyQuestState.completed;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center rounded-full border border-white/60 bg-white/95 shadow-xl backdrop-blur">
      <Link
        href="/progress"
        aria-label={`Nhiệm vụ hôm nay ${done} trên ${total}`}
        className="flex items-center gap-3 py-2.5 pl-4 pr-2 transition-transform hover:scale-[1.02]"
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
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Ẩn nhiệm vụ hôm nay"
        className="mr-2 flex h-7 w-7 items-center justify-center rounded-full text-lg font-black leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        x
      </button>
    </div>
  );
}
