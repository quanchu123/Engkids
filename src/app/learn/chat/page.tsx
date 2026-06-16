'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Loader2, Sparkles, Bot, RotateCcw, User } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-emerald-50 to-cyan-50">
      <Header />
      <main className="mx-auto flex h-[calc(100vh-64px)] max-w-3xl flex-col px-4 pb-4 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/roadmap" className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Bản đồ
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Trò chuyện mới
          </button>
        </div>

        <div className="toy-panel flex flex-1 flex-col overflow-hidden">
          {/* Header bar */}
          <div className="relative flex items-center gap-3 border-b border-white/40 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-500 px-4 py-3 text-white">
            <span className="deco-float flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 shadow-inner">
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
          <div ref={scrollRef} className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <AnimatePresence initial={false}>
              {turns.map((turn, i) => (
                <ChatBubble key={i} turn={turn} />
              ))}
            </AnimatePresence>
            {sending && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 pl-11 text-sm font-bold text-emerald-500"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Buddy đang trả lời...
              </motion.div>
            )}
            {error && (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">{error}</div>
            )}
          </div>

          {/* Starters (only before the child has spoken) */}
          {turns.length === 1 && (
            <div className="flex flex-wrap gap-2 border-t border-white/40 px-4 py-3">
              {STARTERS.map((s) => (
                <motion.button
                  key={s}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => send(s)}
                  className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100 transition hover:bg-emerald-100"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/40 px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type in English... (Gõ tiếng Anh nhé)"
              maxLength={800}
              disabled={sending}
              className="min-h-[48px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-300 focus:bg-white"
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              disabled={sending || !input.trim()}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              aria-label="Gửi"
            >
              <Send className="h-5 w-5" aria-hidden="true" />
            </motion.button>
          </form>
        </div>
      </main>
    </div>
  );
}

function ChatBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-sm ${
          isUser ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-500 ring-1 ring-emerald-100'
        }`}
      >
        {isUser ? <User className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
      </span>
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-emerald-600 text-white'
            : 'rounded-2xl rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200'
        }`}
      >
        {turn.content}
      </div>
    </motion.div>
  );
}
