'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Database,
  Flag,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { getStageById, type CurriculumStageId } from '@/lib/curriculum';
import type { AssessmentKind, AssessmentAttemptResult, AssessmentBlueprint, AssessmentItemPublic, CurriculumSkillId } from '@/services/curriculum-content';

interface AssessmentPayload {
  blueprint: AssessmentBlueprint;
  items: AssessmentItemPublic[];
}

interface AssessmentRunnerProps {
  kind: AssessmentKind;
  stageId?: CurriculumStageId;
  titleVi: string;
  subtitleVi: string;
  backHref?: string;
}

const SKILL_LABELS: Record<CurriculumSkillId, string> = {
  vocabulary: 'Từ vựng',
  listening: 'Nghe',
  reading: 'Đọc hiểu',
  grammar: 'Ngữ pháp',
  writing: 'Viết',
  speaking: 'Nói',
};

const KIND_LABELS: Record<AssessmentKind, string> = {
  placement: 'Placement',
  'daily-check': 'Daily Check',
  'weekly-checkpoint': 'Checkpoint',
  'stage-exit': 'Stage Exit',
};

const SKILL_COLORS: Record<string, string> = {
  vocabulary: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100',
  listening: 'bg-sky-50 text-sky-700 ring-sky-100',
  reading: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  grammar: 'bg-amber-50 text-amber-700 ring-amber-100',
  writing: 'bg-rose-50 text-rose-700 ring-rose-100',
  speaking: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
};

const ANSWER_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function AssessmentRunner({ kind, stageId, titleVi, subtitleVi, backHref = '/learn/today' }: AssessmentRunnerProps) {
  const [payload, setPayload] = useState<AssessmentPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => payload?.items ?? [], [payload?.items]);
  const currentItem = items[currentIndex];
  const answeredCount = items.filter((item) => answers[item.id]).length;
  const ready = Boolean(items.length > 0 && answeredCount === items.length);
  const percent = items.length > 0 ? Math.round((answeredCount / items.length) * 100) : 0;
  const passPercent = payload?.blueprint.passPercent ?? 70;
  const minSkillPercent = payload?.blueprint.minSkillPercent ?? 60;
  const stageQuery = stageId ? `?stage=${stageId}` : '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);

    fetch(`/api/assessments/${kind}${stageQuery}`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tải được bài kiểm tra');
        if (active) setPayload(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được bài kiểm tra');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [kind, stageQuery]);

  const skillCounts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.skillId] = (acc[item.skillId] ?? 0) + 1;
      return acc;
    }, {});
  }, [items]);

  const primaryAction = useMemo(() => {
    if (!result) return null;
    if (result.passed) return { href: '/learn/today', label: 'Về Today Plan' };
    return { href: '/progress/review', label: 'Ôn kỹ năng yếu' };
  }, [result]);

  const chooseAnswer = (itemId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: answer }));
  };

  const goNext = () => {
    if (!items.length) return;
    setCurrentIndex((value) => Math.min(value + 1, items.length - 1));
  };

  const goPrev = () => {
    setCurrentIndex((value) => Math.max(value - 1, 0));
  };

  const submit = async () => {
    if (!payload || !ready || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/assessments/${kind}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprintId: payload.blueprint.id,
          stageId,
          responses: items.map((item) => ({ itemId: item.id, answer: answers[item.id] })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không lưu được kết quả');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được kết quả');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7fbff] pb-20 text-slate-900">
        <section className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <Link href={backHref} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 transition hover:text-violet-700">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại
            </Link>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px] lg:items-stretch">
              <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-5 shadow-sm md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wide text-violet-700 shadow-sm ring-1 ring-violet-100">
                    <Sparkles className="h-4 w-4" aria-hidden="true" /> Mission Quiz
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-100">{KIND_LABELS[kind]}</span>
                </div>
                <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">{titleVi}</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">{subtitleVi}</p>
              </div>

              <HeaderProgressCard loading={loading} total={items.length} answered={answeredCount} percent={percent} passPercent={passPercent} minSkillPercent={minSkillPercent} />
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_320px] lg:py-8">
          <section>
            {loading && <LoadingPanel />}

            {error && <ErrorPanel message={error} />}

            {!loading && payload && currentItem && !result && (
              <QuestionWorkspace
                item={currentItem}
                index={currentIndex}
                total={items.length}
                selectedAnswer={answers[currentItem.id]}
                answeredCount={answeredCount}
                ready={ready}
                submitting={submitting}
                onChoose={(choice) => chooseAnswer(currentItem.id, choice)}
                onPrev={goPrev}
                onNext={goNext}
                onSubmit={submit}
              />
            )}

            {result && <ResultPanel result={result} primaryAction={primaryAction} />}
          </section>

          <AssessmentSidebar
            items={items}
            answers={answers}
            currentIndex={currentIndex}
            percent={percent}
            skillCounts={skillCounts}
            setCurrentIndex={setCurrentIndex}
          />
        </div>
      </main>
    </>
  );
}

