'use client';

// SpeakingRepeat — active speaking exercise (replaces the OutputStep speaking
// stub). The child hears a model word (TTS), taps the mic, and repeats it. The
// transcript is scored against the target with the pure Levenshtein scorer; a
// word counts as correct when it clears PASS_THRESHOLD. Per-word outcomes feed
// the lesson score and the SRS bridge. Browsers without speech recognition show
// a friendly note and the step still completes (so it's never a dead end).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mic, RotateCcw, Volume2 } from 'lucide-react';
import { speakWord } from '@/services/dictionary';
import { scorePronunciation, PASS_THRESHOLD } from '@/lib/pronunciation';
import {
  isSpeechRecognitionSupported,
  listenOnce,
  SpeechRecognitionError,
} from '@/services/speech-recognition';
import type { StepResult, WordOutcome } from '@/lib/lesson-scoring';

const MAX_WORDS = 6;

type Phase = 'idle' | 'listening' | 'scoring' | 'done';

interface WordState {
  word: string;
  score: number | null; // null = not attempted yet
  attempts: number;
}

function messageForError(err: unknown): string {
  if (err instanceof SpeechRecognitionError) {
    switch (err.code) {
      case 'not-allowed':
        return 'Bé cần cho phép dùng micro nhé.';
      case 'no-speech':
        return 'Mình chưa nghe rõ. Bé nói lại nhé!';
      case 'timeout':
        return 'Hết giờ rồi! Bấm micro và nói lại nhé.';
      default:
        return 'Có chút trục trặc. Bé thử lại nhé!';
    }
  }
  return 'Có chút trục trặc. Bé thử lại nhé!';
}

