'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Flag,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Map,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { CURRICULUM_STAGES, getLearnerStageProgress, getStageById, type CurriculumStage, type CurriculumStageId } from '@/lib/curriculum';
import { DEFAULT_WORD_BANK, getWordBankStats } from '@/lib/word-bank';
import type { AssessmentBlueprint, AssessmentKind, CurriculumCatalog, LearnerCurriculumState } from '@/services/curriculum-content';

type StageStatus = 'done' | 'current' | 'unlocked' | 'locked';
type MetricTone = 'sky' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate';

const STAGE_ACCENTS: Record<CurriculumStageId, { soft: string; solid: string; text: string; border: string; bar: string }> = {
  'sound-play': { soft: 'bg-sky-50', solid: 'bg-sky-500', text: 'text-sky-700', border: 'border-sky-200', bar: 'bg-sky-500' },
  'pre-a1-starters': { soft: 'bg-violet-50', solid: 'bg-violet-500', text: 'text-violet-700', border: 'border-violet-200', bar: 'bg-violet-500' },
  'a1-movers': { soft: 'bg-emerald-50', solid: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500' },
  'a2-flyers': { soft: 'bg-amber-50', solid: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' },
  'a2-bridge': { soft: 'bg-rose-50', solid: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-500' },
};

const SKILL_LABELS: Record<string, string> = {
  vocabulary: 'Từ vựng',
  listening: 'Nghe',
  reading: 'Đọc hiểu',
  grammar: 'Ngữ pháp',
  writing: 'Viết',
  speaking: 'Nói',
};

const ASSESSMENT_META: Record<AssessmentKind, { label: string; purpose: string; href: string; tone: MetricTone; icon: ComponentType<{ className?: string }> }> = {
  placement: {
    label: 'Đầu vào',
    purpose: 'Xếp đúng chặng học ban đầu và mở Today Plan phù hợp.',
    href: '/learn/placement',
    tone: 'violet',
    icon: ShieldCheck,
  },
  'daily-check': {
    label: 'Hằng ngày',
    purpose: 'Kiểm nhanh từ và mẫu câu để giữ nhịp học mỗi ngày.',
    href: '/learn/today',
    tone: 'sky',
    icon: Play,
  },
  'weekly-checkpoint': {
    label: 'Checkpoint',
    purpose: 'Đo kỹ năng theo chặng hiện tại và cập nhật mastery.',
    href: '/learn/checkpoint',
    tone: 'emerald',
    icon: ClipboardCheck,
  },
  'stage-exit': {
    label: 'Qua chặng',
    purpose: 'Kiểm điều kiện mở chặng tiếp theo khi bé đã sẵn sàng.',
    href: '/learn/checkpoint',
    tone: 'amber',
    icon: Flag,
  },
};

const seedStats = getWordBankStats(DEFAULT_WORD_BANK);

const FALLBACK_BLUEPRINTS: AssessmentBlueprint[] = [
  { id: 'placement-default', kind: 'placement', stageId: null, titleVi: 'Placement test', itemCount: 24, passPercent: 70, minSkillPercent: 50, skillWeights: { vocabulary: 8, listening: 4, reading: 6, grammar: 4, writing: 2 }, rules: { adaptive: true, setsInitialStage: true } },
  { id: 'daily-check-default', kind: 'daily-check', stageId: null, titleVi: 'Daily micro check', itemCount: 8, passPercent: 70, minSkillPercent: 50, skillWeights: { vocabulary: 3, reading: 2, grammar: 2, listening: 1 }, rules: { unlocksCoins: true } },
  { id: 'weekly-checkpoint-default', kind: 'weekly-checkpoint', stageId: null, titleVi: 'Weekly checkpoint', itemCount: 16, passPercent: 70, minSkillPercent: 60, skillWeights: { vocabulary: 5, listening: 3, reading: 4, grammar: 2, writing: 2 }, rules: { remedialIfBelow: 70 } },
  { id: 'stage-exit-default', kind: 'stage-exit', stageId: null, titleVi: 'Stage exit test', itemCount: 24, passPercent: 75, minSkillPercent: 60, skillWeights: { vocabulary: 8, listening: 4, reading: 6, grammar: 3, writing: 3 }, rules: { unlocksNextStage: true } },
];

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
  const currentStage = learnerState?.currentStageId
    ? stages.find((stage) => stage.id === learnerState.currentStageId) ?? getStageById(learnerState.currentStageId)
    : fallbackLearner.stage;
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.id === currentStage.id));
  const unlocked = new Set(learnerState?.unlockedStageIds || stages.slice(0, Math.max(fallbackLearner.stageIndex + 1, 1)).map((stage) => stage.id));
  const masteryAverage = getMasteryAverage(learnerState);
  const blueprints = catalog?.blueprints?.length ? catalog.blueprints : FALLBACK_BLUEPRINTS;
  const missing = getMissingRequirements(currentStage, fallbackLearner.stats);
  const recentScore = learnerState?.recentAttempt?.scorePercent ?? null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7fbff] pb-20 text-slate-900">
        <section className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_380px] lg:items-stretch">
            <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-5 shadow-sm md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase text-sky-700 shadow-sm ring-1 ring-sky-100">
                  <Map className="h-4 w-4" aria-hidden="true" /> Learning Map
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                  {learnerState ? 'DB sync' : 'Guest/local'}
                </span>
              </div>
              <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_220px] lg:items-end">
                <div>
                  <h1 className="max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">Bản đồ học của bé</h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                    Chặng hiện tại, điều kiện qua chặng, bài kiểm tra và kỹ năng yếu được gom vào một dashboard dễ nhìn.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/learn/today" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5">
                      Học tiếp <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link href="/learn/placement" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm ring-1 ring-violet-100 transition hover:-translate-y-0.5">
                      Placement <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <StageBadge stage={currentStage} stageIndex={currentIndex} masteryAverage={masteryAverage} />
              </div>
            </div>

            <NextActionPanel learnerState={learnerState} recentScore={recentScore} missingCount={missing.length} />
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Database className="h-5 w-5" aria-hidden="true" />} label="Word bank" value={seedStats.total} helper={`${seedStats.fiveLetterCount} từ 5 chữ`} tone="sky" />
          <MetricCard icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />} label="Chặng hiện tại" value={`${currentIndex + 1}/5`} helper={currentStage.cefr} tone="violet" />
          <MetricCard icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} label="Placement" value={learnerState?.placementDone ? 'Done' : 'Todo'} helper="Xếp trình độ" tone="emerald" />
          <MetricCard icon={<ClipboardCheck className="h-5 w-5" aria-hidden="true" />} label="Checkpoint" value={recentScore === null ? '--' : `${Math.round(recentScore)}%`} helper="Điểm gần nhất" tone="amber" />
        </section>

        <section className="mx-auto max-w-7xl px-4">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">Roadmap</p>
              <h2 className="text-2xl font-black text-slate-950">5 chặng học</h2>
            </div>
            <Link href="/learn/checkpoint" className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-sm">
              Làm checkpoint <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-3 xl:grid-cols-5">
            {stages.map((stage, index) => {
              const status = getStageStatus(index, currentIndex, unlocked.has(stage.id));
              return <StageStep key={stage.id} stage={stage} index={index} status={status} stats={fallbackLearner.stats} />;
            })}
          </div>
        </section>

        <section className="mx-auto mt-6 grid max-w-7xl gap-5 px-4 lg:grid-cols-[1.1fr_0.9fr]">
          <CurrentStagePanel stage={currentStage} stats={fallbackLearner.stats} learnerState={learnerState} missing={missing} />
          <MasteryPanel learnerState={learnerState} />
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4">
          <AssessmentCatalog blueprints={blueprints} />
        </section>
      </main>
    </>
  );
}

