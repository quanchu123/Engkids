'use client';

import { useState } from 'react';
import type { FarmQuiz } from '@/game/farm/systems/quizSystem';
import { isSpeechSupported, speak } from '@/lib/pronunciation';

interface QuizModalProps {
  quiz: FarmQuiz | null;
  onAnswer: (choice: string) => void;
  result: { correct: boolean; correctAnswer: string } | null;
  onClose: () => void;
}

/**
 * Quiz modal shown after harvesting a word or during a review session. Supports
 * three modes:
 *  - `meaning`: shows the Vietnamese prompt + 4 English choices.
 *  - `listen` : plays the English word (TTS) + 4 English choices (no VI text).
 *  - `spelling`: shows the VI prompt + 🔊 and a text input to type the word.
 *
 * Once answered the input/choices are disabled and gentle, kid-friendly feedback
 * is shown (cheerful on correct, the correct answer with an encouraging message
 * on a wrong answer — no harsh penalty). A continue button closes the modal.
 */
export function QuizModal({ quiz, onAnswer, result, onClose }: QuizModalProps) {
  const [typed, setTyped] = useState('');
  if (!quiz) return null;

  const answered = result !== null;
  const speakable = isSpeechSupported();

  const header =
    quiz.mode === 'listen'
      ? 'Nghe và chọn từ đúng'
      : quiz.mode === 'spelling'
        ? 'Đánh vần từ tiếng Anh'
        : 'Dịch sang tiếng Anh';

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.35) 0%, rgba(15,23,42,0.8) 100%)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Câu hỏi từ vựng"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-emerald-50 to-amber-50 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-3 text-center">
          <div className="text-xs font-black uppercase tracking-wider text-white/80">
            {header}
          </div>
          {quiz.mode === 'listen' ? (
            <button
              type="button"
              onClick={() => speak(quiz.en)}
              disabled={!speakable}
              aria-label="Phát âm từ"
              className="mx-auto mt-1 flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-lg font-black text-emerald-600 shadow disabled:opacity-50"
            >
              🔊 Nghe lại
            </button>
          ) : (
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-2xl font-black text-white drop-shadow">
                &quot;{quiz.vi}&quot;
              </span>
              <button
                type="button"
                onClick={() => speak(quiz.en)}
                disabled={!speakable}
                aria-label="Phát âm từ"
                className="rounded-full bg-white/90 px-2 py-1 text-base shadow disabled:opacity-50"
              >
                🔊
              </button>
            </div>
          )}
        </div>

        <div className="p-5">
          {/* Spelling: text input */}
          {quiz.mode === 'spelling' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!answered) onAnswer(typed);
              }}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={answered}
                placeholder="Gõ từ tiếng Anh..."
                aria-label="Nhập từ tiếng Anh"
                className="w-full rounded-2xl border-2 border-emerald-300 px-4 py-3 text-center text-xl font-black text-emerald-700 outline-none focus:border-emerald-500 disabled:bg-slate-50"
              />
              {!answered && (
                <button
                  type="submit"
                  className="w-full rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-300 to-teal-400 py-3 text-base font-black text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
                >
                  Kiểm tra
                </button>
              )}
            </form>
          ) : (
            /* meaning / listen: multiple choice */
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quiz.choices.map((choice) => {
                const isCorrectChoice = answered && choice === result.correctAnswer;

                let stateClass =
                  'border-emerald-300 bg-white text-emerald-700 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md active:scale-95';
                if (answered) {
                  stateClass = isCorrectChoice
                    ? 'border-green-400 bg-green-100 text-green-700'
                    : 'border-slate-200 bg-slate-50 text-slate-400';
                }

                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={answered}
                    onClick={() => onAnswer(choice)}
                    aria-label={`Chọn ${choice}`}
                    className={`rounded-2xl border-2 px-3 py-3 text-base font-black transition-all disabled:cursor-default ${stateClass}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          )}

          {/* Feedback */}
          {answered && (
            <div className="mt-4">
              {result.correct ? (
                <div className="rounded-2xl bg-green-100 px-4 py-3 text-center text-lg font-black text-green-700">
                  🎉 Chính xác! +XP
                </div>
              ) : (
                <div className="rounded-2xl bg-amber-100 px-4 py-3 text-center font-bold text-amber-700">
                  <div className="text-base font-black">Gần đúng rồi! 🌟</div>
                  <div className="mt-1 text-sm">
                    Đáp án đúng là{' '}
                    <span className="font-black text-emerald-700">{result.correctAnswer}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setTyped('');
                  onClose();
                }}
                className="mt-4 w-full rounded-2xl border-2 border-orange-400 py-3 text-base font-black text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)' }}
              >
                Tiếp tục
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizModal;
