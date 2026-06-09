'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock3, GraduationCap, Layers, Loader2, Save } from 'lucide-react';
import Header from '@/components/layout/Header';
import type { LessonDetailPublic } from '@/services/lessons';

export default function LessonRunnerPage({ params }: { params: { id: string } }) {
  const [lesson, setLesson] = useState<LessonDetailPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/lessons/${encodeURIComponent(params.id)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Khong tai duoc lesson.');
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setLesson(data.lesson || null);
        setActiveStepId(data.lesson?.steps?.[0]?.id || null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Khong tai duoc lesson.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  const activeStep = useMemo(
    () => lesson?.steps.find((step) => step.id === activeStepId) || lesson?.steps[0] || null,
    [lesson, activeStepId],
  );

  const saveDone = async () => {
    if (!lesson) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}/progress`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', completedSteps: lesson.steps.length, totalSteps: lesson.steps.length, scorePercent: 100, lastStepId: activeStep?.id }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Dang nhap de luu tien trinh.' : 'Khong luu duoc tien trinh.');
      setLesson({ ...lesson, progress: { status: 'done', completedSteps: lesson.steps.length, totalSteps: lesson.steps.length, scorePercent: 100, lastStepId: activeStep?.id || null, startedAt: lesson.progress?.startedAt || new Date().toISOString(), completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong luu duoc tien trinh.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7fbff] pb-16 text-slate-900">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-5">
            <Link href="/learn/today" className="inline-flex items-center gap-2 text-sm font-black text-violet-700">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Today Plan
            </Link>
            {loading ? (
              <div className="mt-8 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Dang tai lesson...
              </div>
            ) : error && !lesson ? (
              <div className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>
            ) : lesson ? (
              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
                <section className="rounded-lg border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-violet-50 p-5 shadow-sm md:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase text-violet-700 shadow-sm ring-1 ring-violet-100">
                      <GraduationCap className="h-4 w-4" aria-hidden="true" /> {lesson.cefr}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                      <Clock3 className="h-4 w-4" aria-hidden="true" /> {lesson.estimatedMinutes} phut
                    </span>
                  </div>
                  <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">{lesson.titleVi}</h1>
                  <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 md:text-base">{lesson.objectiveVi}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {lesson.skillFocus.map((skill) => (
                      <span key={skill} className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-sky-700 ring-1 ring-sky-100">{skill}</span>
                    ))}
                  </div>
                </section>

                <aside className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-white/50">Progress</p>
                  <p className="mt-2 text-3xl font-black">{lesson.progress?.status === 'done' ? 'Done' : `${lesson.progress?.completedSteps || 0}/${lesson.steps.length}`}</p>
                  <button
                    type="button"
                    onClick={saveDone}
                    disabled={saving}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                    Luu hoan thanh
                  </button>
                  {error && <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-bold text-rose-100">{error}</p>}
                </aside>

                <section className="grid gap-5 lg:col-span-2 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    {activeStep ? (
                      <>
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-500">
                          <Layers className="h-4 w-4" aria-hidden="true" /> {activeStep.stepType}
                        </span>
                        <h2 className="mt-4 text-2xl font-black text-slate-950">{activeStep.titleVi}</h2>
                        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{activeStep.instructionVi}</p>
                        <pre className="mt-5 overflow-auto rounded-lg bg-slate-950 p-4 text-xs font-semibold leading-5 text-slate-100">{JSON.stringify(activeStep.payload, null, 2)}</pre>
                      </>
                    ) : (
                      <p className="text-sm font-bold text-slate-500">Lesson nay chua co step.</p>
                    )}
                  </div>

                  <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
                    {lesson.steps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStepId(step.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left shadow-sm ${activeStep?.id === step.id ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'}`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-slate-950">{step.titleVi}</span>
                          <span className="text-xs font-bold uppercase text-slate-400">{step.stepType}</span>
                        </span>
                        {lesson.progress?.status === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
                      </button>
                    ))}
                  </aside>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
