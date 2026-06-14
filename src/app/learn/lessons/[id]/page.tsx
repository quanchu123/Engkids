'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Headphones,
  Lightbulb,
  Loader2,
  Mic,
  PartyPopper,
  PenLine,
  Sparkles,
  Star,
  Volume2,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import type { LessonDetailPublic, LessonStepPublic } from '@/services/lessons';

// ============================================================
// LESSON PLAYER (kid-friendly, one step at a time)
// ============================================================
// Replaces the old raw-JSON dump. Each lesson step type gets a dedicated,
// playful renderer (warmup / vocab / reading / grammar / speaking|writing /
// quiz). The learner walks a stepper top to bottom; the final step reveals a
// celebration card and saves progress. Audio uses the browser SpeechSynthesis
// so words can be heard without any backend.

type StepEventType = 'step-complete' | 'quiz-result' | 'output-submit' | 'reflection' | 'reward';

interface VocabItem {
  en: string;
  vi: string;
  pos?: string;
  example?: string;
}
interface QuizQuestion {
  word: string;
  answer: string;
}
interface SentenceRef {
  text: string;
  sourceUrl?: string;
}

interface StepTheme {
  label: string;
  icon: typeof BookOpen;
  from: string;
  to: string;
  soft: string;
  text: string;
  page: string;
  glow: string;
  ring: string;
}

const STEP_META: Record<string, StepTheme> = {
  warmup: { label: 'Khởi động', icon: Sparkles, from: 'from-amber-400', to: 'to-orange-500', soft: 'bg-amber-50', text: 'text-amber-700', page: 'from-amber-50 via-orange-50 to-rose-50', glow: 'rgba(251,146,60,0.4)', ring: 'ring-amber-200' },
  vocab: { label: 'Từ vựng', icon: BookOpen, from: 'from-violet-400', to: 'to-fuchsia-500', soft: 'bg-violet-50', text: 'text-violet-700', page: 'from-violet-50 via-fuchsia-50 to-sky-50', glow: 'rgba(168,85,247,0.4)', ring: 'ring-violet-200' },
  reading: { label: 'Đọc hiểu', icon: BookOpen, from: 'from-sky-400', to: 'to-cyan-500', soft: 'bg-sky-50', text: 'text-sky-700', page: 'from-sky-50 via-cyan-50 to-violet-50', glow: 'rgba(14,165,233,0.4)', ring: 'ring-sky-200' },
  listening: { label: 'Nghe', icon: Headphones, from: 'from-sky-400', to: 'to-blue-500', soft: 'bg-sky-50', text: 'text-sky-700', page: 'from-sky-50 via-blue-50 to-indigo-50', glow: 'rgba(59,130,246,0.4)', ring: 'ring-sky-200' },
  grammar: { label: 'Ngữ pháp', icon: Lightbulb, from: 'from-emerald-400', to: 'to-teal-500', soft: 'bg-emerald-50', text: 'text-emerald-700', page: 'from-emerald-50 via-teal-50 to-sky-50', glow: 'rgba(16,185,129,0.4)', ring: 'ring-emerald-200' },
  speaking: { label: 'Luyện nói', icon: Mic, from: 'from-rose-400', to: 'to-pink-500', soft: 'bg-rose-50', text: 'text-rose-700', page: 'from-rose-50 via-pink-50 to-fuchsia-50', glow: 'rgba(244,63,94,0.4)', ring: 'ring-rose-200' },
  writing: { label: 'Luyện viết', icon: PenLine, from: 'from-rose-400', to: 'to-pink-500', soft: 'bg-rose-50', text: 'text-rose-700', page: 'from-rose-50 via-pink-50 to-amber-50', glow: 'rgba(244,63,94,0.4)', ring: 'ring-rose-200' },
  quiz: { label: 'Đố vui', icon: CheckCircle2, from: 'from-indigo-400', to: 'to-violet-500', soft: 'bg-indigo-50', text: 'text-indigo-700', page: 'from-indigo-50 via-violet-50 to-fuchsia-50', glow: 'rgba(99,102,241,0.4)', ring: 'ring-indigo-200' },
  review: { label: 'Ôn tập', icon: Sparkles, from: 'from-violet-400', to: 'to-purple-500', soft: 'bg-violet-50', text: 'text-violet-700', page: 'from-violet-50 via-purple-50 to-sky-50', glow: 'rgba(168,85,247,0.4)', ring: 'ring-violet-200' },
};

