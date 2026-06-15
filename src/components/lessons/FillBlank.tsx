'use client';

// FillBlank — active grammar/usage exercise (replaces the passive grammar box).
// One target word is blanked out of a sentence; the child taps a word chip to
// fill it. Correct fills lock green, wrong ones shake red and are remembered so
// the lesson score reflects first-try accuracy. Words feed the SRS bridge.

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Volume2 } from 'lucide-react';
import { speakWord } from '@/services/dictionary';
import { deriveBlank } from '@/lib/sentence-blank';
import { buildChoices } from '@/lib/lesson-scoring';
import type { StepResult, WordOutcome } from '@/lib/lesson-scoring';

interface BlankItem {
  before: string;
  after: string;
  answer: string;
  choices: string[];
}

const MAX_BLANKS = 5;

export default function FillBlank({
  sentences,
  targetWords,
  onComplete,
}: {
  sentences: string[];
  targetWords: string[];
  onComplete: (r: Omit<StepResult, 'stepId' | 'stepType'>) => void;
}) {
  // Build one blank per sentence that actually contains a target word. The pool
  // of distractors is the other target words. Capped so a kid isn't overwhelmed.
  const blanks = useMemo<BlankItem[]>(() => {
    const out: BlankItem[] = [];
    for (const sentence of sentences) {
      if (out.length >= MAX_BLANKS) break;
      const derived = deriveBlank(sentence, targetWords);
      if (!derived) continue;
      const pool = targetWords.filter(
        (w) => w.trim().toLowerCase() !== derived.answer,
      );
      out.push({
        before: derived.before,
        after: derived.after,
        answer: derived.answer,
        choices: buildChoices(derived.answer, pool, 4),
      });
    }
    return out;
  }, [sentences, targetWords]);

  const [picked, setPicked] = useState<Record<number, string>>({});
  const [wrong, setWrong] = useState<{ bi: number; choice: string } | null>(null);
  const wrongOnceRef = useRef<Set<number>>(new Set());
  const reportedRef = useRef(false);

  useEffect(() => {
    if (reportedRef.current || blanks.length === 0) return;
    if (Object.keys(picked).length !== blanks.length) return;
    reportedRef.current = true;
    const words: WordOutcome[] = blanks.map((b, i) => {
      const missed = wrongOnceRef.current.has(i);
      return { en: b.answer, vi: '', correct: !missed, attempts: missed ? 2 : 1 };
    });
    const correct = words.filter((w) => w.correct).length;
    onComplete({
      correct,
      total: blanks.length,
      scorePercent: Math.round((correct / blanks.length) * 100),
      words,
    });
  }, [picked, blanks, onComplete]);

  const choose = (bi: number, choice: string) => {
    if (picked[bi]) return; // lock after first correct/visible pick
    const isCorrect = choice.trim().toLowerCase() === blanks[bi].answer;
    if (isCorrect) {
      setPicked((p) => ({ ...p, [bi]: choice }));
      speakWord(blanks[bi].answer);
    } else {
      wrongOnceRef.current.add(bi);
      setWrong({ bi, choice });
      window.setTimeout(() => setWrong(null), 350);
    }
  };

  if (blanks.length === 0) {
    return <p className="text-sm font-bold text-slate-500">Chưa có câu phù hợp cho phần này.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm font-bold text-slate-500">Chọn từ đúng để điền vào chỗ trống.</p>
      {blanks.map((b, bi) => {
        const answered = picked[bi];
        return (
          <div key={bi} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold leading-7 text-slate-800">
              {b.before}{' '}
              <span
                className={`mx-1 inline-flex min-w-[70px] items-center justify-center rounded-lg px-2 py-0.5 align-middle text-sm font-black ring-1 ${
                  answered
                    ? 'bg-emerald-100 text-emerald-800 ring-emerald-200'
                    : 'bg-white text-slate-400 ring-dashed ring-slate-300'
                }`}
              >
                {answered ? answered : '   '}
              </span>{' '}
              {b.after}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {b.choices.map((choice) => {
                const isAnswer = choice.trim().toLowerCase() === b.answer;
                const isWrong = wrong?.bi === bi && wrong?.choice === choice;
                let cls = 'bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5';
                if (answered && isAnswer) cls = 'bg-emerald-50 text-emerald-800 ring-emerald-200';
                else if (answered) cls = 'bg-white text-slate-300 ring-slate-100';
                else if (isWrong) cls = 'shake bg-rose-50 text-rose-700 ring-rose-300';
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => choose(bi, choice)}
                    disabled={Boolean(answered)}
                    className={`rounded-2xl px-3 py-2 text-sm font-bold ring-1 transition ${cls}`}
                  >
                    {choice}
                    {answered && isAnswer && <CheckCircle2 className="ml-1 inline h-4 w-4" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {answered && (
              <button
                type="button"
                onClick={() => speakWord(`${b.before} ${b.answer} ${b.after}`.trim())}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-emerald-700"
              >
                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Nghe cả câu
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
