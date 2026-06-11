'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, RotateCcw, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import {
  buildMistakeQueue,
  buildChoices,
  summarizeMistakes,
  MISTAKE_KIND_LABELS,
} from '@/lib/mistakes';
import type { MistakeItem } from '@/types';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MistakesPage() {
  const mistakes = useAppStore((state) => state.progress.mistakes);
  const reviewMistake = useAppStore((state) => state.reviewMistake);
  const clearResolvedMistakes = useAppStore((state) => state.clearResolvedMistakes);

  const summary = useMemo(() => summarizeMistakes(mistakes), [mistakes]);
  // Snapshot the queue once per "session" so resolving a card doesn't reshuffle
  // mid-review; the user can press "Ôn lại" to rebuild from the current state.
  const [sessionKey, setSessionKey] = useState(0);
  const queue = useMemo(
    () => buildMistakeQueue(mistakes, 20),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey],
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const card = queue[index];
  const choices = useMemo(() => {
    if (!card) return [];
    return shuffle(buildChoices(card, mistakes.filter((m) => m.id !== card.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  const onPick = (choice: string) => {
    if (picked || !card) return;
    setPicked(choice);
    const correct = choice.trim().toLowerCase() === (card.correctAnswer || '').trim().toLowerCase();
    reviewMistake(card.id, correct);
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  const restart = () => {
    setSessionKey((k) => k + 1);
    setIndex(0);
    setPicked(null);
    setStats({ correct: 0, wrong: 0 });
  };

  const finished = !card;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-amber-50 to-sky-50">
      <Header />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/learn/today" className="inline-flex items-center gap-2 text-sm font-black text-violet-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Today Plan
          </Link>
          {summary.resolved > 0 && (
            <button
              type="button"
              onClick={clearResolvedMistakes}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm ring-1 ring-slate-200"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Xóa lỗi đã sửa ({summary.resolved})
            </button>
          )}
        </div>

        {/* Hero / summary */}
        <div
          className="mb-5 overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 p-6 text-white shadow-xl"
          style={{ boxShadow: '0 8px 0 rgba(0,0,0,0.12), 0 18px 40px rgba(244,63,94,0.35)' }}
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black uppercase backdrop-blur-sm">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Sổ tay lỗi sai
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight drop-shadow md:text-4xl">Ôn lại lỗi đã mắc</h1>
          <p className="mt-2 text-sm font-bold text-white/90">
            {summary.unresolved > 0
              ? `Bé còn ${summary.unresolved} lỗi cần ôn. Trả lời đúng để xoá khỏi sổ tay nhé!`
              : 'Tuyệt vời! Bé đã sửa hết các lỗi đã mắc.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(summary.byKind) as Array<keyof typeof summary.byKind>)
              .filter((k) => summary.byKind[k] > 0)
              .map((k) => (
                <span key={k} className="rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur-sm">
                  {MISTAKE_KIND_LABELS[k]}: {summary.byKind[k]}
                </span>
              ))}
          </div>
        </div>

        {/* Empty state */}
        {summary.total === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-black text-slate-900">Chưa có lỗi nào</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Khi bé làm bài kiểm tra và trả lời sai, các câu đó sẽ tự động xuất hiện ở đây để ôn lại.
            </p>
            <Link
              href="/learn/checkpoint"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm"
            >
              Làm checkpoint <Sparkles className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Finished session */}
        {summary.total > 0 && finished && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <Sparkles className="h-9 w-9" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-xl font-black text-slate-900">Xong buổi ôn!</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              Đúng {stats.correct} · Sai {stats.wrong}.{' '}
              {summary.unresolved > 0 ? `Còn ${summary.unresolved} lỗi chưa sửa xong.` : 'Bé đã sửa hết lỗi!'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {summary.unresolved > 0 && (
                <button
                  type="button"
                  onClick={restart}
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-sm"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Ôn lại
                </button>
              )}
              <Link
                href="/learn/today"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-violet-700 shadow-sm ring-1 ring-violet-100"
              >
                Về Today Plan
              </Link>
            </div>
          </div>
        )}

        {/* Active review card */}
        {card && (
          <ReviewCard
            card={card}
            choices={choices}
            picked={picked}
            index={index}
            total={queue.length}
            onPick={onPick}
            onNext={next}
          />
        )}
      </main>
    </div>
  );
}

function ReviewCard({
  card,
  choices,
  picked,
  index,
  total,
  onPick,
  onNext,
}: {
  card: MistakeItem;
  choices: string[];
  picked: string | null;
  index: number;
  total: number;
  onPick: (choice: string) => void;
  onNext: () => void;
}) {
  const correctKey = (card.correctAnswer || '').trim().toLowerCase();
  const pickedCorrect = picked != null && picked.trim().toLowerCase() === correctKey;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl md:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
          {index + 1}/{total}
        </span>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-600 ring-1 ring-rose-100">
          {MISTAKE_KIND_LABELS[card.kind] ?? 'Khác'}
        </span>
      </div>

      <p className="mt-4 text-sm font-bold text-slate-500">{card.promptVi || 'Chọn đáp án đúng'}</p>
      {card.questionEn && (
        <p className="mt-1 text-lg font-black leading-snug text-slate-900">{card.questionEn}</p>
      )}

      <div className="mt-4 grid gap-2.5">
        {choices.map((choice) => {
          const isCorrect = choice.trim().toLowerCase() === correctKey;
          const isPicked = picked === choice;
          let cls = 'border-slate-200 bg-white text-slate-800 hover:border-violet-300';
          if (picked) {
            if (isCorrect) cls = 'border-emerald-300 bg-emerald-50 text-emerald-800';
            else if (isPicked) cls = 'border-rose-300 bg-rose-50 text-rose-800';
            else cls = 'border-slate-200 bg-white text-slate-400';
          }
          return (
            <button
              key={choice}
              type="button"
              disabled={Boolean(picked)}
              onClick={() => onPick(choice)}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${cls}`}
            >
              <span>{choice}</span>
              {picked && isCorrect && <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
              {picked && isPicked && !isCorrect && <X className="h-5 w-5 text-rose-600" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-4">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              pickedCorrect ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
            }`}
          >
            {pickedCorrect ? (
              <>Chính xác! Lỗi này đã được sửa xong.</>
            ) : (
              <>
                Chưa đúng. Đáp án đúng là <span className="font-black">{card.correctAnswer}</span>. Bé sẽ gặp lại câu này
                để ôn thêm.
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm"
          >
            Câu tiếp theo
          </button>
        </div>
      )}
    </div>
  );
}
