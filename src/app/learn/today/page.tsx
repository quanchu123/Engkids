'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Gamepad2,
  Headphones,
  Layers,
  GraduationCap,
  ListChecks,
  Play,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { getVocabularyStats } from '@/services/vocabulary';
import { buildLessonPath, getLessonSummary, type LessonStep } from '@/lib/learning-path';
import { getLearnerStageProgress, getStageById, stageForStoryLevel } from '@/lib/curriculum';
import type { Story } from '@/types';
import type { LearnerCurriculumState } from '@/services/curriculum-content';
import type { NextLearningAction } from '@/services/learning-intelligence';

type MetricTone = 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate';

const STEP_STYLE: Record<LessonStep['kind'], { soft: string; solid: string; text: string; bar: string; icon: ComponentType<{ className?: string }> }> = {
  placement: { soft: 'bg-fuchsia-50', solid: 'bg-fuchsia-500', text: 'text-fuchsia-700', bar: 'bg-fuchsia-500', icon: ShieldCheck },
  review: { soft: 'bg-violet-50', solid: 'bg-violet-500', text: 'text-violet-700', bar: 'bg-violet-500', icon: Layers },
  story: { soft: 'bg-sky-50', solid: 'bg-sky-500', text: 'text-sky-700', bar: 'bg-sky-500', icon: BookOpen },
  media: { soft: 'bg-amber-50', solid: 'bg-amber-500', text: 'text-amber-700', bar: 'bg-amber-500', icon: Headphones },
  game: { soft: 'bg-emerald-50', solid: 'bg-emerald-500', text: 'text-emerald-700', bar: 'bg-emerald-500', icon: Gamepad2 },
  lesson: { soft: 'bg-rose-50', solid: 'bg-rose-500', text: 'text-rose-700', bar: 'bg-rose-500', icon: GraduationCap },
  checkpoint: { soft: 'bg-indigo-50', solid: 'bg-indigo-500', text: 'text-indigo-700', bar: 'bg-indigo-500', icon: ClipboardCheck },
};

const STEP_LABELS: Record<LessonStep['kind'], string> = {
  placement: 'Đầu vào',
  review: 'Ôn tập',
  story: 'Truyện',
  media: 'Video',
  game: 'Game',
  lesson: 'Lesson',
  checkpoint: 'Checkpoint',
};

