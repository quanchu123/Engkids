'use client';

// MatchPairs — active vocabulary exercise (replaces the passive vocab card).
// The child taps an English tile, then its Vietnamese meaning. Correct pairs
// lock green; a wrong attempt shakes red and is remembered so the lesson score
// reflects first-try accuracy. Every pair feeds the SRS bridge (Stage 5).

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Volume2 } from 'lucide-react';
import { speakWord } from '@/services/dictionary';
import type { StepResult, WordOutcome } from '@/lib/lesson-scoring';

interface Item {
  en: string;
  vi: string;
  pos?: string;
  example?: string;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MAX_PAIRS = 6;

export default function MatchPairs({
  items,
  onComplete,
}: {
  items: Item[];
  onComplete: (r: Omit<StepResult, 'stepId' | 'stepType'>) => void;
}) {
  const pairs = useMemo(() => items.slice(0, MAX_PAIRS), [items]);
  const enTiles = useMemo(
    () => shuffle(pairs.map((p, i) => ({ key: i, label: p.en }))),
    [pairs],
  );
  const viTiles = useMemo(
    () => shuffle(pairs.map((p, i) => ({ key: i, label: p.vi }))),
    [pairs],
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<number | null>(null);
  const wrongOnceRef = useRef<Set<number>>(new Set());
  const reportedRef = useRef(false);

  // Report the honest score once every pair is matched.
  useEffect(() => {
    if (reportedRef.current || pairs.length === 0) return;
    if (matched.size !== pairs.length) return;
    reportedRef.current = true;
    const words: WordOutcome[] = pairs.map((p, i) => {
      const missed = wrongOnceRef.current.has(i);
      return {
        en: p.en,
        vi: p.vi,
        pos: p.pos,
        example: p.example,
        correct: !missed,
        attempts: missed ? 2 : 1,
      };
    });
    const correct = words.filter((w) => w.correct).length;
    onComplete({
      correct,
      total: pairs.length,
      scorePercent: Math.round((correct / pairs.length) * 100),
      words,
    });
  }, [matched, pairs, onComplete]);

  const tapEn = (key: number) => {
    if (matched.has(key)) return;
    setSelected(key);
    speakWord(pairs[key].en);
  };

  const tapVi = (viKey: number) => {
    if (matched.has(viKey) || selected === null) return;
    if (selected === viKey) {
      // Correct match.
      setMatched((prev) => new Set(prev).add(viKey));
      setSelected(null);
    } else {
      // Wrong — remember the miss for both the chosen EN and target pair.
      wrongOnceRef.current.add(selected);
      setWrongPair(viKey);
      window.setTimeout(() => setWrongPair(null), 350);
      setSelected(null);
    }
  };

  if (pairs.length === 0) {
    return <p className="text-sm font-bold text-slate-500">Chưa có từ cho phần này.</p>;
  }

  return (
    <div>
      <p className="mb-3 text-sm font-bold text-slate-500">Chạm từ tiếng Anh, rồi chạm nghĩa tiếng Việt đúng.</p>
      <div className="grid grid-cols-2 gap-3">
        {/* English column */}
        <div className="space-y-2">
          {enTiles.map(({ key, label }) => {
            const isMatched = matched.has(key);
            const isSelected = selected === key;
            return (
              <button
                key={`en-${key}`}
                type="button"
                onClick={() => tapEn(key)}
                disabled={isMatched}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left text-sm font-black ring-1 transition ${
                  isMatched
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : isSelected
                      ? 'bg-violet-600 text-white ring-violet-600'
                      : 'bg-white text-slate-800 ring-slate-200 hover:-translate-y-0.5'
                }`}
              >
                <span>{label}</span>
                {isMatched ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <Volume2 className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'opacity-90' : 'opacity-40'}`} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        {/* Vietnamese column */}
        <div className="space-y-2">
          {viTiles.map(({ key, label }) => {
            const isMatched = matched.has(key);
            const isWrong = wrongPair === key;
            return (
              <button
                key={`vi-${key}`}
                type="button"
                onClick={() => tapVi(key)}
                disabled={isMatched}
                className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left text-sm font-bold ring-1 transition ${
                  isMatched
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : isWrong
                      ? 'shake bg-rose-50 text-rose-700 ring-rose-300'
                      : 'bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5'
                }`}
              >
                <span>{label}</span>
                {isMatched && <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
