'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { getVocabularyStats } from '@/services/vocabulary';
import { buildLessonPath, getLessonSummary, LessonStep } from '@/lib/learning-path';
import { Story } from '@/types';

const CARD_TINTS: Record<LessonStep['kind'], string> = {
  review: 'from-violet-400 to-fuchsia-500',
  story: 'from-sky-400 to-indigo-500',
  media: 'from-orange-400 to-amber-500',
  game: 'from-emerald-400 to-teal-500',
};

export default function TodayLearnPage() {
  const { progress } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [dueWords, setDueWords] = useState(0);

  useEffect(() => {
    let active = true;

    getAllStories()
      .then((list) => {
        if (active) setStories(list);
      })
      .catch(() => {
        if (active) setStories([]);
      });

    const loadDue = async () => {
      try {
        const stats = await getVocabularyStats();
        if (active) setDueWords(stats.dueToday);
      } catch {
        // Guest or network error: no spaced-repetition words to review.
        if (active) setDueWords(0);
      }
    };

    loadDue();

    return () => {
      active = false;
    };
  }, []);

  const nextStory = useMemo(
    () => stories.find((story) => !progress.storiesProgress[story.id]?.completed),
    [stories, progress.storiesProgress],
  );

  const steps = useMemo(
    () =>
      buildLessonPath({
        dueWords,
        quest: progress.dailyQuestState,
        nextStoryId: nextStory?.id,
        nextStoryTitle: nextStory?.title_vi || nextStory?.title_en,
      }),
    [dueWords, progress.dailyQuestState, nextStory],
  );

  const summary = useMemo(() => getLessonSummary(steps), [steps]);
  const percent = Math.round((summary.done / summary.total) * 100);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-sky-50 pb-24">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <header className="mb-7 text-center">
            <h1
              className="font-black leading-tight"
              style={{
                fontSize: 'clamp(1.9rem, 5vw, 2.8rem)',
                background: 'linear-gradient(135deg, #f97316 0%, #ec4899 45%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Hôm nay học gì? 📅
            </h1>
            <p className="mt-1 text-sm font-bold" style={{ color: '#6b5b8f' }}>
              Làm theo các bước dưới đây để học mỗi ngày một chút nhé!
            </p>
          </header>

          {/* Summary progress bar */}
          <section className="toy-panel mb-6 p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black text-slate-700">Tiến độ hôm nay</span>
              <span className="kid-chip px-3 py-1 text-sm font-black text-violet-700">
                {summary.done}/{summary.total} bước
              </span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                style={{ width: `${Math.max(percent, 3)}%` }}
              />
            </div>
          </section>

          {summary.allDone && (
            <section className="soft-feature mb-6 rounded-[2rem] p-6 text-center text-white">
              <div className="mb-2 text-4xl">🎉🌟🎉</div>
              <h2 className="text-2xl font-black">Tuyệt vời! Bạn đã học xong hôm nay!</h2>
              <p className="mt-1 text-white/90">
                Bạn đã hoàn thành tất cả các bước. Hẹn gặp lại vào ngày mai nhé!
              </p>
            </section>
          )}

          {/* Vertical timeline / checklist */}
          <ol className="relative space-y-5">
            {steps.map((step, index) => (
              <li key={step.id} className="relative">
                <div className={`toy-panel p-5 ${step.done ? 'opacity-90' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div
                      className={`relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${CARD_TINTS[step.kind]} text-3xl shadow-lg`}
                    >
                      <span aria-hidden>{step.emoji}</span>
                      {step.done && (
                        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white shadow-md">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                          {index + 1}
                        </span>
                        <h3 className="truncate text-lg font-black text-slate-900">{step.titleVi}</h3>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{step.descVi}</p>
                    </div>

                    <Link
                      href={step.href}
                      className={`action-btn flex-shrink-0 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-lg ${
                        step.done
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                          : 'bg-gradient-to-r from-violet-500 to-pink-500'
                      }`}
                    >
                      {step.done ? 'Làm lại' : 'Bắt đầu'}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {!summary.allDone && (
            <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm font-bold text-slate-500">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Cố lên! Hoàn thành các bước để nhận sao mỗi ngày.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
