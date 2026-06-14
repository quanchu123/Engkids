'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, Loader2, Mic, MicOff, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getLearnerStageProgress } from '@/lib/curriculum';

// ── Minimal Web Speech API typings (not in the standard DOM lib) ────────────
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: Turn = {
  role: 'assistant',
  content: "Hi! I'm Engkids Buddy. Tap the microphone and talk to me in English! (Chạm vào micro và nói tiếng Anh với mình nhé!)",
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Strip the Vietnamese hint in parentheses so TTS only speaks the English part.
function englishOnly(text: string): string {
  return text.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim() || text;
}

export default function SpeakPage() {
  const progress = useAppStore((state) => state.progress);
  const [level, setLevel] = useState('a2-key');
  const [turns, setTurns] = useState<Turn[]>([GREETING]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef('');
  const levelRef = useRef(level);
  const turnsRef = useRef(turns);
  const scrollRef = useRef<HTMLDivElement>(null);
  levelRef.current = level;
  turnsRef.current = turns;

  // Resolve the child's CEFR level (DB first, local fallback).
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
    setSupported(Boolean(getRecognitionCtor()) && typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, thinking, interim]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(englishOnly(text));
    utter.lang = 'en-US';
    utter.rate = 0.92;
    utter.pitch = 1.05;
    const voice = synth.getVoices().find((v) => /en[-_]US/i.test(v.lang) && /female|samantha|zira|google/i.test(v.name))
      || synth.getVoices().find((v) => /^en/i.test(v.lang));
    if (voice) utter.voice = voice;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.speak(utter);
  }, []);

  const sendToBuddy = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message) return;
    setError('');
    const nextTurns: Turn[] = [...turnsRef.current, { role: 'user', content: message }];
    setTurns(nextTurns);
    setThinking(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: levelRef.current, messages: nextTurns.slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok || !data?.reply) {
        setError(data?.error || 'Trợ lý AI đang bận, bé thử lại nhé!');
      } else {
        setTurns((cur) => [...cur, { role: 'assistant', content: data.reply }]);
        speak(data.reply);
      }
    } catch {
      setError('Không kết nối được tới trợ lý AI. Bé kiểm tra mạng nhé!');
    } finally {
      setThinking(false);
    }
  }, [speak]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setError('');
    finalTextRef.current = '';
    setInterim('');

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) finalTextRef.current += transcript;
        else interimText += transcript;
      }
      setInterim(interimText);
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Bé cần cho phép dùng micro trong trình duyệt nhé.');
      } else if (e.error === 'no-speech') {
        setError('Mình chưa nghe rõ. Bé thử nói lại nhé!');
      }
    };
    recognition.onend = () => {
      setListening(false);
      setInterim('');
      const said = finalTextRef.current.trim();
      if (said) void sendToBuddy(said);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [sendToBuddy]);

  const toggleMic = () => {
    if (listening) stopListening();
    else startListening();
  };

  const reset = () => {
    recognitionRef.current?.abort();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setTurns([GREETING]);
    setListening(false);
    setThinking(false);
    setSpeaking(false);
    setInterim('');
    setError('');
  };

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const lastAssistant = [...turns].reverse().find((t) => t.role === 'assistant');

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-pink-50 to-rose-50">
      <Header />
      <main className="mx-auto flex h-[calc(100vh-64px)] max-w-3xl flex-col px-4 pb-4 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/roadmap" className="inline-flex items-center gap-2 text-sm font-black text-fuchsia-700">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Bản đồ
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/learn/chat" className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-fuchsia-700 shadow-sm ring-1 ring-fuchsia-100">
              Chat gõ phím
            </Link>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Mới
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 px-4 py-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <Bot className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight">Luyện nói cùng Buddy</p>
              <p className="flex items-center gap-1 text-[11px] font-bold text-white/85">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> Speaking practice · {level.toUpperCase()}
              </p>
            </div>
            {speaking && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-black">
                <Volume2 className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" /> Đang nói
              </span>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.map((turn, i) => (
              <Bubble key={i} turn={turn} onReplay={turn.role === 'assistant' ? () => speak(turn.content) : undefined} />
            ))}
            {interim && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-fuchsia-200 px-4 py-2.5 text-sm font-semibold italic text-fuchsia-800">
                  {interim}
                </div>
              </div>
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Buddy đang nghĩ...
              </div>
            )}
            {error && (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">{error}</div>
            )}
          </div>

          {/* Mic control */}
          <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-4 py-5">
            {!supported ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-100">
                Trình duyệt này chưa hỗ trợ luyện nói. Bé hãy dùng Chrome hoặc Edge trên máy tính nhé. (Hoặc dùng Chat gõ phím.)
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={thinking}
                  className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition disabled:opacity-50 ${
                    listening ? 'animate-pulse bg-rose-500 ring-4 ring-rose-200' : 'bg-fuchsia-600 hover:bg-fuchsia-700 hover:-translate-y-0.5'
                  }`}
                  style={{ boxShadow: '0 6px 0 rgba(0,0,0,0.12)' }}
                  aria-label={listening ? 'Dừng nói' : 'Bắt đầu nói'}
                >
                  {listening ? <MicOff className="h-9 w-9" aria-hidden="true" /> : <Mic className="h-9 w-9" aria-hidden="true" />}
                </button>
                <p className="text-sm font-black text-slate-600">
                  {listening ? 'Đang nghe... nói tiếng Anh nhé!' : thinking ? 'Chờ Buddy một chút...' : 'Chạm để nói'}
                </p>
                {lastAssistant && !listening && !thinking && (
                  <button
                    type="button"
                    onClick={() => speak(lastAssistant.content)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Nghe lại
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Bubble({ turn, onReplay }: { turn: Turn; onReplay?: () => void }) {
  const isUser = turn.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm font-semibold leading-relaxed shadow-sm ${
          isUser ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-800 ring-1 ring-slate-200'
        }`}
      >
        {turn.content}
        {onReplay && (
          <button
            type="button"
            onClick={onReplay}
            className="mt-1.5 flex items-center gap-1 text-xs font-black text-fuchsia-600"
            aria-label="Nghe lại câu này"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" /> Nghe
          </button>
        )}
      </div>
    </div>
  );
}
