'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { getVocabularyStats } from '@/services/vocabulary';
import { buildLessonPath, getLessonSummary, type LessonStep } from '@/lib/learning-path';
import { getLearnerStageProgress, getStageById, stageForStoryLevel } from '@/lib/curriculum';
import type { Story } from '@/types';
import type { LearnerCurriculumState } from '@/services/curriculum-content';

const CARD_TINTS: Record<LessonStep['kind'], string> = {
  placement: 'from-fuchsia-500 to-violet-500',
  review: 'from-violet-400 to-fuchsia-500',
  story: 'from-sky-400 to-indigo-500',
  media: 'from-orange-400 to-amber-500',
  game: 'from-emerald-400 to-teal-500',
  checkpoint: 'from-indigo-500 to-sky-500',
};

export default function TodayLearnPage() {
  const { progress } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [dueWords, setDueWords] = useState(0);
  const [learnerState, setLearnerState] = useState<LearnerCurriculumState | null>(null);
  const learner = useMemo(() => getLearnerStageProgress(progress), [progress]);
  const currentStage = learnerState?.currentStageId ? getStageById(learnerState.currentStageId) : learner.stage;

  useEffect(() => {
    let active = true;

    getAllStories()
      .then((list) => {
        if (active) setStories(list);
      })
      .catch(() => {
        if (active) setStories([]);
      });

    getVocabularyStats()
      .then((stats) => {
        if (active) setDueWords(stats.dueToday);
      })
      .catch(() => {
        if (active) setDueWords(0);
      });

    fetch('/api/curriculum', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (active && data) setLearnerState(data.learnerState || null);
      })
      .catch(() => {
        if (active) setLearnerState(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const nextStory = useMemo(() => {
    const unread = stories.filter((story) => !progress.storiesProgress[story.id]?.completed);
    return unread.find((story) => stageForStoryLevel(story.level) === currentStage.id) ?? unread[0];
  }, [stories, progress.storiesProgress, currentStage.id]);

  const checkpointDue = Boolean(
    learnerState?.placementDone &&
    learnerState?.nextCheckpointDueAt &&
    learnerState.nextCheckpointDueAt <= new Date().toISOString().slice(0, 10),
  );

  const steps = useMemo(
    () =>
      buildLessonPath({
        dueWords,
        quest: progress.dailyQuestState,
        nextStoryId: nextStory?.id,
        nextStoryTitle: nextStory?.title_vi || nextStory?.title_en,
        placementDone: learnerState?.placementDone ?? false,
        checkpointDue,
      }),
    [dueWords, progress.dailyQuestState, nextStory, learnerState, checkpointDue],
  );

  const summary = useMemo(() => getLessonSummary(steps), [steps]);
  const percent = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;

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
              }}
            >
              Hôm nay học gì?
            </h1>
            <p className="mt-1 text-sm font-bold" style={{ color: '#6b5b8f' }}>
              Hệ thống giao bài theo DB: placement, review, nội dung, game và checkpoint.
            </p>
          </header>

          <section className="toy-panel mb-6 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-violet-500">Chặng học hiện tại</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{currentStage.cefr}: {currentStage.titleVi}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Topic ưu tiên: {currentStage.topics.slice(0, 4).join(', ')}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentStage.dailyLoop.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <Link href="/roadmap" className="kid-chip flex-shrink-0 px-4 py-2 text-sm font-black text-violet-700">
                {learnerState?.placementDone ? `${learner.percent}% lộ trình` : 'Cần placement'}
              </Link>
            </div>
          </section>

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
              <h2 className="text-2xl font-black">Tuyệt vời! Bạn đã học xong hôm nay!</h2>
              <p className="mt-1 text-white/90">Kết quả học và tiến độ được đồng bộ theo tài khoản.</p>
            </section>
          )}

          <ol className="relative space-y-5">
            {steps.map((step, index) => (
              <li key={step.id} className="relative">
                <div className={`toy-panel p-5 ${step.done ? 'opacity-90' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${CARD_TINTS[step.kind]} text-3xl shadow-lg`}>
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
              Cố lên! Làm theo từng bước để hệ thống cập nhật lộ trình cho bạn.
            </p>
          )}
        </div>
      </main>
    </>
  );
}