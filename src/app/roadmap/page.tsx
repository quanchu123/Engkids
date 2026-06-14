'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Check, Sparkles, Star, Loader2, MessageCircle, Mic, PenLine } from 'lucide-react';
import Header from '@/components/layout/Header';
import UiIcon, { type UiIconName } from '@/components/common/UiIcon';
import { useAppStore } from '@/store/useAppStore';
import { getLearnerStageProgress, CURRICULUM_STAGES, getStageById } from '@/lib/curriculum';
import {
  buildLessonRoadmap,
  type LessonRoadmapNode,
  type LessonRoadmapStage,
  type LessonRoadmapUnit,
  type LessonNodeStatus,
} from '@/lib/roadmap';
import type { CurriculumCatalog, LearnerCurriculumState } from '@/services/curriculum-content';
import type { LessonSummaryPublic, CurriculumUnitPublic } from '@/services/lessons';

// Per-stage colour worlds (kid-friendly, high contrast).
const STAGE_THEME: Record<string, { from: string; to: string; ring: string; soft: string; text: string; dot: string }> = {
  'a2-key': { from: 'from-sky-400', to: 'to-cyan-500', ring: 'ring-sky-200', soft: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  'b1-preliminary': { from: 'from-violet-400', to: 'to-purple-500', ring: 'ring-violet-200', soft: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'b2-first': { from: 'from-emerald-400', to: 'to-teal-500', ring: 'ring-emerald-200', soft: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'c1-advanced': { from: 'from-amber-400', to: 'to-orange-500', ring: 'ring-amber-200', soft: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

// Pick a kid icon from the lesson's first skill focus.
const SKILL_ICON: Record<string, UiIconName> = {
  reading: 'open-book',
  listening: 'audio',
  speaking: 'microphone',
  writing: 'abc',
  grammar: 'light',
  'use-of-english': 'light',
  vocabulary: 'books',
};

function themeFor(stageId: string) {
  return STAGE_THEME[stageId] ?? STAGE_THEME['a2-key'];
}

function iconForNode(node: LessonRoadmapNode): UiIconName {
  const skill = node.skillFocus[0];
  return (skill && SKILL_ICON[skill]) || 'graduation-cap';
}

interface LessonApiResponse {
  lessons?: LessonSummaryPublic[];
  units?: CurriculumUnitPublic[];
}

export default function RoadmapPage() {
  const progress = useAppStore((state) => state.progress);
  const fallbackLearner = useMemo(() => getLearnerStageProgress(progress), [progress]);
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);
  const [lessonData, setLessonData] = useState<LessonApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetch('/api/curriculum', { credentials: 'include', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch('/api/lessons', { credentials: 'include', cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([cat, lessons]) => {
        if (!active) return;
        setCatalog(cat || null);
        setLessonData(lessons || null);
        if (!lessons?.lessons?.length) setError('Chưa tải được danh sách bài học.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stages = catalog?.stages?.length ? catalog.stages : CURRICULUM_STAGES;
  const learnerState = catalog?.learnerState || null;
  const isAuthenticated = Boolean(learnerState);

  const model = useMemo(
    () =>
      buildLessonRoadmap({
        stages,
        units: lessonData?.units ?? [],
        lessons: lessonData?.lessons ?? [],
        unlockedStageIds: learnerState?.unlockedStageIds ?? null,
        currentStageId: learnerState?.currentStageId ?? fallbackLearner.stage.id,
        isAuthenticated,
      }),
    [stages, lessonData, learnerState, fallbackLearner, isAuthenticated],
  );

  // Current stage = earliest open+incomplete, else first.
  const currentStageModel = model.stages.find((s) => s.status === 'current')
    ?? model.stages.find((s) => s.open && s.status !== 'done')
    ?? model.stages[0];
  const currentStage = currentStageModel ? getStageById(currentStageModel.stage.id) : fallbackLearner.stage;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50">
      <Header />

      <JourneyHero
        stageCefr={currentStage.cefr}
        stageTitle={currentStage.titleVi}
        overallPercent={model.overallPercent}
        doneLessons={model.doneLessons}
        totalLessons={model.totalLessons}
        synced={isAuthenticated}
      />

      <main className="mx-auto max-w-3xl px-4 pb-24">
        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Đang tải bản đồ học tập...
          </div>
        ) : model.totalLessons === 0 ? (
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-bold text-amber-800 shadow-sm">
            {error || 'Chưa có bài học nào. Hãy quay lại sau nhé!'}
          </div>
        ) : (
          <>
            {!isAuthenticated && (
              <div className="mt-6 rounded-2xl border border-violet-200 bg-white p-4 text-sm font-bold text-violet-700 shadow-sm">
                Bạn đang xem ở chế độ khách. Đăng nhập để lưu tiến trình và mở khóa các chặng tiếp theo.
              </div>
            )}
            {model.stages.map((stageModel) => (
              <StageWorld key={stageModel.stage.id} stageModel={stageModel} currentLessonId={model.currentLessonId} />
            ))}
            <FinishFlag done={model.finished} />
          </>
        )}

        <PracticeRooms />
      </main>
    </div>
  );
}

const PRACTICE_ROOMS: Array<{
  href: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: typeof MessageCircle;
  from: string;
  via: string;
  to: string;
  glow: string;
  blob: string;
}> = [
  {
    href: '/learn/chat',
    title: 'Trò chuyện',
    subtitle: 'Nhắn tin tiếng Anh với Buddy, học cách trả lời tự nhiên.',
    cta: 'Bắt đầu chat',
    icon: MessageCircle,
    from: 'from-teal-400',
    via: 'via-emerald-400',
    to: 'to-cyan-500',
    glow: 'rgba(16,185,129,0.45)',
    blob: 'bg-emerald-300/40',
  },
  {
    href: '/learn/speak',
    title: 'Luyện nói',
    subtitle: 'Chạm micro, nói tiếng Anh và nghe Buddy đáp lại.',
    cta: 'Tập nói ngay',
    icon: Mic,
    from: 'from-fuchsia-400',
    via: 'via-pink-400',
    to: 'to-rose-500',
    glow: 'rgba(217,70,239,0.45)',
    blob: 'bg-pink-300/40',
  },
  {
    href: '/learn/write',
    title: 'Luyện viết',
    subtitle: 'Viết câu theo đề, được Buddy chấm và chữa nhẹ nhàng.',
    cta: 'Viết thử',
    icon: PenLine,
    from: 'from-amber-400',
    via: 'via-orange-400',
    to: 'to-rose-400',
    glow: 'rgba(251,146,60,0.45)',
    blob: 'bg-amber-300/40',
  },
];

function PracticeRooms() {
  return (
    <section className="mt-14">
      <div className="mb-4 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-black uppercase tracking-wide text-violet-600 shadow-sm ring-1 ring-violet-100">
          <Sparkles className="h-4 w-4" aria-hidden="true" /> Phòng luyện tập
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-900">Luyện nói, viết &amp; trò chuyện</h2>
        <p className="mt-1 max-w-md text-sm font-bold text-slate-500">
          Sau khi đi bản đồ, ghé các phòng này để luyện cùng Buddy nhé!
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PRACTICE_ROOMS.map((room) => {
          const Icon = room.icon;
          return (
            <Link
              key={room.href}
              href={room.href}
              className={`group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${room.from} ${room.via} ${room.to} p-5 text-white shadow-xl transition duration-300 hover:-translate-y-1.5`}
              style={{ boxShadow: `0 10px 0 rgba(0,0,0,0.10), 0 18px 40px ${room.glow}` }}
            >
              {/* Soft decorative blob */}
              <span
                className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${room.blob} blur-2xl transition-transform duration-500 group-hover:scale-125`}
                aria-hidden="true"
              />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-sm ring-1 ring-white/40 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <Icon className="h-8 w-8" aria-hidden="true" />
              </span>
              <h3 className="relative mt-4 text-lg font-black leading-tight drop-shadow-sm">{room.title}</h3>
              <p className="relative mt-1 text-[13px] font-bold leading-snug text-white/90">{room.subtitle}</p>
              <span className="relative mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-900 shadow-sm transition-transform duration-300 group-hover:translate-x-1">
                {room.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function JourneyHero({
  stageCefr,
  stageTitle,
  overallPercent,
  doneLessons,
  totalLessons,
  synced,
}: {
  stageCefr: string;
  stageTitle: string;
  overallPercent: number;
  doneLessons: number;
  totalLessons: number;
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
          {stageCefr} — {stageTitle}
        </p>

        <div className="mt-5 rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-black uppercase">
            <span>Bài đã xong</span>
            <span>{doneLessons}/{totalLessons} · {overallPercent}%</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-lime-300 transition-all"
              style={{ width: `${Math.max(overallPercent, 3)}%` }}
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

function StageWorld({ stageModel, currentLessonId }: { stageModel: LessonRoadmapStage; currentLessonId: string | null }) {
  const theme = themeFor(stageModel.stage.id);
  const locked = stageModel.status === 'locked';

  return (
    <section className="relative mt-10 first:mt-8">
      {/* Stage banner */}
      <div className={`sticky top-2 z-10 mb-2 rounded-2xl border bg-white/90 px-4 py-3 shadow-sm backdrop-blur ${theme.ring} ring-1`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} text-white shadow`}>
            {stageModel.status === 'done' ? (
              <Check className="h-6 w-6" aria-hidden="true" />
            ) : locked ? (
              <Lock className="h-5 w-5" aria-hidden="true" />
            ) : (
              <span className="text-lg font-black">{stageModel.index + 1}</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-black uppercase tracking-wide ${theme.text}`}>{stageModel.stage.cefr}</p>
            <h2 className="truncate text-base font-black text-slate-900">{stageModel.stage.titleVi}</h2>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${theme.soft} ${theme.text}`}>
            {stageModel.doneCount}/{stageModel.totalCount}
          </span>
        </div>
      </div>

      {locked ? (
        <div className="mx-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-6 text-center text-sm font-bold text-slate-400">
          <Lock className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
          Hoàn thành chặng trước hoặc làm bài kiểm tra để mở khóa.
        </div>
      ) : (
        stageModel.units.map((unit) => <UnitSection key={unit.unitId} unit={unit} theme={theme} currentLessonId={currentLessonId} />)
      )}
    </section>
  );
}

function UnitSection({ unit, theme, currentLessonId }: { unit: LessonRoadmapUnit; theme: ReturnType<typeof themeFor>; currentLessonId: string | null }) {
  if (unit.nodes.length === 0) return null;
  return (
    <div className="mb-4 mt-3">
      <div className="mb-1 flex items-center justify-between gap-3 px-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${theme.soft} ${theme.text}`}>{unit.theme}</span>
          <span className="text-sm font-black text-slate-700">{unit.titleVi}</span>
        </div>
        <span className="text-xs font-bold text-slate-400">{unit.doneCount}/{unit.totalCount}</span>
      </div>
      <div className="relative px-2 py-2">
        {unit.nodes.map((node, i) => (
          <PathNode
            key={node.lessonId}
            node={node}
            align={i % 2 === 0 ? 'left' : 'right'}
            isLast={i === unit.nodes.length - 1}
            theme={theme}
            isCurrent={node.lessonId === currentLessonId}
          />
        ))}
      </div>
    </div>
  );
}

function PathNode({
  node,
  align,
  isLast,
  theme,
  isCurrent,
}: {
  node: LessonRoadmapNode;
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
          'relative flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-lg transition',
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
          <UiIcon name={iconForNode(node)} size={36} />
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
    <div className={`max-w-[210px] ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <p className={`text-sm font-black leading-snug ${locked ? 'text-slate-400' : 'text-slate-900'}`}>{node.titleVi}</p>
      {!locked && node.estimatedMinutes > 0 && (
        <p className="text-xs font-bold text-slate-500">{node.estimatedMinutes} phút</p>
      )}
      {!locked && node.skillFocus.length > 0 && (
        <div className={`mt-1 flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
          {node.skillFocus.slice(0, 3).map((skill) => (
            <span key={skill} className={`rounded-full px-2 py-0.5 text-[10px] font-black ${theme.soft} ${theme.text}`}>{skill}</span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      <div className={`flex items-center gap-4 ${align === 'left' ? 'justify-start pr-10' : 'flex-row-reverse justify-start pl-10'}`}>
        {circle}
        {label}
      </div>
      {!isLast && (
        <div className="flex justify-center py-1" aria-hidden="true">
          <span className={`h-7 w-1.5 rounded-full ${done ? 'bg-emerald-300' : locked ? 'bg-slate-200' : theme.dot} opacity-60`} />
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
          : 'Hoàn thành tất cả bài học để mở chiếc cúp vàng.'}
      </p>
    </div>
  );
}
