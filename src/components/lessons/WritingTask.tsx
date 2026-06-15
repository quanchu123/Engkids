'use client';

// WritingTask — active writing exercise (replaces the OutputStep writing stub
// whose textarea was ignored). The child writes, taps "Kiểm tra", and the text
// is graded by /api/writing. Inline feedback shows a score, praise, per-phrase
// corrections, a model rewrite, and a tip. The child can revise and resubmit;
// the latest result is kept. On AI failure the child can still continue (the
// step never becomes a dead end). The score feeds the lesson score + SRS bridge.

import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { speakWord } from '@/services/dictionary';
import type { StepResult, WordOutcome } from '@/lib/lesson-scoring';

interface Correction {
  original: string;
  fixed: string;
  why: string;
}
interface Feedback {
  score: number | null;
  praise: string;
  corrections: Correction[];
  improved: string;
  tip: string;
  raw?: boolean;
}

const MAX_CHARS = 1500;
const PASS_SCORE = 60;

export default function WritingTask({
  prompt,
  level,
  requiredWords,
  onComplete,
}: {
  prompt: string;
  level: string;
  requiredWords: string[];
  onComplete: (r: Omit<StepResult, 'stepId' | 'stepType'>) => void;
}) {
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reportedRef = useRef(false);

  const report = (score: number | null) => {
    // A null score (raw AI fallback) still counts as completed at a neutral
    // pass so the child isn't punished for the model returning prose.
    const pct = typeof score === 'number' ? score : 100;
    const correct = typeof score === 'number' ? (score >= PASS_SCORE ? 1 : 0) : 1;
    const words: WordOutcome[] = [
      { en: prompt.slice(0, 60), vi: '', correct: correct === 1, attempts: 1 },
    ];
    onComplete({ correct, total: 1, scorePercent: pct, words });
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 3) {
      setError('Bé viết một câu tiếng Anh trước nhé!');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/writing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, prompt, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Trợ lý AI đang bận, bé thử lại nhé!');
        return;
      }
      const fb: Feedback = {
        score: typeof data.score === 'number' ? data.score : null,
        praise: String(data.praise || ''),
        corrections: Array.isArray(data.corrections) ? data.corrections : [],
        improved: String(data.improved || ''),
        tip: String(data.tip || ''),
        raw: Boolean(data.raw),
      };
      setFeedback(fb);
      // The result only reports up once. Re-submitting refreshes the visible
      // feedback but the lesson score keeps the first graded result.
      if (!reportedRef.current) {
        reportedRef.current = true;
        report(fb.score);
      }
    } catch {
      setError('Không kết nối được trợ lý AI. Bé kiểm tra mạng nhé!');
    } finally {
      setLoading(false);
    }
  };

  // Escape hatch: AI unreachable but the child wrote something — let them
  // continue with completion credit so the lesson is never blocked.
  const continueAnyway = () => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    report(null);
    setFeedback({ score: null, praise: '', corrections: [], improved: '', tip: 'Đã lưu bài viết của bé.', raw: true });
  };

  const score = feedback?.score ?? null;

  return (
    <div className="space-y-4">
      {prompt && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-800 ring-1 ring-rose-100">
          {prompt}
        </div>
      )}

      {requiredWords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {requiredWords.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => speakWord(w)}
              className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100"
            >
              {w}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
        rows={4}
        placeholder="Viết câu trả lời của bé bằng tiếng Anh..."
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-rose-300 focus:bg-white"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-400">{text.length}/{MAX_CHARS}</span>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Đang chấm...</>
          ) : feedback ? (
            <>Chấm lại <ArrowRight className="h-4 w-4" aria-hidden="true" /></>
          ) : (
            <>Kiểm tra <Sparkles className="h-4 w-4" aria-hidden="true" /></>
          )}
        </button>
      </div>

      {error && (
        <div className="space-y-2">
          <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">{error}</p>
          <button
            type="button"
            onClick={continueAnyway}
            className="text-xs font-black text-slate-500 underline"
          >
            Bỏ qua và tiếp tục
          </button>
        </div>
      )}

      {feedback && (
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {typeof score === 'number' && (
            <div className="flex items-center gap-3">
              <span
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-black text-white ${
                  score >= 80 ? 'bg-emerald-500' : score >= PASS_SCORE ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              >
                {score}
              </span>
              {feedback.praise && <p className="text-sm font-bold leading-6 text-slate-700">{feedback.praise}</p>}
            </div>
          )}

          {feedback.corrections.length > 0 && (
            <div className="space-y-2">
              {feedback.corrections.map((c, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <p className="text-sm">
                    <span className="font-bold text-rose-600 line-through">{c.original}</span>
                    <ArrowRight className="mx-1.5 inline h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span className="font-black text-emerald-700">{c.fixed}</span>
                  </p>
                  {c.why && <p className="mt-1 text-xs font-semibold text-slate-500">{c.why}</p>}
                </div>
              ))}
            </div>
          )}

          {feedback.improved && (
            <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Bản viết hay hơn
              </p>
              <p className="text-sm font-semibold leading-6 text-slate-700">{feedback.improved}</p>
            </div>
          )}

          {feedback.tip && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-800 ring-1 ring-amber-100">
              {feedback.tip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
