'use client';

/**
 * TodayHero — the "Hôm nay của bé" block at the top of the home page. Gives a
 * returning child one clear next action: shows their avatar (with mood),
 * a greeting, streak, today's quest progress, a big "Tiếp tục học" button and
 * the daily lucky wheel. Pure client UI on top of the existing store.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import AvatarDisplay from '@/components/learning/AvatarDisplay';
import UiIcon from '@/components/common/UiIcon';
import SpinWheel from '@/components/common/SpinWheel';
import { canSpin } from '@/lib/daily-spin';
import { getTodayDate } from '@/lib/progress';
import type { DailyQuestStepType } from '@/types';

const STEP_ORDER: DailyQuestStepType[] = ['story', 'media', 'game', 'saveWord'];

export default function TodayHero() {
  const hydrated = useAppStore((state) => state.hydrated);
  const currentStreak = useAppStore((state) => state.progress.currentStreak);
  const dailyQuestState = useAppStore((state) => state.progress.dailyQuestState);
  const coins = useAppStore((state) => state.coins);
  const lastSpinDate = useAppStore((state) => state.lastSpinDate);

  const [childName, setChildName] = useState('');
  const [showSpin, setShowSpin] = useState(false);

  useEffect(() => {
    try {
      setChildName(window.localStorage.getItem('engkids.childName') || '');
    } catch {
      /* ignore */
    }
  }, []);

  const done = useMemo(
    () => STEP_ORDER.filter((k) => dailyQuestState.steps[k].done).length,
    [dailyQuestState],
  );
  const total = STEP_ORDER.length;
  const allDone = dailyQuestState.completed;
  const spinAvailable = canSpin(lastSpinDate, getTodayDate());

  // Avoid SSR/client mismatch: render nothing until the store hydrates.
  if (!hydrated) return null;

  return (
    <section className="px-4 pt-5">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-sky-400 via-violet-500 to-fuchsia-500 p-5 text-white shadow-xl md:p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="rounded-3xl bg-white/15 p-2 backdrop-blur">
              <AvatarDisplay size="lg" showMood />
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-black drop-shadow sm:text-3xl">
                Chào {childName ? childName : 'bé'}! 👋
              </h2>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-black">🔥 {currentStreak} ngày</span>
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-black">
                  <UiIcon name="coins" size={16} /> {coins} xu
                </span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-black">
                  {allDone ? '🏆 Xong nhiệm vụ!' : `🎯 ${done}/${total} nhiệm vụ`}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Link
                  href="/learn/today"
                  className="rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-violet-600 shadow-md transition-transform hover:scale-105"
                >
                  Tiếp tục học →
                </Link>
                <button
                  onClick={() => setShowSpin(true)}
                  className={`rounded-2xl px-5 py-2.5 text-sm font-black shadow-md transition-transform hover:scale-105 ${
                    spinAvailable ? 'bg-yellow-300 text-amber-900' : 'bg-white/20 text-white'
                  }`}
                >
                  Vòng quay 🎡 {spinAvailable && <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">mới</span>}
                </button>
                <Link
                  href="/shop"
                  className="rounded-2xl bg-white/20 px-5 py-2.5 text-sm font-black text-white shadow-md transition-transform hover:scale-105"
                >
                  Cửa hàng 🎁
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSpin && <SpinWheel onClose={() => setShowSpin(false)} />}
    </section>
  );
}
