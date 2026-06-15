'use client';

// ListenAndSelect — active listening exercise (replaces passive warmup/listening).
// TTS speaks an English word (no text shown); the child taps the matching word
// from 4 choices. Correct flashes green, wrong shakes red and reveals the answer.
// First-try accuracy drives the score and the SRS bridge.

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Volume2 } from 'lucide-react';
import { speakWord } from '@/services/dictionary';
import { buildChoices } from '@/lib/lesson-scoring';
import type { StepResult, WordOutcome } from '@/lib/lesson-scoring';

interface Item {
  en: string;
  vi: string;
  pos?: string;
  example?: string;
}

const MAX_QUESTIONS = 6;

export default function ListenAndSelect({
  items,
  onComplete,
}: {
  items: Item[];
  onComplete: (r: Omit<StepResult, 'stepId' | 'stepType'>) => void;
}) {
  const questions = useMemo(() => items.slice(0, MAX_QUESTIONS), [items]);
  const pool = useMemo(() => items.map((it) => it.en), [items]);
  const choicesByQ = useMemo(
    () => questions.map((q) => buildChoices(q.en, pool, 4)),
    [questions, pool],
  );

  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const outcomesRef = useRef<WordOutcome[]>([]);
  const attemptsRef = useRef(0);
  const reportedRef = useRef(false);

  const current = questions[qi];

  // Auto-play the target word when the question appears.
  useEffect(() => {
    if (current) speakWord(current.en);
  }, [current]);

  const finishIfDone = (outcomes: WordOutcome[]) => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    const correct = outcomes.filter((o) => o.correct).length;
    onComplete({
      correct,
      total: outcomes.length,
      scorePercent: outcomes.length ? Math.round((correct / outcomes.length) * 100) : 100,
      words: outcomes,
    });
  };

  const choose = (choice: string) => {
    if (picked) return;
    setPicked(choice);
    attemptsRef.current += 1;
    const isCorrect = choice === current.en;
    if (isCorrect) {
      outcomesRef.current.push({
        en: current.en,
        vi: current.vi,
        pos: current.pos,
        example: current.example,
        correct: attemptsRef.current <= 1,
        attempts: attemptsRef.current,
      });
      window.setTimeout(() => {
        if (qi < questions.length - 1) {
          setQi((i) => i + 1);
          setPicked(null);
          attemptsRef.current = 0;
        } else {
          finishIfDone(outcomesRef.current);
        }
      }, 700);
    } else {
      // Let the child try again after a short shake; reveal nothing yet.
      window.setTimeout(() => setPicked(null), 600);
    }
  };

  if (questions.length === 0) {
    return <p className="text-sm font-bold text-slate-500">Chưa có từ cho phần này.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => speakWord(current.en)}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg transition hover:scale-105 active:scale-95"
          style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.12)' }}
          aria-label="Nghe lại"
        >
          <Volume2 className="h-9 w-9" aria-hidden="true" />
        </button>
        <p className="text-sm font-bold text-slate-500">Nghe rồi chọn từ đúng · {qi + 1}/{questions.length}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {choicesByQ[qi].map((choice) => {
          const isPicked = picked === choice;
          const isCorrect = choice === current.en;
          const show = Boolean(picked);
          let cls = 'bg-white text-slate-800 ring-slate-200 hover:-translate-y-0.5';
          if (show && isCorrect) cls = 'bg-emerald-50 text-emerald-700 ring-emerald-300';
          else if (show && isPicked && !isCorrect) cls = 'shake bg-rose-50 text-rose-700 ring-rose-300';
          return (
            <button
              key={choice}
              type="button"
              onClick={() => choose(choice)}
              disabled={show}
              className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-4 text-left text-sm font-black ring-1 transition ${cls}`}
            >
              <span>{choice}</span>
              {show && isCorrect && <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
