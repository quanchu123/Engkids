'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardCheck, Lock, Play, Route, ShieldCheck, Target } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { CURRICULUM_STAGES, getLearnerStageProgress, getStageById, type CurriculumStage, type CurriculumStageId } from '@/lib/curriculum';
import { DEFAULT_WORD_BANK, getWordBankStats } from '@/lib/word-bank';
import type { CurriculumCatalog, LearnerCurriculumState } from '@/services/curriculum-content';

const STAGE_COLORS: Record<CurriculumStageId, string> = {
  'sound-play': 'from-sky-400 to-cyan-500',
  'pre-a1-starters': 'from-violet-500 to-fuchsia-500',
  'a1-movers': 'from-emerald-400 to-teal-500',
  'a2-flyers': 'from-amber-400 to-orange-500',
  'a2-bridge': 'from-rose-400 to-pink-500',
};

const seedStats = getWordBankStats(DEFAULT_WORD_BANK);

export default function RoadmapPage() {
  const progress = useAppStore((state) => state.progress);
  const fallbackLearner = useMemo(() => getLearnerStageProgress(progress), [progress]);
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/curriculum', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (active && data) setCatalog(data);
      })
      .catch(() => {
        if (active) setCatalog(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const stages = catalog?.stages?.length ? catalog.stages : CURRICULUM_STAGES;
  const learnerState = catalog?.learnerState || null;
  const currentStage = learnerState?.currentStageId ? getStageById(learnerState.currentStageId) : fallbackLearner.stage;
  const unlocked = new Set(learnerState?.unlockedStageIds || stages.slice(0, Math.max(fallbackLearner.stageIndex + 1, 1)).map((stage) => stage.id));
  const currentIndex = stages.findIndex((stage) => stage.id === currentStage.id);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50 pb-20">
        <section className="mx-auto max-w-6xl px-4 pt-8">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-sky-500 to-emerald-400 p-6 text-white shadow-2xl md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1.5 text-xs font-black uppercase tracking-wide backdrop-blur">
                  <Route className="h-4 w-4" /> Curriculum Engine
                </div>
                <h1 className="max-w-3xl text-3xl font-black leading-tight drop-shadow md:text-5xl">
                  Lộ trình học có kiểm tra và mở khóa
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/90 md:text-base">
                  User không đọc roadmap nữa: làm placement, nhận Today Plan, chơi game đúng chặng, làm checkpoint và hệ thống lưu mastery trên DB.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/learn/placement" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-indigo-700 shadow-lg transition-transform hover:-translate-y-0.5">
                    Làm placement <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/learn/checkpoint" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-950/25 px-4 py-3 text-sm font-black text-white ring-1 ring-white/30 transition-transform hover:-translate-y-0.5">
                    Làm checkpoint
                  </Link>
                </div>
              </div>

              <StatusPanel stage={currentStage} learnerState={learnerState} percent={fallbackLearner.percent} />
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 grid max-w-6xl gap-4 px-4 md:grid-cols-4">
          <MetricCard label="Word bank DB" value={seedStats.total} helper={`${seedStats.fiveLetterCount} từ 5 chữ`} />
          <MetricCard label="Current stage" value={currentIndex + 1} helper={currentStage.cefr} />
          <MetricCard label="Placement" value={learnerState?.placementDone ? 'Done' : 'Todo'} helper="Xếp trình độ" />
          <MetricCard label="Checkpoint" value={learnerState?.recentAttempt ? Math.round(learnerState.recentAttempt.scorePercent) : '--'} helper="Điểm gần nhất" />
        </section>

        <section className="mx-auto mt-8 max-w-6xl px-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">Learning path</p>
              <h2 className="text-2xl font-black text-slate-950">Chặng học và điều kiện mở khóa</h2>
            </div>
            <Link href="/learn/today" className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg">
              Today Plan <Play className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {stages.map((stage, index) => {
              const isCurrent = stage.id === currentStage.id;
              const isUnlocked = unlocked.has(stage.id);
              const isDone = index < currentIndex;
              return (
                <article key={stage.id} className={`overflow-hidden rounded-[1.5rem] bg-white shadow-lg ring-2 ${isCurrent ? 'ring-violet-300' : 'ring-slate-100'}`}>
                  <div className={`bg-gradient-to-br ${STAGE_COLORS[stage.id]} p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-sm font-black ring-1 ring-white/30">
                        {isDone ? <CheckCircle2 className="h-5 w-5" /> : isUnlocked ? index + 1 : <Lock className="h-5 w-5" />}
                      </span>
                      {isCurrent && <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-black">Đang học</span>}
                    </div>
                    <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{stage.cefr}</p>
                    <h3 className="mt-1 text-xl font-black leading-tight">{stage.titleVi}</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-2">
                      <Requirement label="Từ" current={fallbackLearner.stats.masteredWords} target={stage.targetWords} active={isCurrent} />
                      <Requirement label="Truyện" current={fallbackLearner.stats.completedStories} target={stage.targetStories} active={isCurrent} />
                      <Requirement label="Game 70%+" current={fallbackLearner.stats.strongGameScores} target={stage.targetGames} active={isCurrent} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {stage.topics.slice(0, 4).map((topic) => (
                        <span key={topic} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">{topic}</span>
                      ))}
                    </div>
                    <Link
                      href={isUnlocked ? (isCurrent ? '/learn/today' : `/roadmap#${stage.id}`) : '/learn/checkpoint'}
                      className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl px-3 py-2 text-sm font-black ${
                        isUnlocked ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isUnlocked ? 'Học chặng này' : 'Cần checkpoint'}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-5 px-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[1.75rem] bg-white p-5 shadow-lg ring-1 ring-slate-100">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Skill mastery</p>
                <h2 className="text-xl font-black text-slate-950">Kỹ năng lưu theo learner_skill_mastery</h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {['vocabulary', 'listening', 'reading', 'grammar', 'writing', 'speaking'].map((skill) => {
                const value = Math.round(learnerState?.skillMastery?.[skill] || 0);
                return (
                  <div key={skill} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">{skill}</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{value}%</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(value, 4)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-white/55">Next action</p>
                <h2 className="text-xl font-black">Bám sát lộ trình</h2>
              </div>
            </div>
            <div className="space-y-3">
              <ActionLink href="/learn/placement" label="Placement test" done={learnerState?.placementDone || false} />
              <ActionLink href="/learn/today" label="Today Plan" done={false} />
              <ActionLink href="/learn/checkpoint" label="Checkpoint" done={learnerState?.recentAttempt?.passed || false} />
            </div>
            {learnerState?.recentAttempt && (
              <p className="mt-4 rounded-2xl bg-white/10 p-3 text-sm font-bold text-white/80">
                Lần gần nhất: {Math.round(learnerState.recentAttempt.scorePercent)}% ({learnerState.recentAttempt.passed ? 'pass' : 'review'})
              </p>
            )}
          </aside>
        </section>
      </main>
    </>
  );
}

function StatusPanel({ stage, learnerState, percent }: { stage: CurriculumStage; learnerState: LearnerCurriculumState | null; percent: number }) {
  return (
    <div className="rounded-[1.5rem] bg-white/16 p-4 backdrop-blur">
      <p className="text-xs font-black uppercase tracking-wide text-white/75">Trạng thái DB</p>
      <p className="mt-2 text-2xl font-black">{stage.cefr}</p>
      <p className="mt-1 text-sm font-black text-white/90">{stage.titleVi}</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(percent, 4)}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
        <span className="rounded-full bg-white/20 px-3 py-1">{learnerState?.placementDone ? 'Placement done' : 'Need placement'}</span>
        <span className="rounded-full bg-white/20 px-3 py-1">{learnerState ? 'DB synced' : 'Guest/local'}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white p-4 shadow-md ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500">{helper}</p>
    </div>
  );
}

function Requirement({ label, current, target, active }: { label: string; current: number; target: number; active: boolean }) {
  const value = active ? current : 0;
  const pct = target > 0 ? Math.min(value / target, 1) * 100 : 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black text-slate-500">
        <span>{label}</span>
        <span>{value}/{target}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  );
}

function ActionLink({ href, label, done }: { href: string; label: string; done: boolean }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15">
      <span>{label}</span>
      {done ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <ArrowRight className="h-4 w-4" />}
    </Link>
  );
}