function HeaderProgressCard({ loading, total, answered, percent, passPercent, minSkillPercent }: { loading: boolean; total: number; answered: number; percent: number; passPercent: number; minSkillPercent: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Câu" value={loading ? '--' : total} />
        <Stat label="Đã làm" value={`${answered}/${total || 0}`} />
        <Stat label="Pass" value={`${passPercent}%`} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500 transition-all" style={{ width: `${Math.max(percent, loading ? 8 : 0)}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black text-slate-400">
        <span>Hoàn thành {percent}%</span>
        <span>Min skill {minSkillPercent}%</span>
      </div>
    </div>
  );
}

function QuestionWorkspace({
  item,
  index,
  total,
  selectedAnswer,
  answeredCount,
  ready,
  submitting,
  onChoose,
  onPrev,
  onNext,
  onSubmit,
}: {
  item: AssessmentItemPublic;
  index: number;
  total: number;
  selectedAnswer?: string;
  answeredCount: number;
  ready: boolean;
  submitting: boolean;
  onChoose: (choice: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  const last = index >= total - 1;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white">Câu {index + 1}/{total}</span>
        <span className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ${SKILL_COLORS[item.skillId] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
          {SKILL_LABELS[item.skillId] ?? item.skillId}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-100">{item.topic}</span>
      </div>

      <div className="mt-5 rounded-lg bg-gradient-to-br from-sky-50 to-violet-50 p-5 ring-1 ring-sky-100">
        <p className="text-xs font-black uppercase tracking-wide text-violet-500">Câu hỏi</p>
        <h2 className="mt-2 text-2xl font-black leading-9 text-slate-950 md:text-3xl">{item.prompt}</h2>
        {item.promptVi && <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{item.promptVi}</p>}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {item.choices.map((choice, choiceIndex) => {
          const selected = selectedAnswer === choice;
          return (
            <button
              key={choice}
              type="button"
              data-testid="assessment-choice"
              onClick={() => onChoose(choice)}
              className={`group min-h-[72px] rounded-lg border-2 px-4 py-3 text-left transition ${
                selected
                  ? 'border-violet-500 bg-violet-50 text-violet-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-black ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}>
                  {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : ANSWER_LETTERS[choiceIndex]}
                </span>
                <span className="text-sm font-black leading-5 md:text-base">{choice}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          data-testid="assessment-prev"
          onClick={onPrev}
          disabled={index === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Trước
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          {!last ? (
            <button
              type="button"
              data-testid="assessment-next"
              onClick={onNext}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm"
            >
              Câu tiếp <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              data-testid="assessment-submit"
              onClick={onSubmit}
              disabled={!ready || submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
              {submitting ? 'Đang lưu...' : 'Nộp bài'}
            </button>
          )}
        </div>
      </div>

      {!ready && last && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-100">
          Còn {total - answeredCount} câu chưa chọn. Bấm số câu bên phải để hoàn thành nhanh.
        </p>
      )}
    </div>
  );
}

function AssessmentSidebar({
  items,
  answers,
  currentIndex,
  percent,
  skillCounts,
  setCurrentIndex,
}: {
  items: AssessmentItemPublic[];
  answers: Record<string, string>;
  currentIndex: number;
  percent: number;
  skillCounts: Record<string, number>;
  setCurrentIndex: (value: number) => void;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-slate-800">Bản đồ câu hỏi</p>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{percent}%</span>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
          {items.map((item, index) => {
            const isAnswered = Boolean(answers[item.id]);
            const isCurrent = index === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                data-testid="assessment-map-button"
                onClick={() => setCurrentIndex(index)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black transition ${
                  isCurrent
                    ? 'bg-violet-600 text-white shadow-sm'
                    : isAnswered
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-700'
                }`}
                aria-label={`Câu ${index + 1}`}
              >
                {isAnswered && !isCurrent ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-600" aria-hidden="true" />
          <p className="text-sm font-black text-slate-800">Kỹ năng trong bài</p>
        </div>
        <div className="mt-3 space-y-2">
          {Object.entries(skillCounts).map(([skill, total]) => (
            <div key={skill} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${SKILL_COLORS[skill] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                {SKILL_LABELS[skill as CurriculumSkillId] ?? skill}
              </span>
              <span className="text-xs font-black text-slate-500">{total} câu</span>
            </div>
          ))}
          {Object.keys(skillCounts).length === 0 && <p className="text-sm font-bold text-slate-400">Đang tải kỹ năng...</p>}
        </div>
      </section>
    </aside>
  );
}

function ResultPanel({ result, primaryAction }: { result: AssessmentAttemptResult; primaryAction: { href: string; label: string } | null }) {
  const score = Math.round(result.scorePercent);
  const recommendedStage = getStageById(result.recommendedStageId);
  const statusClass = result.passed ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100';
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6" data-testid="assessment-result-report">
      <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="rounded-lg bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 text-center ring-1 ring-slate-100">
          {result.passed ? <Trophy className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" /> : <ShieldCheck className="mx-auto h-12 w-12 text-sky-500" aria-hidden="true" />}
          <p className="mt-3 text-sm font-black uppercase tracking-wide text-slate-500">Kết quả</p>
          <h2 className="mt-1 text-6xl font-black text-slate-950">{score}%</h2>
          <span className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ${statusClass}`}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {result.passed ? 'Đạt' : 'Cần ôn'}
          </span>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ReportStat icon={<Flag className="h-5 w-5" aria-hidden="true" />} label="Chặng đề xuất" value={recommendedStage.cefr} helper={recommendedStage.titleVi} />
            <ReportStat icon={<Database className="h-5 w-5" aria-hidden="true" />} label="Lưu kết quả" value={result.saved ? 'Đã lưu' : 'Guest'} helper={result.saved ? 'Đồng bộ DB' : 'Chưa lưu DB'} />
            <ReportStat icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />} label="Kỹ năng" value={Object.keys(result.skillBreakdown).length} helper="Có dữ liệu" />
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">Skill breakdown</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{score}% tổng</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(result.skillBreakdown).map(([skill, value]) => (
                <SkillResult key={skill} skill={skill} correct={value.correct} total={value.total} percent={value.percent} />
              ))}
              {Object.keys(result.skillBreakdown).length === 0 && (
                <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500 ring-1 ring-slate-100">Chưa có breakdown theo kỹ năng.</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {primaryAction && <Link href={primaryAction.href} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm">{primaryAction.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
            <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Làm lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillResult({ skill, correct, total, percent }: { skill: string; correct: number; total: number; percent: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-800">{SKILL_LABELS[skill as CurriculumSkillId] ?? skill}</p>
        <p className="text-sm font-black text-slate-500">{correct}/{total}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" style={{ width: `${Math.max(percent, 4)}%` }} />
      </div>
      <p className="mt-2 text-xl font-black text-slate-950">{Math.round(percent)}%</p>
    </div>
  );
}

function ReportStat({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-2 text-violet-600">{icon}<span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span></div>
      <p className="mt-2 truncate text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-500">{helper}</p>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
      <Loader2 className="mx-auto h-9 w-9 animate-spin text-violet-500" aria-hidden="true" />
      <p className="mt-3 text-sm font-bold text-slate-500">Đang tạo bài kiểm tra từ DB...</p>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return <div className="rounded-lg bg-red-50 p-5 text-sm font-bold text-red-700 ring-1 ring-red-100">{message}</div>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}