function metaFor(stepType: string) {
  return STEP_META[stepType] ?? STEP_META.review;
}

// Speak an English string with the browser voice (best-effort, no-op if unsupported).
function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export default function LessonRunnerPage({ params }: { params: { id: string } }) {
  const [lesson, setLesson] = useState<LessonDetailPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const addMistake = useAppStore((state) => state.addMistake);

  useEffect(() => {
    let active = true;
    fetch(`/api/lessons/${encodeURIComponent(params.id)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không tải được bài học này.');
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setLesson(data.lesson || null);
        if (data.lesson?.progress?.status === 'done') setFinished(true);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được bài học này.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  const steps = lesson?.steps ?? [];
  const totalSteps = steps.length;
  const activeStep = steps[stepIndex] ?? null;
  const progressPercent = totalSteps > 0 ? Math.round(((stepIndex) / totalSteps) * 100) : 0;

  const saveEvent = (eventType: StepEventType, step: LessonStepPublic | null, scorePercent?: number) => {
    if (!lesson || !step) return;
    fetch(`/api/lessons/${encodeURIComponent(lesson.id)}/events`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        stepId: step.id,
        skillId: step.cefrSkill || undefined,
        scorePercent: typeof scorePercent === 'number' ? scorePercent : undefined,
        payload: { stepType: step.stepType, learningMode: lesson.learningMode },
      }),
    }).catch(() => undefined);
  };

  const goNext = () => {
    if (!activeStep) return;
    saveEvent('step-complete', activeStep);
    if (stepIndex < totalSteps - 1) {
      setStepIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      void completeLesson();
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const completeLesson = async () => {
    if (!lesson) return;
    setSaving(true);
    setFinished(true);
    try {
      await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}/progress`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'done',
          completedSteps: totalSteps,
          totalSteps,
          scorePercent: 100,
          lastStepId: activeStep?.id,
        }),
      });
    } catch {
      /* guests / offline: still show the celebration locally */
    } finally {
      setSaving(false);
    }
  };

  const activeMeta = metaFor(activeStep?.stepType ?? 'warmup');
  const pageBg = finished
    ? 'from-emerald-50 via-teal-50 to-sky-50'
    : lesson
      ? activeMeta.page
      : 'from-sky-50 via-violet-50 to-amber-50';

  return (
    <div className={`min-h-screen bg-gradient-to-b transition-colors duration-500 ${pageBg}`}>
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">
        <Link href="/roadmap" className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-black text-slate-700 shadow-sm ring-1 ring-white/60 backdrop-blur transition hover:bg-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Bản đồ học tập
        </Link>

        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-10 text-sm font-bold text-slate-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Đang mở bài học...
          </div>
        ) : error || !lesson ? (
          <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-bold text-rose-700 shadow-sm">
            {error || 'Không tìm thấy bài học.'}
            <div className="mt-4">
              <Link href="/roadmap" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-violet-700 ring-1 ring-violet-100">
                Quay lại bản đồ <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : finished ? (
          <CelebrationCard lesson={lesson} saving={saving} totalSteps={totalSteps} />
        ) : (
          <>
            {/* Lesson title + progress — adopts the active step's color world */}
            <div
              className={`relative mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br ${activeMeta.from} ${activeMeta.to} p-6 text-white shadow-xl transition-colors duration-500`}
              style={{ boxShadow: `0 10px 0 rgba(0,0,0,0.10), 0 18px 40px ${activeMeta.glow}` }}
            >
              <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" aria-hidden="true" />
              <div className="relative flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-[11px] font-black uppercase tracking-wide backdrop-blur-sm">
                  <activeMeta.icon className="h-3.5 w-3.5" aria-hidden="true" /> {activeMeta.label}
                </span>
                <span className="rounded-full bg-white/25 px-3 py-1 text-[11px] font-black backdrop-blur-sm">
                  {lesson.cefr} · {lesson.estimatedMinutes} phút
                </span>
              </div>
              <h1 className="relative mt-3 text-xl font-black leading-tight drop-shadow-sm md:text-2xl">{lesson.titleVi}</h1>
              <div className="relative mt-4 flex items-center gap-3">
                <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-black/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-lime-300 transition-all duration-500"
                    style={{ width: `${Math.max(progressPercent, 4)}%` }}
                  />
                </div>
                <span className="rounded-full bg-white/25 px-2.5 py-1 text-xs font-black backdrop-blur-sm">{stepIndex + 1}/{totalSteps}</span>
              </div>
            </div>

            {/* Step track — a little roadmap of beads connected by a line */}
            <div className="mt-5 flex items-center justify-center gap-0 px-2">
              {steps.map((s, i) => {
                const m = metaFor(s.stepType);
                const done = i < stepIndex;
                const current = i === stepIndex;
                const StepIcon = m.icon;
                return (
                  <div key={s.id} className="flex flex-1 items-center last:flex-none">
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow transition ${
                        current
                          ? `bg-gradient-to-br ${m.from} ${m.to} scale-110 ring-2 ring-white`
                          : done
                            ? 'bg-emerald-400'
                            : 'bg-slate-300'
                      }`}
                      style={current ? { boxShadow: `0 4px 0 rgba(0,0,0,0.12)` } : undefined}
                      title={m.label}
                    >
                      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <StepIcon className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    {i < steps.length - 1 && (
                      <span className={`h-1.5 flex-1 rounded-full transition ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active step */}
            {activeStep && (
              <div className="mt-5">
                <StepRenderer key={activeStep.id} step={activeStep} onMistake={addMistake} stageId={lesson.stageId} />
              </div>
            )}

            {/* Nav */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={stepIndex === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-black text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Trước
              </button>
              <button
                type="button"
                onClick={goNext}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br ${activeMeta.from} ${activeMeta.to} px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5`}
                style={{ boxShadow: `0 6px 0 rgba(0,0,0,0.12), 0 12px 24px ${activeMeta.glow}` }}
              >
                {stepIndex < totalSteps - 1 ? (
                  <>Tiếp theo <ArrowRight className="h-4 w-4" aria-hidden="true" /></>
                ) : (
                  <>Hoàn thành <PartyPopper className="h-4 w-4" aria-hidden="true" /></>
                )}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Step renderer ──────────────────────────────────────────────────────────

function StepRenderer({
  step,
  onMistake,
  stageId,
}: {
  step: LessonStepPublic;
  onMistake: ReturnType<typeof useAppStore.getState>['addMistake'];
  stageId: string;
}) {
  const meta = metaFor(step.stepType);
  return (
    <section className={`rounded-[28px] border-2 border-white bg-white p-5 shadow-lg ring-1 md:p-6 ${meta.ring}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.from} ${meta.to} text-white`}
          style={{ boxShadow: `0 5px 0 rgba(0,0,0,0.10), 0 8px 16px ${meta.glow}` }}
        >
          <meta.icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className={`text-[11px] font-black uppercase tracking-wide ${meta.text}`}>{meta.label}</p>
          <h2 className="text-lg font-black leading-tight text-slate-900">{step.titleVi}</h2>
        </div>
      </div>
      {step.instructionVi && <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{step.instructionVi}</p>}

      <div className="mt-4">
        {step.stepType === 'warmup' && <WarmupStep payload={step.payload} />}
        {step.stepType === 'vocab' && <VocabStep payload={step.payload} />}
        {(step.stepType === 'reading' || step.stepType === 'listening') && <ReadingStep payload={step.payload} />}
        {step.stepType === 'grammar' && <GrammarStep payload={step.payload} />}
        {(step.stepType === 'speaking' || step.stepType === 'writing') && <OutputStep payload={step.payload} kind={step.stepType} />}
        {step.stepType === 'quiz' && <QuizStep payload={step.payload} stageId={stageId} onMistake={onMistake} />}
        {step.stepType === 'review' && <VocabStep payload={step.payload} />}
      </div>
    </section>
  );
}

function asWords(payload: Record<string, unknown>): string[] {
  return Array.isArray(payload.words) ? (payload.words as unknown[]).filter((w): w is string => typeof w === 'string') : [];
}
function asItems(payload: Record<string, unknown>): VocabItem[] {
  return Array.isArray(payload.items)
    ? (payload.items as Record<string, unknown>[]).map((it) => ({
        en: String(it.en || ''),
        vi: String(it.vi || ''),
        pos: it.pos ? String(it.pos) : undefined,
        example: it.example ? String(it.example) : undefined,
      })).filter((it) => it.en)
    : [];
}
function asSentences(payload: Record<string, unknown>): SentenceRef[] {
  if (!Array.isArray(payload.sentences)) return [];
  return (payload.sentences as unknown[]).map((s) => {
    if (typeof s === 'string') return { text: s };
    const o = s as Record<string, unknown>;
    return { text: String(o.text || ''), sourceUrl: o.sourceUrl ? String(o.sourceUrl) : undefined };
  }).filter((s) => s.text);
}

function WarmupStep({ payload }: { payload: Record<string, unknown> }) {
  const words = asWords(payload);
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => speak(w)}
          className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-800 ring-1 ring-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-100"
        >
          {w} <Volume2 className="h-4 w-4 opacity-60" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function VocabStep({ payload }: { payload: Record<string, unknown> }) {
  const items = asItems(payload);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <button
          key={it.en}
          type="button"
          onClick={() => speak(it.en)}
          className="group flex flex-col rounded-2xl border-2 border-violet-100 bg-gradient-to-br from-white to-violet-50/60 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-black text-slate-900">{it.en}</p>
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet-500 text-white shadow transition group-hover:scale-110"
              aria-hidden="true"
            >
              <Volume2 className="h-4 w-4" />
            </span>
          </div>
          {it.pos && <span className="mt-1 inline-block w-fit rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase text-violet-600">{it.pos}</span>}
          <p className="mt-1 text-sm font-bold text-violet-700">{it.vi}</p>
          {it.example && <p className="mt-2 text-xs font-semibold italic leading-5 text-slate-500">“{it.example}”</p>}
        </button>
      ))}
    </div>
  );
}

function ReadingStep({ payload }: { payload: Record<string, unknown> }) {
  const passage = payload.passage as Record<string, unknown> | null;
  const sentences = asSentences(payload);
  return (
    <div className="space-y-3">
      {passage?.text ? (
        <div className="rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100">
          {passage.title ? <p className="text-sm font-black text-sky-900">{String(passage.title)}</p> : null}
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{String(passage.text)}</p>
        </div>
      ) : null}
      {sentences.map((s, i) => (
        <button
          key={`${s.text}-${i}`}
          type="button"
          onClick={() => speak(s.text)}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:bg-sky-50"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold leading-6 text-slate-700">{s.text}</span>
        </button>
      ))}
    </div>
  );
}

function GrammarStep({ payload }: { payload: Record<string, unknown> }) {
  const focusWords = asWords({ words: payload.focusWords });
  const sentences = asSentences(payload);
  return (
    <div className="space-y-4">
      {focusWords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {focusWords.map((w) => (
            <span key={w} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">{w}</span>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {sentences.map((s, i) => (
          <div key={`${s.text}-${i}`} className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700 ring-1 ring-slate-100">
            {s.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputStep({ payload, kind }: { payload: Record<string, unknown>; kind: 'speaking' | 'writing' }) {
  const prompt = String(payload.prompt || '');
  const requiredWords = asWords({ words: payload.requiredWords });
  const [text, setText] = useState('');
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-rose-50 p-4 ring-1 ring-rose-100">
        <p className="text-sm font-bold leading-6 text-rose-800">{prompt}</p>
        {requiredWords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {requiredWords.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => speak(w)}
                className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100"
              >
                {w}
              </button>
            ))}
          </div>
        )}
      </div>
      {kind === 'writing' ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Viết câu trả lời của bé bằng tiếng Anh..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-rose-300 focus:bg-white"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-4 text-center text-sm font-bold text-rose-600">
          <Mic className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
          Nói to câu trả lời của bé. Bé có thể bấm vào từ ở trên để nghe mẫu.
        </div>
      )}
    </div>
  );
}

function QuizStep({
  payload,
  stageId,
  onMistake,
}: {
  payload: Record<string, unknown>;
  stageId: string;
  onMistake: ReturnType<typeof useAppStore.getState>['addMistake'];
}) {
  const questions: QuizQuestion[] = useMemo(
    () =>
      Array.isArray(payload.questions)
        ? (payload.questions as Record<string, unknown>[])
            .map((q) => ({ word: String(q.word || ''), answer: String(q.answer || '') }))
            .filter((q) => q.word && q.answer)
        : [],
    [payload.questions],
  );

  // Build 4 VI options per question: the correct answer + 3 distractors from siblings.
  const options = useMemo(() => {
    const allAnswers = Array.from(new Set(questions.map((q) => q.answer)));
    return questions.map((q) => {
      const distractors = allAnswers.filter((a) => a !== q.answer);
      // shuffle distractors deterministically-ish
      for (let i = distractors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
      }
      const choices = [q.answer, ...distractors.slice(0, 3)];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      return choices;
    });
  }, [questions]);

  const [picked, setPicked] = useState<Record<number, string>>({});

  const choose = (qi: number, choice: string) => {
    if (picked[qi]) return; // lock after first pick
    setPicked((p) => ({ ...p, [qi]: choice }));
    const q = questions[qi];
    if (choice !== q.answer) {
      onMistake({
        kind: 'vocab',
        promptVi: `Nghĩa của "${q.word}"`,
        questionEn: q.word,
        yourAnswer: choice,
        correctAnswer: q.answer,
        skillId: 'vocabulary',
        stageId,
      });
    }
  };

  if (questions.length === 0) {
    return <p className="text-sm font-bold text-slate-500">Chưa có câu hỏi cho phần này.</p>;
  }

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const chosen = picked[qi];
        return (
          <div key={`${q.word}-${qi}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-slate-900">{q.word}</p>
              <button
                type="button"
                onClick={() => speak(q.word)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-indigo-600 ring-1 ring-indigo-100"
                aria-label={`Đọc ${q.word}`}
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="ml-auto text-[11px] font-bold text-slate-400">Chọn nghĩa đúng</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {options[qi].map((choice) => {
                const isChosen = chosen === choice;
                const isCorrect = choice === q.answer;
                const show = Boolean(chosen);
                let cls = 'bg-white text-slate-700 ring-slate-200';
                if (show && isCorrect) cls = 'bg-emerald-50 text-emerald-800 ring-emerald-200';
                else if (show && isChosen && !isCorrect) cls = 'bg-rose-50 text-rose-700 ring-rose-200';
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => choose(qi, choice)}
                    disabled={Boolean(chosen)}
                    className={`rounded-2xl px-3 py-2.5 text-left text-sm font-bold ring-1 transition ${cls}`}
                  >
                    {choice}
                    {show && isCorrect && <CheckCircle2 className="ml-1 inline h-4 w-4" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CelebrationCard({ lesson, saving, totalSteps }: { lesson: LessonDetailPublic; saving: boolean; totalSteps: number }) {
  return (
    <div
      className="relative mt-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-500 p-8 text-center text-white"
      style={{ boxShadow: '0 12px 0 rgba(0,0,0,0.12), 0 24px 60px rgba(16,185,129,0.45)' }}
    >
      {/* Decorative floating blobs */}
      <span className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-12 -right-8 h-44 w-44 rounded-full bg-yellow-200/30 blur-2xl" aria-hidden="true" />

      <span
        className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/25 ring-4 ring-white/40"
        style={{ boxShadow: '0 8px 0 rgba(0,0,0,0.12)' }}
      >
        <PartyPopper className="h-12 w-12" aria-hidden="true" />
      </span>

      {/* Three reward stars */}
      <div className="relative mt-5 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            className={`h-7 w-7 fill-yellow-300 text-yellow-300 drop-shadow ${i === 1 ? 'scale-125' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <h1 className="relative mt-4 text-2xl font-black drop-shadow-sm md:text-3xl">Tuyệt vời, bé làm được rồi!</h1>
      <p className="relative mt-2 text-sm font-bold text-white/90">{lesson.titleVi}</p>
      <p className="relative mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black backdrop-blur-sm">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {totalSteps} bước đã hoàn thành
      </p>

      {saving && (
        <p className="relative mt-3 flex items-center justify-center gap-2 text-xs font-bold text-white/80">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Đang lưu tiến trình...
        </p>
      )}

      <div className="relative mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/roadmap" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-emerald-700 shadow-lg transition hover:-translate-y-0.5">
          Về bản đồ <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/learn/today" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/20 px-5 py-3.5 text-sm font-black text-white backdrop-blur-sm transition hover:bg-white/30">
          Nhiệm vụ hôm nay
        </Link>
      </div>
    </div>
  );
}