export default function TodayLearnPage() {
  const { progress } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [dueWords, setDueWords] = useState(0);
  const [learnerState, setLearnerState] = useState<LearnerCurriculumState | null>(null);
  const [nextLesson, setNextLesson] = useState<{ id: string; titleVi: string } | null>(null);
  const [nextAction, setNextAction] = useState<NextLearningAction | null>(null);
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

    fetch('/api/learn/next-action', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.action) setNextAction(data.action);
      })
      .catch(() => {
        if (active) setNextAction(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/lessons?stage=${encodeURIComponent(currentStage.id)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        const lesson = Array.isArray(data?.lessons) ? data.lessons[0] : null;
        setNextLesson(lesson ? { id: lesson.id, titleVi: lesson.titleVi || lesson.titleEn || lesson.id } : null);
      })
      .catch(() => {
        if (active) setNextLesson(null);
      });
    return () => {
      active = false;
    };
  }, [currentStage.id]);
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
        nextLessonId: nextLesson?.id,
        nextLessonTitle: nextLesson?.titleVi,
        placementDone: learnerState?.placementDone ?? false,
        checkpointDue,
      }),
    [dueWords, progress.dailyQuestState, nextStory, nextLesson, learnerState, checkpointDue],
  );

  const summary = useMemo(() => getLessonSummary(steps), [steps]);
  const percent = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
  const nextOpenStep = steps.find((step) => !step.done) ?? steps[0];
  const bigAction = nextAction || (nextOpenStep ? {
    title: nextOpenStep.titleVi,
    description: nextOpenStep.descVi,
    href: nextOpenStep.href,
  } : null);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7fbff] pb-20 text-slate-900">
        <section className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_360px] lg:items-stretch">
            <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase text-violet-700 shadow-sm ring-1 ring-violet-100">
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Today Plan
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                  {currentStage.cefr}
                </span>
              </div>

              <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_220px] lg:items-end">
                <div>
                  <h1 className="max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">Nhiệm vụ hôm nay</h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                    {currentStage.titleVi}. Làm theo queue từ trên xuống để giữ nhịp học và cập nhật tiến trình.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {bigAction && (
                      <Link href={bigAction.href} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5">
                        Big Play: {bigAction.title} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                    <Link href="/roadmap" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm ring-1 ring-violet-100 transition hover:-translate-y-0.5">
                      Xem lộ trình <Route className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <ProgressCard done={summary.done} total={summary.total} percent={percent} allDone={summary.allDone} />
              </div>
            </div>

            <NextStepCard step={nextOpenStep} learnerState={learnerState} action={nextAction} />
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:grid-cols-2 xl:grid-cols-4">
          <MiniMetric icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} label="Placement" value={learnerState?.placementDone ? 'Done' : 'Todo'} helper="Xếp chặng học" tone="violet" />
          <MiniMetric icon={<Layers className="h-5 w-5" aria-hidden="true" />} label="Từ cần ôn" value={dueWords} helper="SRS hôm nay" tone="sky" />
          <MiniMetric icon={<BookOpen className="h-5 w-5" aria-hidden="true" />} label="Truyện tiếp" value={nextStory ? 'Ready' : '--'} helper={nextStory?.title_vi || nextStory?.title_en || 'Chưa có truyện'} tone="emerald" />
          <MiniMetric icon={<BadgeCheck className="h-5 w-5" aria-hidden="true" />} label="Checkpoint" value={checkpointDue ? 'Due' : 'OK'} helper={learnerState?.nextCheckpointDueAt || 'Theo tiến trình'} tone="amber" />
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-4 lg:grid-cols-[1fr_340px]">
          <LearningQueue steps={steps} />
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <StageContextPanel stageTitle={currentStage.titleVi} cefr={currentStage.cefr} topics={currentStage.topics} dailyLoop={currentStage.dailyLoop} />
            <StatusPanel learnerState={learnerState} allDone={summary.allDone} />
          </aside>
        </section>
      </main>
    </>
  );
}

function ProgressCard({ done, total, percent, allDone }: { done: number; total: number; percent: number; allDone: boolean }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Tiến độ</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{done}/{total}</p>
        </div>
        <div className={`flex h-16 w-16 items-center justify-center rounded-lg text-2xl font-black ring-1 ${allDone ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-violet-50 text-violet-700 ring-violet-100'}`}>
          {percent}%
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500 transition-all" style={{ width: `${Math.max(percent, 4)}%` }} />
      </div>
    </div>
  );
}

function NextStepCard({ step, learnerState, action }: { step?: LessonStep; learnerState: LearnerCurriculumState | null; action: NextLearningAction | null }) {
  if (action) {
    return (
      <aside className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-sm md:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
            <Play className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white/50">Big Play</p>
            <h2 className="text-xl font-black">{action.title}</h2>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-white/70">{action.description}</p>
        <div className="mt-5 grid gap-2 rounded-lg bg-white/10 p-4 text-sm font-bold text-white/75">
          <span>Mode: {action.learningMode}</span>
          <span>Why: {action.reason}</span>
          {action.weakSkill && <span>Weak skill: {action.weakSkill}</span>}
        </div>
        <Link href={action.href} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm">
          Start now <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </aside>
    );
  }
  if (!step) {
    return (
      <aside className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-black text-slate-950">Hoàn thành hôm nay</h2>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-600">Bạn có thể vào roadmap để xem chặng tiếp theo.</p>
      </aside>
    );
  }
  const style = STEP_STYLE[step.kind];
  const Icon = style.icon;
  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-sm md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-white/50">Next</p>
          <h2 className="text-xl font-black">{step.titleVi}</h2>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-white/70">{step.descVi}</p>
      <div className="mt-5 rounded-lg bg-white/10 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-white/50">Trạng thái lưu</p>
        <p className="mt-1 text-sm font-bold text-white/80">{learnerState ? 'Đồng bộ theo tài khoản.' : 'Đang dùng guest/local.'}</p>
      </div>
      <Link href={step.href} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm">
        Bắt đầu <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </aside>
  );
}

