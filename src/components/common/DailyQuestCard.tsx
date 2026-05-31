'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ROUTES } from '@/config/constants';

const QUEST_LINKS = {
  story: ROUTES.STORIES,
  media: ROUTES.VIDEOS,
  game: '/games',
  saveWord: ROUTES.PROGRESS,
} as const;

const QUEST_LABELS = {
  story: 'Đọc 1 truyện',
  media: 'Xem 1 video hoặc bài hát',
  game: 'Chơi 1 game',
  saveWord: 'Lưu 3 từ mới',
} as const;

export default function DailyQuestCard() {
  const quest = useAppStore((state) => state.progress.dailyQuestState);

  const completion = useMemo(() => {
    const steps = Object.values(quest.steps);
    const done = steps.filter((step) => step.done).length;
    return Math.round((done / steps.length) * 100);
  }, [quest.steps]);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">Daily Quest</p>
          <h2 className="text-xl font-black text-slate-900">Nhiệm vụ hôm nay</h2>
        </div>
        <div className="rounded-2xl bg-violet-100 px-3 py-2 text-sm font-bold text-violet-700">
          {completion}%
        </div>
      </div>

      <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
          style={{ width: `${completion}%` }}
        />
      </div>

      <div className="space-y-3">
        {(Object.keys(quest.steps) as Array<keyof typeof quest.steps>).map((stepKey) => {
          const step = quest.steps[stepKey];
          return (
            <Link
              key={stepKey}
              href={QUEST_LINKS[stepKey]}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-colors ${
                step.done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="font-semibold">{QUEST_LABELS[stepKey]}</span>
              <span className="text-sm font-bold">
                {step.completed}/{step.target}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
