'use client';

/**
 * PronunciationPractice — playful "luyện nói + chấm phát âm" widget.
 *
 * Lets a kid hear the model word (TTS), then speak it into the mic. The spoken
 * transcript is scored against the target with the pure scorer in
 * `@/lib/pronunciation`, and a friendly 0..100 score + stars + message is shown.
 *
 * Fully client-side and SSR-safe: all browser access is feature-detected and
 * guarded. If speech recognition is unsupported, only the "Nghe 🔊" button is
 * offered with a friendly note. Recognition errors never crash the UI.
 */

import { useEffect, useRef, useState } from 'react';
import { speakWord } from '@/services/dictionary';
import { scorePronunciation, PASS_THRESHOLD } from '@/lib/pronunciation';
import {
  isSpeechRecognitionSupported,
  listenOnce,
  SpeechRecognitionError,
} from '@/services/speech-recognition';

export interface PronunciationPracticeProps {
  word: string;
  ipa?: string;
  meaningVi?: string;
  onResult?: (r: { score: number; correct: boolean }) => void;
}

type Phase = 'idle' | 'listening' | 'scoring' | 'result' | 'unsupported';

interface ResultState {
  score: number;
  correct: boolean;
  heard: string;
}

/** Map a 0..100 score to 1–3 stars. */
function starsForScore(score: number): number {
  if (score >= PASS_THRESHOLD) return 3;
  if (score >= 50) return 2;
  return 1;
}

/** Friendly Vietnamese message for a recognition error code. */
function messageForError(err: unknown): string {
  if (err instanceof SpeechRecognitionError) {
    switch (err.code) {
      case 'not-allowed':
        return 'Mình chưa nghe được — hãy cho phép dùng micro rồi thử lại nhé!';
      case 'no-speech':
        return 'Mình chưa nghe thấy gì cả. Nói to và rõ hơn một chút nhé!';
      case 'timeout':
        return 'Hết giờ rồi! Nhấn nút micro và nói lại nhé.';
      case 'aborted':
        return 'Đã dừng nghe. Thử lại nhé!';
      default:
        return 'Có chút trục trặc rồi. Thử lại nhé!';
    }
  }
  return 'Có chút trục trặc rồi. Thử lại nhé!';
}

export default function PronunciationPractice({
  word,
  ipa,
  meaningVi,
  onResult,
}: PronunciationPracticeProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<ResultState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Avoid setting state after unmount (recognition is async).
  const mountedRef = useRef(true);

  // Feature-detect support on the client only (SSR renders 'idle' first).
  useEffect(() => {
    mountedRef.current = true;
    if (!isSpeechRecognitionSupported()) {
      setPhase('unsupported');
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleListen = () => {
    speakWord(word);
  };

  const handleSpeak = async () => {
    if (phase === 'listening' || phase === 'scoring') return;

    setErrorMsg(null);
    setResult(null);
    setPhase('listening');

    try {
      const { transcript } = await listenOnce({ lang: 'en-US' });
      if (!mountedRef.current) return;

      setPhase('scoring');
      const { score, correct } = scorePronunciation(word, transcript);

      if (!mountedRef.current) return;
      setResult({ score, correct, heard: transcript });
      setPhase('result');
      onResult?.({ score, correct });
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMsg(messageForError(err));
      setPhase('idle');
    }
  };

  const handleRetry = () => {
    setResult(null);
    setErrorMsg(null);
    setPhase('idle');
  };

  const isBusy = phase === 'listening' || phase === 'scoring';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 border-2 border-orange-200 p-6 shadow-lg">
      {/* Target word + IPA + meaning */}
      <div className="text-center mb-5">
        <div className="text-xs font-bold uppercase tracking-wide text-orange-400 mb-1">
          Luyện nói
        </div>
        <h3 className="text-4xl font-extrabold text-gray-800">{word}</h3>
        {ipa && <p className="text-lg text-orange-500 font-medium mt-1">/{ipa.replace(/^\/|\/$/g, '')}/</p>}
        {meaningVi && <p className="text-gray-500 mt-1">{meaningVi}</p>}
      </div>

      {/* Listen-to-model button (always available) */}
      <div className="flex justify-center mb-4">
        <button
          type="button"
          onClick={handleListen}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-orange-600 font-bold border-2 border-orange-200 hover:bg-orange-50 hover:scale-105 active:scale-95 transition-transform shadow-sm"
        >
          Nghe 🔊
        </button>
      </div>

      {phase === 'unsupported' ? (
        <p className="text-center text-sm text-gray-500 bg-white/70 rounded-xl px-4 py-3 border border-orange-100">
          Trình duyệt này chưa hỗ trợ luyện nói — hãy dùng Chrome trên máy tính/Android nhé 😊
        </p>
      ) : (
        <>
          {/* Mic button + states */}
          {phase !== 'result' && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleSpeak}
                disabled={isBusy}
                aria-label="Nói thử"
                className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full text-white text-3xl font-bold shadow-lg transition-transform ${
                  isBusy
                    ? 'bg-gradient-to-br from-pink-500 to-rose-500 cursor-default'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:scale-110 active:scale-95'
                }`}
              >
                {phase === 'listening' && (
                  <span className="absolute inset-0 rounded-full bg-pink-400 opacity-60 animate-ping" />
                )}
                <span className="relative">🎤</span>
              </button>

              <p className="text-sm font-medium text-gray-600 min-h-[1.25rem]">
                {phase === 'listening' && 'Đang nghe... nói "' + word + '" nào! 👂'}
                {phase === 'scoring' && 'Đang chấm điểm... ⭐'}
                {phase === 'idle' && 'Nhấn micro rồi nói thử 🎤'}
              </p>

              {errorMsg && (
                <p className="text-center text-sm text-rose-500 bg-rose-50 rounded-xl px-4 py-2 border border-rose-100">
                  {errorMsg}
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {phase === 'result' && result && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-1 text-3xl">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={n <= starsForScore(result.score) ? '' : 'opacity-25'}>
                    ⭐
                  </span>
                ))}
              </div>

              <div className="text-5xl font-extrabold text-purple-600">{result.score}</div>
              <div className="text-xs text-gray-400 -mt-2">/ 100 điểm</div>

              <p
                className={`text-lg font-bold ${
                  result.correct ? 'text-green-600' : 'text-orange-500'
                }`}
              >
                {result.correct ? 'Tuyệt vời! 🎉' : 'Gần đúng rồi, thử lại nhé!'}
              </p>

              {result.heard && (
                <p className="text-sm text-gray-500">
                  Bạn đã nói: <span className="font-semibold text-gray-700">{result.heard}</span>
                </p>
              )}

              <button
                type="button"
                onClick={handleRetry}
                className="mt-1 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold hover:scale-105 active:scale-95 transition-transform shadow-md"
              >
                Thử lại 🔁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
