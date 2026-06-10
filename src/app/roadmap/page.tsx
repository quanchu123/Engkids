'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Check, Sparkles, Star } from 'lucide-react';
import Header from '@/components/layout/Header';
import UiIcon, { type UiIconName } from '@/components/common/UiIcon';
import { useAppStore } from '@/store/useAppStore';
import { getLearnerStageProgress } from '@/lib/curriculum';
import { CURRICULUM_STAGES, getStageById } from '@/lib/curriculum';
import {
  buildRoadmap,
  type RoadmapNode,
  type RoadmapNodeKind,
  type RoadmapNodeStatus,
  type RoadmapStageGroup,
} from '@/lib/roadmap';
import type { CurriculumCatalog, LearnerCurriculumState } from '@/services/curriculum-content';

// Per-stage colour worlds (kid-friendly, high contrast).
const STAGE_THEME: Record<string, { from: string; to: string; ring: string; soft: string; text: string; dot: string }> = {
  'a2-key': { from: 'from-sky-400', to: 'to-cyan-500', ring: 'ring-sky-200', soft: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  'b1-preliminary': { from: 'from-violet-400', to: 'to-purple-500', ring: 'ring-violet-200', soft: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'b2-first': { from: 'from-emerald-400', to: 'to-teal-500', ring: 'ring-emerald-200', soft: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'c1-advanced': { from: 'from-amber-400', to: 'to-orange-500', ring: 'ring-amber-200', soft: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const NODE_ICON: Record<RoadmapNodeKind, UiIconName> = {
  words: 'abc',
  story: 'open-book',
  game: 'controller',
  checkpoint: 'goal',
  trophy: 'trophy',
};

function themeFor(stageId: string) {
  return STAGE_THEME[stageId] ?? STAGE_THEME['a2-key'];
}

export default function RoadmapPage() {
  const progress = useAppStore((state) => state.progress);
  const fallbackLearner = useMemo(() => getLearnerStageProgress(progress), [progress]);
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/curriculum', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => (response.ok ? response.json() : null))
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
  const checkpointPassed = learnerState?.recentAttempt?.passed ?? false;

  const model = useMemo(
    () =>
      buildRoadmap({
        stages,
        currentStageId: learnerState?.currentStageId ?? fallbackLearner.stage.id,
        unlockedStageIds: learnerState?.unlockedStageIds ?? null,
        stats: fallbackLearner.stats,
        checkpointPassed,
      }),
    [stages, learnerState, fallbackLearner, checkpointPassed],
  );

  const currentStage = learnerState?.currentStageId
    ? getStageById(learnerState.currentStageId)
    : fallbackLearner.stage;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50">
      <Header />

      <JourneyHero
        stageCefr={currentStage.cefr}
        stageTitle={currentStage.titleVi}
        overallPercent={model.overallPercent}
        currentIndex={model.currentIndex}
        totalStages={stages.length}
        synced={Boolean(learnerState)}
      />

      <main className="mx-auto max-w-3xl px-4 pb-24">
        {model.groups.map((group) => (
          <StageWorld key={group.stage.id} group={group} currentNodeId={model.currentNodeId} />
        ))}

        <FinishFlag done={model.overallPercent >= 100} />
      </main>
    </div>
  );
}

function JourneyHero({
  stageCefr,
  stageTitle,
  overallPercent,
  currentIndex,
  totalStages,
  synced,
}: {
  stageCefr: string;
  stageTitle: string;
  overallPercent: number;
  currentIndex: number;
  totalStages: number;
  synced: boolean;
}) {
  return (
    <section className="px-4 pt-6">
      <div
        className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-6 text-white shadow-2xl md:p-8"
        style={{ boxShadow: '0 8px 0 rgba(0,0,0,0.15), 0 20px 50px rgba(139,92,246,0.4)' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black uppercase backdrop-blur-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Bản đồ học tập
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-black backdrop-blur-sm">
            {synced ? 'Đã lưu tài khoản' : 'Khách / cục bộ'}
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-black leading-tight drop-shadow-md md:text-5xl">
          Cuộc phiêu lưu tiếng Anh
        </h1>
        <p className="mt-2 text-sm font-bold text-white/90 md:text-base">
          Chặng {currentIndex + 1}/{totalStages} · {stageCefr} — {stageTitle}
        </p>

        <div className="mt-5 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-black uppercase">
            <span>Tổng tiến độ</span>
            <span>{overallPercent}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-lime-300 transition-all"
              style={{ width: `${Math.max(overallPercent, 4)}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/learn/today"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-violet-700 shadow-lg transition hover:-translate-y-0.5"
          >
            Học tiếp <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/learn/placement"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/20 px-5 py-3 text-sm font-black text-white backdrop-blur-sm transition hover:-translate-y-0.5"
          >
            Kiểm tra đầu vào
          </Link>
        </div>
      </div>
    </section>
  );
}

function StageWorld({ group, currentNodeId }: { group: RoadmapStageGroup; currentNodeId: string | null }) {
  const theme = themeFor(group.stage.id);
  const locked = group.status === 'locked';

  return (
    <section className="relative mt-10 first:mt-8">
      {/* Stage banner */}
      <div className={`sticky top-2 z-10 mb-2 rounded-2xl border bg-white/90 px-4 py-3 shadow-sm backdrop-blur ${theme.ring} ring-1`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} text-white shadow`}>
            {group.status === 'done' ? (
              <Check className="h-6 w-6" aria-hidden="true" />
            ) : locked ? (
              <Lock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <span className="text-lg font-black">{group.index + 1}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-black uppercase tracking-wide ${theme.text}`}>{group.stage.cefr}</p>
            <h2 className="truncate text-base font-black text-slate-900">{group.stage.titleVi}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${theme.soft} ${theme.text}`}>{group.percent}%</span>
        </div>
      </div>

      {/* Winding node path */}
      <div className="relative px-2 py-4">
        {group.nodes.map((node, i) => (
          <PathNode
            key={node.id}
            node={node}
            align={i % 2 === 0 ? 'left' : 'right'}
            isLast={i === group.nodes.length - 1}
            theme={theme}
            isCurrent={node.id === currentNodeId}
          />
        ))}
      </div>
    </section>
  );
}

function PathNode({
  node,
  align,
  isLast,
  theme,
  isCurrent,
}: {
  node: RoadmapNode;
  align: 'left' | 'right';
  isLast: boolean;
  theme: ReturnType<typeof themeFor>;
  isCurrent: boolean;
}) {
  const locked = node.status === 'locked';
  const done = node.status === 'done';
  const active = node.status === 'current' || isCurrent;

  const circle = (
    <Link
      href={locked ? '#' : node.href}
      aria-disabled={locked}
      tabIndex={locked ? -1 : 0}
      className={`group relative flex flex-col items-center ${locked ? 'pointer-events-none' : ''}`}
    >
      {active && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-[11px] font-black text-white shadow-lg">
          BẮT ĐẦU
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
      <span
        className={[
          'relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition',
          done
            ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
            : locked
              ? 'bg-slate-200'
              : `bg-gradient-to-br ${theme.from} ${theme.to}`,
          active ? 'ring-4 ring-yellow-300 ring-offset-2 animate-pulse' : '',
          !locked ? 'group-hover:-translate-y-1' : '',
        ].join(' ')}
        style={{ boxShadow: locked ? undefined : '0 6px 0 rgba(0,0,0,0.12)' }}
      >
        {locked ? (
          <Lock className="h-7 w-7 text-slate-400" aria-hidden="true" />
        ) : done ? (
          <Check className="h-9 w-9 text-white" aria-hidden="true" />
        ) : (
          <UiIcon name={NODE_ICON[node.kind]} size={40} />
        )}
        {done && (
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-white shadow ring-2 ring-white">
            <Star className="h-4 w-4 fill-white" aria-hidden="true" />
          </span>
        )}
      </span>
    </Link>
  );

  const label = (
    <div className={`max-w-[200px] ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <p className={`text-sm font-black ${locked ? 'text-slate-400' : 'text-slate-900'}`}>{node.titleVi}</p>
      <p className={`text-xs font-bold leading-snug ${locked ? 'text-slate-300' : 'text-slate-500'}`}>{node.subtitleVi}</p>
      {node.progress && !done && !locked && (
        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full ${theme.dot}`} style={{ width: `${Math.max(node.progress.percent, 4)}%` }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-4 ${align === 'left' ? 'justify-start pr-10' : 'flex-row-reverse justify-start pl-10'}`}
      >
        {circle}
        {label}
      </div>
      {!isLast && (
        <div className="flex justify-center py-1" aria-hidden="true">
          <span className={`h-8 w-1.5 rounded-full ${done ? 'bg-emerald-300' : locked ? 'bg-slate-200' : theme.dot} opacity-60`} />
        </div>
      )}
    </div>
  );
}

function FinishFlag({ done }: { done: boolean }) {
  return (
    <div className="mt-12 flex flex-col items-center">
      <span
        className={`flex h-24 w-24 items-center justify-center rounded-full shadow-xl ${
          done ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-slate-200'
        }`}
        style={{ boxShadow: done ? '0 8px 0 rgba(0,0,0,0.15)' : undefined }}
      >
        <UiIcon name="trophy" size={52} />
      </span>
      <p className="mt-4 text-center text-lg font-black text-slate-900">
        {done ? 'Hoàn thành cuộc phiêu lưu!' : 'Cúp lớn đang chờ bé'}
      </p>
      <p className="mt-1 max-w-xs text-center text-sm font-bold text-slate-500">
        {done
          ? 'Bé đã đi hết bản đồ tiếng Anh. Tuyệt vời!'
          : 'Hoàn thành tất cả các chặng để mở chiếc cúp vàng.'}
      </p>
    </div>
  );
}