export default function SpeakingRepeat({
  prompt,
  words,
  onComplete,
}: {
  prompt: string;
  words: string[];
  onComplete: (r: Omit<StepResult, 'stepId' | 'stepType'>) => void;
}) {
  const targets = useMemo(
    () => words.map((w) => w.trim()).filter(Boolean).slice(0, MAX_WORDS),
    [words],
  );

  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [states, setStates] = useState<WordState[]>(
    () => targets.map((w) => ({ word: w, score: null, attempts: 0 })),
  );

  const mountedRef = useRef(true);
  const reportedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setSupported(isSpeechRecognitionSupported());
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const report = useCallback(
    (final: WordState[]) => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      const outcomes: WordOutcome[] = final.map((s) => ({
        en: s.word,
        vi: '',
        correct: (s.score ?? 0) >= PASS_THRESHOLD,
        attempts: Math.max(1, s.attempts),
      }));
      const correct = outcomes.filter((o) => o.correct).length;
      const avg = final.length
        ? Math.round(final.reduce((sum, s) => sum + (s.score ?? 0), 0) / final.length)
        : 100;
      onComplete({ correct, total: final.length, scorePercent: avg, words: outcomes });
    },
    [onComplete],
  );

  // Unsupported browsers: let the child still finish the lesson. Report a
  // neutral pass once (words enter SRS at passive quality via the page).
  useEffect(() => {
    if (!supported && !reportedRef.current && targets.length > 0) {
      onComplete({
        correct: 0,
        total: 0,
        scorePercent: 100,
        words: targets.map((w) => ({ en: w, vi: '', correct: true, passive: true })),
      });
      reportedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const current = states[active];

  const handleSpeak = async () => {
    if (phase === 'listening' || phase === 'scoring' || !current) return;
    setError('');
    setPhase('listening');
    try {
      const { transcript } = await listenOnce({ lang: 'en-US' });
      if (!mountedRef.current) return;
      setPhase('scoring');
      const { score } = scorePronunciation(current.word, transcript);
      if (!mountedRef.current) return;

      const next = states.map((s, i) =>
        i === active ? { ...s, score, attempts: s.attempts + 1 } : s,
      );
      setStates(next);
      setPhase('done');
    } catch (err) {
      if (!mountedRef.current) return;
      setError(messageForError(err));
      setPhase('idle');
    }
  };

  const goNext = () => {
    if (active < states.length - 1) {
      setActive((i) => i + 1);
      setPhase('idle');
      setError('');
    } else {
      report(states);
    }
  };

  const retry = () => {
    setPhase('idle');
    setError('');
  };

  // Escape hatch: the browser may report speech support yet the mic is blocked,
  // missing, or the child simply doesn't want to speak. Let them finish with a
  // neutral pass (words still enter SRS at passive quality) so the step is never
  // a dead end. Reports the words attempted so far plus the rest as passive.
  const skip = () => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    const outcomes: WordOutcome[] = states.map((s) =>
      s.score === null
        ? { en: s.word, vi: '', correct: true, passive: true }
        : { en: s.word, vi: '', correct: s.score >= PASS_THRESHOLD, attempts: Math.max(1, s.attempts) },
    );
    const scored = states.filter((s) => s.score !== null);
    const correct = outcomes.filter((o) => !o.passive && o.correct).length;
    onComplete({
      correct,
      total: scored.length,
      scorePercent: scored.length
        ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
        : 100,
      words: outcomes,
    });
  };

  if (targets.length === 0) {
    return <p className="text-sm font-bold text-slate-500">Chưa có từ cho phần này.</p>;
  }

  const allDone = states.every((s) => s.score !== null);
  const passed = (current?.score ?? 0) >= PASS_THRESHOLD;

  return (
    <div className="space-y-4">
      {prompt && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
          {prompt}
        </div>
      )}

      {!supported ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-100">
          Trình duyệt này chưa hỗ trợ luyện nói. Bé hãy dùng Chrome hoặc Edge nhé. Bé vẫn có thể bấm loa để nghe mẫu.
        </p>
      ) : null}

      {/* Word progress dots */}
      <div className="flex items-center justify-center gap-2">
        {states.map((s, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === active
                ? 'bg-rose-500 scale-125'
                : s.score === null
                  ? 'bg-slate-200'
                  : s.score >= PASS_THRESHOLD
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Current word */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-100 bg-white p-5">
        <div className="text-center">
          <p className="text-3xl font-black text-slate-900">{current.word}</p>
          <button
            type="button"
            onClick={() => speakWord(current.word)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 ring-1 ring-rose-100"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Nghe mẫu
          </button>
        </div>

        {supported && phase !== 'done' && (
          <button
            type="button"
            onClick={handleSpeak}
            disabled={phase === 'listening' || phase === 'scoring'}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition disabled:opacity-90 ${
              phase === 'listening' ? 'animate-pulse bg-rose-500 ring-4 ring-rose-200' : 'bg-rose-600 hover:-translate-y-0.5'
            }`}
            style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.12)' }}
            aria-label="Nói thử"
          >
            {phase === 'scoring' ? (
              <Loader2 className="h-9 w-9 animate-spin" aria-hidden="true" />
            ) : (
              <Mic className="h-9 w-9" aria-hidden="true" />
            )}
          </button>
        )}

        <p className="min-h-[1.25rem] text-sm font-bold text-slate-600">
          {phase === 'listening' && 'Đang nghe... nói nào!'}
          {phase === 'scoring' && 'Đang chấm điểm...'}
          {phase === 'idle' && supported && 'Bấm micro rồi nói'}
        </p>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-bold text-rose-600 ring-1 ring-rose-100">
            {error}
          </p>
        )}

        {/* Always-available escape hatch: mic blocked/missing, or the child
            doesn't want to speak. The step must never trap the learner. */}
        {phase !== 'done' && (
          <button
            type="button"
            onClick={skip}
            className="text-xs font-black text-slate-400 underline"
          >
            Bỏ qua phần nói
          </button>
        )}

        {/* Result for the current word */}
        {phase === 'done' && current.score !== null && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((n) => {
                const lit = current.score! >= PASS_THRESHOLD ? 3 : current.score! >= 50 ? 2 : 1;
                return (
                  <CheckCircle2
                    key={n}
                    className={`h-5 w-5 ${n <= lit ? 'text-amber-400' : 'text-slate-200'}`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            <p className="text-3xl font-black text-rose-600">{current.score}<span className="text-sm text-slate-400"> / 100</span></p>
            <p className={`text-sm font-black ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
              {passed ? 'Tuyệt vời!' : 'Gần đúng rồi, có thể thử lại nhé!'}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {!passed && (
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Thử lại
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-black text-white"
              >
                {active < states.length - 1 ? 'Từ tiếp theo' : 'Xong'}
              </button>
            </div>
          </div>
        )}
      </div>

      {allDone && reportedRef.current && (
        <p className="text-center text-sm font-black text-emerald-600">Hoàn thành phần luyện nói!</p>
      )}
    </div>
  );
}
