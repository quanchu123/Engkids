'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles, PenLine, CheckCircle2, Lightbulb, RotateCcw } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getLearnerStageProgress } from '@/lib/curriculum';

interface Correction {
  original: string;
  fixed: string;
  why: string;
}

interface WritingFeedback {
  score: number | null;
  praise: string;
  corrections: Correction[];
  improved: string;
  tip: string;
  raw?: boolean;
}

// Per-stage prompt bank, kept short and kid-friendly. Falls back to a2-key.
const PROMPTS_BY_STAGE: Record<string, string[]> = {
  'a2-key': [
    'Write 2-3 sentences about your family.',
    'What did you do yesterday? Write a few sentences.',
    'Describe your favorite animal.',
    'Write about your favorite food and why you like it.',
  ],
  'b1-preliminary': [
    'Write a short paragraph about your best friend.',
    'Describe your dream weekend. What would you do?',
    'Write about a hobby you enjoy and why.',
    'Tell a short story about a fun day at school.',
  ],
  'b2-first': [
    'Do you prefer books or films? Give reasons.',
    'Write about a problem in your town and a possible solution.',
    'Describe a person you admire and explain why.',
    'Should children use phones at school? Give your opinion.',
  ],
  'c1-advanced': [
    'Discuss the advantages and disadvantages of online learning.',
    'Write about how technology has changed the way we communicate.',
    'Describe a goal you have and your plan to achieve it.',
    'Is it better to live in a city or the countryside? Argue your view.',
  ],
};

export default function WritePage() {
  const progress = useAppStore((state) => state.progress);
  const [level, setLevel] = useState('a2-key');
  const [prompt, setPrompt] = useState(PROMPTS_BY_STAGE['a2-key'][0]);
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/curriculum', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const stage = data?.learnerState?.currentStageId || getLearnerStageProgress(progress).stage.id;
        if (!active) return;
        setLevel(stage);
        const list = PROMPTS_BY_STAGE[stage] || PROMPTS_BY_STAGE['a2-key'];
        setPrompt(list[0]);
      })
      .catch(() => {
        if (active) {
          const stage = getLearnerStageProgress(progress).stage.id;
          setLevel(stage);
          setPrompt((PROMPTS_BY_STAGE[stage] || PROMPTS_BY_STAGE['a2-key'])[0]);
        }
      });
    return () => {
      active = false;
    };
  }, [progress]);

  const prompts = PROMPTS_BY_STAGE[level] || PROMPTS_BY_STAGE['a2-key'];

  const submit = async () => {
    const body = text.trim();
    if (body.length < 3 || loading) return;
    setLoading(true);
    setError('');
    setFeedback(null);
    try {
      const res = await fetch('/api/writing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, prompt, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Trợ lý AI đang bận, bé thử lại nhé!');
      } else {
        setFeedback(data);
      }
    } catch {
      setError('Không kết nối được tới trợ lý AI. Bé kiểm tra mạng nhé!');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setText('');
    setFeedback(null);
    setError('');
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/learn/today" className="inline-flex items-center gap-2 text-sm font-black text-violet-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Today Plan
          </Link>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-200">
            {level.toUpperCase()}
          </span>
        </div>

        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-5 text-white shadow-xl md:p-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black uppercase backdrop-blur-sm">
            <PenLine className="h-4 w-4" aria-hidden="true" /> Luyện viết
          </span>
          <h1 className="mt-3 text-2xl font-black md:text-3xl">Viết tiếng Anh & nhận góp ý</h1>
          <p className="mt-1 text-sm font-bold text-white/90">Viết theo đề rồi gửi cho trợ lý AI chấm và sửa lỗi nhẹ nhàng.</p>
        </div>

        {/* Prompt picker */}
        <section className="mt-5">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-violet-500">Chọn đề</p>
          <div className="flex flex-wrap gap-2">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrompt(p)}
                className={`rounded-2xl px-3 py-2 text-xs font-black ring-1 transition ${
                  prompt === p
                    ? 'bg-violet-600 text-white ring-violet-600'
                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </section>

        {/* Composer */}
        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-black text-slate-900">{prompt}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your answer in English here... (Viết câu trả lời bằng tiếng Anh)"
            maxLength={1500}
            rows={6}
            className="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-900 outline-none focus:border-violet-300 focus:bg-white"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-400">{wordCount} từ</span>
            <div className="flex items-center gap-2">
              {(feedback || text) && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Viết lại
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={loading || text.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {loading ? 'Đang chấm...' : 'Gửi bài'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">{error}</div>
          )}
        </section>

        {feedback && <FeedbackPanel feedback={feedback} />}
      </main>
    </div>
  );
}

function FeedbackPanel({ feedback }: { feedback: WritingFeedback }) {
  return (
    <section className="mt-5 space-y-4">
      {/* Score + praise */}
      <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {feedback.score !== null && (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-black text-emerald-700 ring-1 ring-emerald-100">
            {feedback.score}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Nhận xét</p>
          <p className="mt-1 text-sm font-bold leading-relaxed text-slate-700">
            {feedback.praise || 'Bé đã hoàn thành bài viết. Cùng xem góp ý nhé!'}
          </p>
        </div>
      </div>

      {/* Corrections */}
      {feedback.corrections.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-violet-500">Chỗ cần sửa</p>
          <div className="space-y-3">
            {feedback.corrections.map((c, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  <span className="rounded-lg bg-rose-50 px-2 py-1 text-rose-600 line-through decoration-rose-300">{c.original}</span>
                  <span className="text-slate-400">→</span>
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">{c.fixed}</span>
                </div>
                {c.why && <p className="mt-2 text-xs font-semibold text-slate-500">{c.why}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improved version */}
      {feedback.improved && (
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-sky-600">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Bản viết hay hơn
          </p>
          <p className="text-sm font-semibold leading-relaxed text-slate-800">{feedback.improved}</p>
        </div>
      )}

      {/* Tip */}
      {feedback.tip && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-600">Mẹo lần sau</p>
            <p className="mt-1 text-sm font-bold leading-relaxed text-slate-700">{feedback.tip}</p>
          </div>
        </div>
      )}
    </section>
  );
}