function getMasteryAverage(learnerState: LearnerCurriculumState | null): number {
  const values = Object.values(learnerState?.skillMastery || {}).map((value) => Number(value) || 0);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getStageStatus(index: number, currentIndex: number, unlocked: boolean): StageStatus {
  if (index < currentIndex) return 'done';
  if (index === currentIndex) return 'current';
  return unlocked ? 'unlocked' : 'locked';
}

function getMissingRequirements(stage: CurriculumStage, stats: ReturnType<typeof getLearnerStageProgress>['stats']): string[] {
  const missing: string[] = [];
  if (stats.masteredWords < stage.targetWords) missing.push(`${stage.targetWords - stats.masteredWords} từ nhớ tốt`);
  if (stats.completedStories < stage.targetStories) missing.push(`${stage.targetStories - stats.completedStories} truyện hoàn thành`);
  if (stats.strongGameScores < stage.targetGames) missing.push(`${stage.targetGames - stats.strongGameScores} lượt game đạt 70%+`);
  return missing;
}

function pct(value: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(Math.round((value / target) * 100), 100);
}

function StageBadge({ stage, stageIndex, masteryAverage }: { stage: CurriculumStage; stageIndex: number; masteryAverage: number }) {
  const accent = STAGE_ACCENTS[stage.id];
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Đang học</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{stage.cefr}</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">{stage.titleVi}</p>
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
          <GraduationCap className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Chặng" value={stageIndex + 1} />
        <MiniStat label="Mastery" value={`${masteryAverage}%`} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${accent.bar}`} style={{ width: `${Math.max(masteryAverage, 4)}%` }} />
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, helper, tone }: { icon: ReactNode; label: string; value: number | string; helper: string; tone: MetricTone }) {
  const toneClass = toneClasses(tone);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 truncate text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-500">{helper}</p>
        </div>
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${toneClass}`}>{icon}</span>
      </div>
    </div>
  );
}

