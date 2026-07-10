'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, LockKeyhole, Sparkles, Target } from 'lucide-react';
import Header from '@/components/layout/Header';
import { CURRICULUM_STAGES, type CurriculumStageId } from '@/lib/curriculum';
import type { LearnerCurriculumState } from '@/services/curriculum-content';

type LevelResponse = {
  learnerState: LearnerCurriculumState | null;
  needsSelection: boolean;
};

export default function LevelOnboardingPage() {
  const router = useRouter();
  const [selectedStageId, setSelectedStageId] = useState<CurriculumStageId>('a2-key');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nextHref, setNextHref] = useState('/roadmap');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (next?.startsWith('/') && !next.startsWith('//')) setNextHref(next);
    } catch {
      setNextHref('/roadmap');
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/learner/level', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Không tải được level của bé.');
        return response.json() as Promise<LevelResponse>;
      })
      .then((data) => {
        if (!active) return;
        if (!data) {
          setError('Bạn cần đăng nhập để lưu level học.');
          return;
        }
        if (!data.needsSelection && data.learnerState?.selectedLevelAt) {
          router.replace(nextHref || '/roadmap');
          return;
        }
        if (data.learnerState?.currentStageId) setSelectedStageId(data.learnerState.currentStageId);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được level của bé.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [nextHref, router]);

  const selectedStage = useMemo(
    () => CURRICULUM_STAGES.find((stage) => stage.id === selectedStageId) ?? CURRICULUM_STAGES[0],
    [selectedStageId],
  );

  const saveLevel = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/learner/level', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: selectedStageId, source: 'manual' }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Không lưu được level.');
      }
      router.replace('/roadmap');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được level.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7fbff] pb-16 text-slate-900">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_360px] lg:items-stretch">
            <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-sm md:p-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase text-violet-700 shadow-sm ring-1 ring-violet-100">
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Chọn level một lần
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                Chọn chặng học phù hợp cho bé
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 md:text-base">
                Engkids sẽ dùng level này để ưu tiên truyện, video, game từ vựng, Today Plan và checkpoint. Phụ huynh vẫn đổi được sau này trong khu vực phụ huynh.
              </p>
            </div>

            <aside className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-white shadow-sm md:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                  <Target className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-white/50">Đang chọn</p>
                  <h2 className="text-xl font-black">{selectedStage.cefr}</h2>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-white/70">{selectedStage.titleVi}</p>
              <div className="mt-5 rounded-lg bg-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-white/50">Mục tiêu</p>
                <p className="mt-1 text-sm font-bold leading-6 text-white/85">{selectedStage.objectiveVi}</p>
              </div>
              <button
                type="button"
                onClick={saveLevel}
                disabled={saving || loading || Boolean(error && error.includes('đăng nhập'))}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                Lưu level và học hôm nay
              </button>
              {error && (
                <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-bold text-rose-100">{error}</p>
              )}
              {error.includes('đăng nhập') && (
                <Link href="/login" prefetch={false} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-3 text-sm font-black text-white">
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Đăng nhập
                </Link>
              )}
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-5">
          <div className="rounded-lg border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-black uppercase tracking-wide text-violet-700">Tuỳ chọn khác</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Nếu chưa chắc trình độ, có thể làm bài đầu vào để hệ thống tự xếp chặng cho bé
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                  Bài đầu vào sẽ dựa trên bộ câu hỏi phân cấp, rồi lưu kết quả để Engkids tự chọn chặng học phù hợp.
                </p>
              </div>
              <Link
                href="/learn/placement?next=/onboarding/level"
                prefetch={false}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5"
              >
                Làm bài đầu vào <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CURRICULUM_STAGES.map((stage) => {
              const selected = selectedStageId === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`flex min-h-[300px] flex-col rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 ${
                    selected ? 'border-violet-400 ring-2 ring-violet-100' : 'border-slate-200 hover:border-sky-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{stage.cefr}</span>
                    {selected && <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-violet-600" aria-hidden="true" />}
                  </div>
                  <h2 className="mt-4 text-xl font-black leading-6 text-slate-950">{stage.titleVi}</h2>
                  <p className="mt-2 text-sm font-bold text-slate-500">{stage.ageVi} · {stage.weeksVi}</p>
                  <p className="mt-3 line-clamp-4 text-sm font-semibold leading-6 text-slate-600">{stage.objectiveVi}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {stage.topics.slice(0, 4).map((topic) => (
                      <span key={topic} className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">{topic}</span>
                    ))}
                  </div>
                  <div className="mt-auto pt-4">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-black text-slate-500">
                      <Metric label="Từ" value={stage.targetWords} />
                      <Metric label="Truyện" value={stage.targetStories} />
                      <Metric label="Game" value={stage.targetGames} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg bg-slate-50 px-2 py-2 ring-1 ring-slate-100">
      <BookOpen className="mx-auto mb-1 h-4 w-4 text-violet-600" aria-hidden="true" />
      <span className="block text-slate-950">{value}</span>
      <span>{label}</span>
    </span>
  );
}


