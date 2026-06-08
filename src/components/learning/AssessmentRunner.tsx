'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import Header from '@/components/layout/Header';
import type { AssessmentKind, AssessmentAttemptResult, AssessmentBlueprint, AssessmentItemPublic } from '@/services/curriculum-content';
import type { CurriculumStageId } from '@/lib/curriculum';

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

export default function AssessmentRunner({ kind, stageId, titleVi, subtitleVi, backHref = '/learn/today' }: AssessmentRunnerProps) {
  const [payload, setPayload] = useState<AssessmentPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = payload ? payload.items.filter((item) => answers[item.id]).length : 0;
  const ready = Boolean(payload && answeredCount === payload.items.length && payload.items.length > 0);
  const percent = payload && payload.items.length > 0 ? Math.round((answeredCount / payload.items.length) * 100) : 0;

  const stageQuery = stageId ? `?stage=${stageId}` : '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});

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

  const primaryAction = useMemo(() => {
    if (!result) return null;
    if (result.passed) return { href: '/learn/today', label: 'Tiếp tục Today Plan' };
    return { href: '/progress/review', label: 'Ôn kỹ năng yếu' };
  }, [result]);

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
          responses: payload.items.map((item) => ({ itemId: item.id, answer: answers[item.id] })),
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
      <main className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50 pb-20">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-black text-violet-700 hover:text-violet-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay lại
          </Link>

          <section className="mt-5 overflow-hidden rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-violet-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-500">Assessment</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">{titleVi}</h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{subtitleVi}</p>
              </div>
              {payload && (
                <div className="rounded-2xl bg-violet-50 px-4 py-3 text-right">
                  <p className="text-xs font-black uppercase text-violet-500">Tiến độ</p>
                  <p className="text-2xl font-black text-violet-800">{answeredCount}/{payload.items.length}</p>
                </div>
              )}
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all" style={{ width: `${Math.max(percent, loading ? 8 : 0)}%` }} />
            </div>
          </section>

          {loading && (
            <section className="mt-6 rounded-[1.75rem] bg-white p-8 text-center shadow ring-1 ring-slate-100">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-500" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-slate-500">Đang tạo bài kiểm tra từ DB...</p>
            </section>
          )}

          {error && (
            <section className="mt-6 rounded-[1.75rem] bg-red-50 p-5 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {error}
            </section>
          )}

          {!loading && payload && !result && (
            <section className="mt-6 space-y-4">
              {payload.items.map((item, index) => (
                <article key={item.id} className="rounded-[1.5rem] bg-white p-5 shadow-md ring-1 ring-slate-100">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-black text-violet-700">{index + 1}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{item.skillId}</span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{item.topic}</span>
                  </div>
                  <h2 className="text-xl font-black leading-8 text-slate-950">{item.prompt}</h2>
                  {item.promptVi && <p className="mt-1 text-sm font-bold text-slate-500">{item.promptVi}</p>}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {item.choices.map((choice) => {
                      const selected = answers[item.id] === choice;
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: choice }))}
                          className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-black transition ${
                            selected
                              ? 'border-violet-500 bg-violet-50 text-violet-800'
                              : 'border-slate-100 bg-slate-50 text-slate-700 hover:border-violet-200 hover:bg-white'
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}

              <div className="sticky bottom-4 rounded-[1.5rem] bg-white/92 p-4 shadow-2xl ring-1 ring-violet-100 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-bold text-slate-500">Hoàn thành đủ câu để lưu kết quả vào DB.</p>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!ready || submitting}
                    className="rounded-2xl bg-gradient-to-r from-violet-600 to-pink-500 px-6 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {submitting ? 'Đang lưu...' : 'Nộp bài'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {result && (
            <section className="mt-6 rounded-[2rem] bg-white p-6 text-center shadow-xl ring-1 ring-slate-100">
              <CheckCircle2 className={`mx-auto h-12 w-12 ${result.passed ? 'text-emerald-500' : 'text-amber-500'}`} aria-hidden="true" />
              <h2 className="mt-3 text-3xl font-black text-slate-950">{Math.round(result.scorePercent)}%</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {result.saved ? 'Kết quả đã lưu trên DB.' : 'Bạn chưa đăng nhập nên kết quả chưa lưu vào DB.'}
              </p>
              <p className="mt-2 text-sm font-black text-violet-700">Chặng đề xuất: {result.recommendedStageId}</p>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {Object.entries(result.skillBreakdown).map(([skill, value]) => (
                  <div key={skill} className="rounded-2xl bg-slate-50 p-3 text-left">
                    <p className="text-xs font-black uppercase text-slate-400">{skill}</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{Math.round(value.percent)}%</p>
                    <p className="text-xs font-bold text-slate-500">{value.correct}/{value.total} đúng</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {primaryAction && <Link href={primaryAction.href} className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg">{primaryAction.label}</Link>}
                <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Làm lại
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}