function LearningQueue({ steps }: { steps: LessonStep[] }) {
  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-500">Queue</p>
          <h2 className="text-2xl font-black text-slate-950">Thứ tự học</h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
          <ListChecks className="h-4 w-4" aria-hidden="true" /> {steps.length} bước
        </span>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <LessonRow key={step.id} step={step} index={index} total={steps.length} />
        ))}
      </ol>
    </section>
  );
}

function LessonRow({ step, index, total }: { step: LessonStep; index: number; total: number }) {
  const style = STEP_STYLE[step.kind];
  const Icon = style.icon;
  const isNext = !step.done;
  return (
    <li className={`rounded-lg border bg-white p-4 shadow-sm transition ${step.done ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 hover:border-sky-200'}`}>
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-white ${step.done ? 'bg-emerald-500' : style.solid}`}>
            {step.done ? <CheckCircle2 className="h-7 w-7" aria-hidden="true" /> : <Icon className="h-7 w-7" aria-hidden="true" />}
          </span>
          <span className="hidden h-10 w-px bg-slate-200 md:block" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">{index + 1}/{total}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${style.soft} ${style.text}`}>{STEP_LABELS[step.kind]}</span>
            {step.done && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">Done</span>}
          </div>
          <h3 className="mt-2 text-lg font-black leading-6 text-slate-950">{step.titleVi}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{step.descVi}</p>
        </div>

        <Link
          href={step.href}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black shadow-sm ${step.done ? 'bg-white text-emerald-700 ring-1 ring-emerald-100' : isNext ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          {step.done ? 'Xem lại' : 'Bắt đầu'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

function StageContextPanel({ stageTitle, cefr, topics, dailyLoop }: { stageTitle: string; cefr: string; topics: string[]; dailyLoop: string[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <Target className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-500">Stage</p>
          <h2 className="text-xl font-black text-slate-950">{cefr}</h2>
        </div>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{stageTitle}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {topics.slice(0, 6).map((topic) => (
          <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{topic}</span>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {dailyLoop.slice(0, 4).map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold leading-6 text-slate-600 ring-1 ring-slate-100">
            <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" aria-hidden="true" /> {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusPanel({ learnerState, allDone }: { learnerState: LearnerCurriculumState | null; allDone: boolean }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${allDone ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
          {allDone ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <Play className="h-6 w-6" aria-hidden="true" />}
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Status</p>
          <h2 className="text-xl font-black text-slate-950">{allDone ? 'Hoàn thành' : 'Đang học'}</h2>
        </div>
      </div>
      <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-600 ring-1 ring-slate-100">
        {learnerState ? 'Tiến trình, placement và checkpoint đang đồng bộ theo tài khoản.' : 'Bạn đang dùng tiến trình guest/local. Đăng nhập để lưu kết quả lâu dài.'}
      </p>
      <Link href="/learn/checkpoint" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm">
        Làm checkpoint <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function MiniMetric({ icon, label, value, helper, tone }: { icon: ReactNode; label: string; value: string | number; helper: string; tone: MetricTone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-500">{helper}</p>
        </div>
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${toneClasses(tone)}`}>{icon}</span>
      </div>
    </div>
  );
}

function toneClasses(tone: MetricTone): string {
  const classes: Record<MetricTone, string> = {
    sky: 'bg-sky-50 text-sky-700 ring-sky-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
  return classes[tone];
}