function StageStep({ stage, index, status, stats }: { stage: CurriculumStage; index: number; status: StageStatus; stats: ReturnType<typeof getLearnerStageProgress>['stats'] }) {
  const accent = STAGE_ACCENTS[stage.id];
  const active = status === 'current';
  const locked = status === 'locked';
  const displayStats = status === 'done'
    ? { masteredWords: stage.targetWords, completedStories: stage.targetStories, strongGameScores: stage.targetGames }
    : stats;

  return (
    <article id={stage.id} className={`rounded-lg border bg-white p-4 shadow-sm transition ${active ? accent.border : 'border-slate-200'} ${locked ? 'opacity-75' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg text-sm font-black text-white ${locked ? 'bg-slate-300' : accent.solid}`}>
          {status === 'done' ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : locked ? <LockKeyhole className="h-5 w-5" aria-hidden="true" /> : index + 1}
        </span>
        <StatusPill status={status} />
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-400">{stage.cefr}</p>
      <h3 className="mt-1 min-h-[48px] text-lg font-black leading-6 text-slate-950">{stage.titleVi}</h3>
      <div className="mt-4 space-y-3">
        <RequirementLine icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} label="Từ" current={displayStats.masteredWords} target={stage.targetWords} tone={accent.bar} />
        <RequirementLine icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />} label="Truyện" current={displayStats.completedStories} target={stage.targetStories} tone={accent.bar} />
        <RequirementLine icon={<Gamepad2 className="h-4 w-4" aria-hidden="true" />} label="Game" current={displayStats.strongGameScores} target={stage.targetGames} tone={accent.bar} />
      </div>
      <Link
        href={locked ? '/learn/checkpoint' : active ? '/learn/today' : `/roadmap#${stage.id}`}
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-black ${locked ? 'bg-slate-100 text-slate-400' : `${accent.soft} ${accent.text}`}`}
      >
        {locked ? 'Cần checkpoint' : active ? 'Học hôm nay' : 'Xem chặng'}
      </Link>
    </article>
  );
}

function StatusPill({ status }: { status: StageStatus }) {
  const labels: Record<StageStatus, string> = { done: 'Xong', current: 'Đang học', unlocked: 'Mở', locked: 'Khóa' };
  const classes: Record<StageStatus, string> = {
    done: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    current: 'bg-violet-50 text-violet-700 ring-violet-100',
    unlocked: 'bg-sky-50 text-sky-700 ring-sky-100',
    locked: 'bg-slate-100 text-slate-400 ring-slate-200',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${classes[status]}`}>{labels[status]}</span>;
}

