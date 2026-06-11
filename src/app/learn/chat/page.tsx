'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, Sparkles, Bot, RotateCcw } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getLearnerStageProgress } from '@/lib/curriculum';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const STARTERS = [
  'Hi! How are you today?',
  'What is your favorite animal?',
  'Tell me about your family.',
  "Let's talk about my school day.",
];

const GREETING: ChatTurn = {
  role: 'assistant',
  content: "Hi there! I'm Engkids Buddy. Let's chat in English! (Chào bé! Mình cùng nói tiếng Anh nhé!) What do you want to talk about today?",
};

export default function ChatPage() {
  const progress = useAppStore((state) => state.progress);
  const [level, setLevel] = useState('a2-key');
  const [turns, setTurns] = useState<ChatTurn[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve the child's CEFR stage: prefer DB learner state, fall back to local progress.
  useEffect(() => {
    let active = true;
    fetch('/api/curriculum', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.learnerState?.currentStageId) setLevel(data.learnerState.currentStageId);
        else if (active) setLevel(getLearnerStageProgress(progress).stage.id);
      })
      .catch(() => {
        if (active) setLevel(getLearnerStageProgress(progress).stage.id);
      });
    return () => {
      active = false;
    };
  }, [progress]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, sending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setError('');
    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: message }];
    setTurns(nextTurns);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          messages: nextTurns.filter((t) => t.role === 'user' || t.role === 'assistant').slice(-12),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.reply) {
        setError(data?.error || 'Trợ lý AI đang bận, bé thử lại nhé!');
      } else {
        setTurns((cur) => [...cur, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setError('Không kết nối được tới trợ lý AI. Bé kiểm tra mạng nhé!');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setTurns([GREETING]);
    setError('');
    setInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-violet-50 to-amber-50">
      <Header />
      <main className="mx-auto flex h-[calc(100vh-64px)] max-w-3xl flex-col px-4 pb-4 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/learn/today" className="inline-flex items-center gap-2 text-sm font-black text-violet-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Today Plan
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Trò chuyện mới
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white shadow-xl">
          {/* Header bar */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-4 py-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight">Engkids Buddy</p>
              <p className="flex items-center gap-1 text-[11px] font-bold text-white/85">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> Bạn nói tiếng Anh · {level.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.map((turn, i) => (
              <ChatBubble key={i} turn={turn} />
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Buddy đang trả lời...
              </div>
            )}
            {error && (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">{error}</div>
            )}
          </div>

          {/* Starters (only before the child has spoken) */}
          {turns.length === 1 && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-100 transition hover:bg-violet-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type in English... (Gõ tiếng Anh nhé)"
              maxLength={800}
              disabled={sending}
              className="min-h-[48px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-violet-300 focus:bg-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
              aria-label="Gửi"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function ChatBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-sm ${
          isUser
            ? 'bg-violet-600 text-white'
            : 'bg-slate-100 text-slate-800 ring-1 ring-slate-200'
        }`}
      >
        {turn.content}
      </div>
    </div>
  );
}
