'use client';

import type { FarmQuiz } from '@/game/farm/systems/quizSystem';

interface QuizModalProps {
  quiz: FarmQuiz | null;
  onAnswer: (choice: string) => void;
  result: { correct: boolean; correctAnswer: string } | null;
  onClose: () => void;
}

/**
 * Quiz modal shown after harvesting a new word. Presents the Vietnamese prompt
 * and four English choices; once answered the choices are disabled and gentle,
 * kid-friendly feedback is shown (cheerful on correct, the correct answer with
 * an encouraging message on a wrong answer — no harsh penalty). A continue
 * button closes the modal after answering. Styled like the rpg-world battle
 * modal but in the brighter farming palette.
 */
export function QuizModal({ quiz, onAnswer, result, onClose }: QuizModalProps) {
  if (!quiz) return null;

  const answered = result !== null;

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
            Dịch sang tiếng Anh
          </div>
          <div className="mt-1 text-2xl font-black text-white drop-shadow">
            &quot;{quiz.vi}&quot;
          </div>
        </div>

        <div className="p-5">
          {/* Choices */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {quiz.choices.map((choice) => {
              const isCorrectChoice = answered && choice === result.correctAnswer;
              const isWrongPick =
                answered && !result.correct && choice === result.correctAnswer;

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
                  aria-label={`Chọn ${choice}${isWrongPick ? ' (đáp án đúng)' : ''}`}
                  className={`rounded-2xl border-2 px-3 py-3 text-base font-black transition-all disabled:cursor-default ${stateClass}`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

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
                onClick={onClose}
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