function CurrentStagePanel({ stage, stats, learnerState, missing }: { stage: CurriculumStage; stats: ReturnType<typeof getLearnerStageProgress>['stats']; learnerState: LearnerCurriculumState | null; missing: string[] }) {
  const accent = STAGE_ACCENTS[stage.id];
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
            <Target className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-violet-500">Điều kiện chặng</p>
            <h2 className="text-xl font-black text-slate-950">{stage.titleVi}</h2>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{learnerState ? 'Đồng bộ DB' : 'Guest/local'}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <GoalTile label="Từ nhớ tốt" value={stats.masteredWords} target={stage.targetWords} tone="violet" />
        <GoalTile label="Truyện xong" value={stats.completedStories} target={stage.targetStories} tone="sky" />
        <GoalTile label="Game 70%+" value={stats.strongGameScores} target={stage.targetGames} tone="emerald" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">Chủ đề</p>
          <div className="flex flex-wrap gap-2">
            {stage.topics.slice(0, 8).map((topic) => (
              <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{topic}</span>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Thiếu để qua chặng</p>
          <div className="mt-2 space-y-2">
            {missing.length > 0 ? missing.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <ListChecks className="h-4 w-4 text-violet-500" aria-hidden="true" /> {item}
              </div>
            )) : (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Sẵn sàng làm checkpoint.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NextActionPanel({ learnerState, recentScore, missingCount }: { learnerState: LearnerCurriculumState | null; recentScore: number | null; missingCount: number }) {
  const actions = [
    { href: '/learn/placement', label: 'Placement test', helper: 'Xếp trình độ', done: learnerState?.placementDone || false, icon: ShieldCheck },
    { href: '/learn/today', label: 'Today Plan', helper: 'Học tiếp theo queue', done: false, icon: Play },
    { href: '/learn/checkpoint', label: 'Checkpoint', helper: missingCount > 0 ? `${missingCount} mục còn thiếu` : 'Sẵn sàng kiểm tra', done: learnerState?.recentAttempt?.passed || false, icon: ClipboardCheck },
  ];
  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-sm md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
          <Sparkles className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-white/50">Next action</p>
          <h2 className="text-xl font-black">Việc cần làm</h2>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="flex items-center justify-between gap-3 rounded-lg bg-white/10 px-4 py-3 transition hover:bg-white/15">
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="h-5 w-5 flex-shrink-0 text-white/80" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{action.label}</span>
                  <span className="block truncate text-xs font-bold text-white/55">{action.helper}</span>
                </span>
              </span>
              {action.done ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-300" aria-hidden="true" /> : <ArrowRight className="h-5 w-5 flex-shrink-0" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
      <div className="mt-5 rounded-lg bg-white/10 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-white/50">Điểm gần nhất</p>
        <p className="mt-1 text-3xl font-black">{recentScore === null ? '--' : `${Math.round(recentScore)}%`}</p>
      </div>
    </aside>
  );
}

function MasteryPanel({ learnerState }: { learnerState: LearnerCurriculumState | null }) {
  const skills = ['vocabulary', 'listening', 'reading', 'grammar', 'writing', 'speaking'];
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Mastery</p>
            <h2 className="text-xl font-black text-slate-950">Kỹ năng</h2>
          </div>
        </div>
        <Link href="/progress/review" className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
          Ôn tập <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {skills.map((skill) => {
          const value = Math.round(learnerState?.skillMastery?.[skill] || 0);
          return <SkillBar key={skill} label={SKILL_LABELS[skill] ?? skill} value={value} />;
        })}
      </div>
    </section>
  );
}

function AssessmentCatalog({ blueprints }: { blueprints: AssessmentBlueprint[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-violet-500">Assessments</p>
          <h2 className="text-2xl font-black text-slate-950">Bài kiểm tra</h2>
        </div>
        <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200 sm:inline-flex">{blueprints.length} cấu hình</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.1fr_110px_110px_1fr_120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-400 lg:grid">
          <span>Bài</span>
          <span className="text-right">Câu</span>
          <span className="text-right">Pass</span>
          <span>Kỹ năng</span>
          <span className="text-right">Hành động</span>
        </div>
        {blueprints.map((blueprint) => <AssessmentRow key={blueprint.id} blueprint={blueprint} />)}
      </div>
    </section>
  );
}

function AssessmentRow({ blueprint }: { blueprint: AssessmentBlueprint }) {
  const meta = ASSESSMENT_META[blueprint.kind];
  const Icon = meta.icon;
  const weights = Object.entries(blueprint.skillWeights || {}).filter(([, value]) => Number(value) > 0);
  return (
    <div className="grid gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[1.1fr_110px_110px_1fr_120px] lg:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${toneClasses(meta.tone)}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{blueprint.titleVi || meta.label}</p>
            <p className="truncate text-xs font-bold text-slate-500">{meta.purpose}</p>
          </div>
        </div>
      </div>
      <DataCell label="Câu" value={blueprint.itemCount} />
      <DataCell label="Pass" value={`${blueprint.passPercent}%`} helper={`Min ${blueprint.minSkillPercent}%`} />
      <div className="min-w-0">
        <p className="mb-2 text-xs font-black uppercase text-slate-400 lg:hidden">Kỹ năng</p>
        <div className="flex flex-wrap gap-2">
          {weights.length > 0 ? weights.slice(0, 5).map(([skill, value]) => (
            <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
              {SKILL_LABELS[skill] ?? skill} {value}
            </span>
          )) : <span className="text-sm font-bold text-slate-400">Theo cấu hình mặc định</span>}
        </div>
      </div>
      <div className="lg:text-right">
        <Link href={meta.href} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-sm">
          Mở bài <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function DataCell({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="text-left lg:text-right">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="font-black text-slate-950">{value}</p>
      {helper && <p className="text-xs font-bold text-slate-400">{helper}</p>}
    </div>
  );
}

function RequirementLine({ icon, label, current, target, tone }: { icon: ReactNode; label: string; current: number; target: number; tone: string }) {
  const value = Math.min(current, target);
  const percentage = pct(value, target);
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs font-black text-slate-500">
        <span className="flex min-w-0 items-center gap-1.5">
          {icon}
          <span className="truncate">{label}</span>
        </span>
        <span>{value}/{target}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(percentage, 4)}%` }} />
      </div>
    </div>
  );
}

function GoalTile({ label, value, target, tone }: { label: string; value: number; target: number; tone: MetricTone }) {
  const percentage = pct(value, target);
  const barClass = barClasses(tone);
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{Math.min(value, target)}/{target}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">{percentage}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(percentage, 4)}%` }} />
      </div>
    </div>
  );
}

function SkillBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3 text-sm font-black">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" style={{ width: `${Math.max(value, 4)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
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

function barClasses(tone: MetricTone): string {
  const classes: Record<MetricTone, string> = {
    sky: 'bg-sky-500',
    violet: 'bg-violet-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-500',
  };
  return classes[tone];
}
