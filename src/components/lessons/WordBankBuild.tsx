'use client';

// WordBankBuild — active reading/grammar exercise (replaces passive reading
// practice). A short sentence's words are shuffled into tiles; the child taps
// them into order to rebuild the sentence. Checked with checkWordOrder (pure).
// First-try success = full credit; using "Xoá" to retry counts as a miss.

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';
import { speakWord } from '@/services/dictionary';
import { checkWordOrder } from '@/lib/lesson-scoring';
import type { StepResult, WordOutcome } from '@/lib/lesson-scoring';

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Pick the first short, well-formed sentence (3..8 words) so the build is doable
// for a child. Returns the answer token list, or null if none qualifies.
function pickSentence(sentences: string[]): string[] | null {
  for (const s of sentences) {
    const tokens = s.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    if (tokens.length >= 3 && tokens.length <= 8) return tokens;
  }
  return null;
}

export default function WordBankBuild({
  sentences,
  tokens,
  onComplete,
}: {
  sentences: string[];
  // Optional precomputed token list from the generator (payload.build). When
  // present and valid we use it directly; otherwise we derive from sentences.
  tokens?: string[];
  onComplete: (r: Omit<StepResult, 'stepId' | 'stepType'>) => void;
}) {
  const answer = useMemo(
    () => (tokens && tokens.length >= 3 && tokens.length <= 8 ? tokens : pickSentence(sentences)),
    [tokens, sentences],
  );
  const bank = useMemo(
    () => (answer ? shuffle(answer.map((w, i) => ({ key: i, label: w }))) : []),
    [answer],
  );

  const [order, setOrder] = useState<number[]>([]);
  const [status, setStatus] = useState<'building' | 'correct' | 'wrong'>('building');
  const missedRef = useRef(false);
  const reportedRef = useRef(false);

  const placed = new Set(order);
  const sentence = answer ? answer.join(' ') : '';

  const report = (correct: boolean) => {
    if (reportedRef.current || !answer) return;
    reportedRef.current = true;
    const words: WordOutcome[] = [
      { en: sentence, vi: '', correct, attempts: correct && !missedRef.current ? 1 : 2 },
    ];
    onComplete({
      correct: correct ? 1 : 0,
      total: 1,
      scorePercent: correct ? 100 : 0,
      words,
    });
  };

  // Auto-check once every tile is placed.
  useEffect(() => {
    if (!answer || order.length !== answer.length) return;
    const built = order.map((k) => answer[k]);
    if (checkWordOrder(built, answer)) {
      setStatus('correct');
      speakWord(sentence);
      report(true);
    } else {
      setStatus('wrong');
      missedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, answer]);

  if (!answer) {
    return <p className="text-sm font-bold text-slate-500">Chưa có câu phù hợp cho phần này.</p>;
  }

  const tap = (key: number) => {
    if (status === 'correct' || placed.has(key)) return;
    setOrder((o) => [...o, key]);
  };
  const reset = () => {
    if (status === 'correct') return;
    setOrder([]);
    setStatus('building');
  };

  return (
    <div>
      <p className="mb-3 text-sm font-bold text-slate-500">Chạm các từ để xếp thành câu đúng.</p>

      {/* Build area */}
      <div
        className={`min-h-[56px] rounded-2xl border-2 border-dashed p-3 transition ${
          status === 'correct'
            ? 'border-emerald-300 bg-emerald-50'
            : status === 'wrong'
              ? 'shake border-rose-300 bg-rose-50'
              : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {order.map((k, idx) => (
            <span
              key={`placed-${idx}`}
              className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-slate-800 ring-1 ring-slate-200"
            >
              {answer[k]}
            </span>
          ))}
          {order.length === 0 && <span className="text-sm font-bold text-slate-400">...</span>}
        </div>
      </div>

      {/* Word bank */}
      <div className="mt-3 flex flex-wrap gap-2">
        {bank.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => tap(key)}
            disabled={placed.has(key) || status === 'correct'}
            className={`rounded-2xl px-3 py-2 text-sm font-bold ring-1 transition ${
              placed.has(key)
                ? 'bg-slate-100 text-slate-300 ring-slate-100'
                : 'bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Controls / feedback */}
      <div className="mt-3 flex items-center gap-3">
        {status === 'correct' ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Chính xác!
            <button
              type="button"
              onClick={() => speakWord(sentence)}
              className="ml-1 inline-flex items-center gap-1 text-emerald-700"
            >
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Nghe
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={reset}
            disabled={order.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Xoá làm lại
          </button>
        )}
      </div>
    </div>
  );
}
