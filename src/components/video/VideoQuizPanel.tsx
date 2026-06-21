'use client';

import { useMemo, useState } from 'react';
import { Brain, CheckCircle2, Lightbulb, PartyPopper, Trophy, XCircle } from 'lucide-react';
import { VideoQuizQuestion } from '@/types';
import Fireworks from '@/components/common/Fireworks';

interface VideoQuizPanelProps {
  questions: VideoQuizQuestion[];
  /** Called when the child answers a question correctly (for rewards / analytics). */
  onCorrect?: (question: VideoQuizQuestion) => void;
  /** Called when the whole quiz is finished. */
  onComplete?: (correctCount: number, total: number) => void;
}

export default function VideoQuizPanel({ questions, onCorrect, onComplete }: VideoQuizPanelProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [fireworksKey, setFireworksKey] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const question = questions[current];
  const isLast = current === total - 1;

  const progressPercent = useMemo(
    () => (total === 0 ? 0 : Math.round((current / total) * 100)),
    [current, total],
  );

  if (total === 0) return null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);

    if (index === question.correctIndex) {
      setCorrectCount((count) => count + 1);
      setFireworksKey((key) => key + 1);
      onCorrect?.(question);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      onComplete?.(correctCount, total);
      return;
    }
    setCurrent((value) => value + 1);
    setSelected(null);
    setAnswered(false);
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setFinished(false);
  };

  if (finished) {
    const allCorrect = correctCount === total;
    return (
      <div className="toy-panel mb-4 p-5 text-center" data-testid="video-quiz-result">
        <Fireworks trigger={allCorrect ? fireworksKey + 1 : 0} />
        <div className="mb-2 flex justify-center text-violet-600">
          {allCorrect ? (
            <Trophy className="h-10 w-10" fill="currentColor" aria-hidden="true" />
          ) : (
            <PartyPopper className="h-10 w-10" aria-hidden="true" />
          )}
        </div>
        <h3 className="text-xl font-black text-slate-800">
          {allCorrect ? 'Giỏi quá!' : 'Làm tốt lắm!'}
        </h3>
        <p className="mt-1 text-slate-600">
          Bé trả lời đúng <span className="font-bold text-emerald-600">{correctCount}</span>/{total} câu
        </p>
        <button
          onClick={handleRestart}
          className="mt-4 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-2.5 font-bold text-white shadow-lg transition-transform hover:scale-105"
        >
          Làm lại
        </button>
      </div>
    );
  }

  return (
    <div className="toy-panel mb-4 p-5" data-testid="video-quiz-panel">
      <Fireworks trigger={fireworksKey} />

      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-black text-violet-700">
          <Brain className="h-5 w-5" aria-hidden="true" />
          Câu hỏi cho bé
        </h3>
        <span className="kid-chip px-3 py-1 text-xs font-bold text-slate-600">
          {current + 1}/{total}
        </span>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="progress-bar h-full"
          style={{ width: `${answered && isLast ? 100 : progressPercent}%` }}
        />
      </div>

      <div className="mb-4">
        <p className="text-lg font-bold leading-snug text-slate-800">{question.question}</p>
        {question.questionVi && (
          <p className="mt-1 text-sm text-slate-500">{question.questionVi}</p>
        )}
      </div>

      <div className="space-y-2">
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex;
          const isChosen = index === selected;

          let stateClasses =
            'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50';
          if (answered) {
            if (isCorrect) {
              stateClasses = 'border-emerald-400 bg-emerald-50 text-emerald-800';
            } else if (isChosen) {
              stateClasses = 'border-red-300 bg-red-50 text-red-700 shake';
            } else {
              stateClasses = 'border-slate-200 bg-white opacity-60';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={answered}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-semibold transition-all ${stateClasses}`}
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="flex-1">{option}</span>
              {answered && isCorrect && (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              )}
              {answered && isChosen && !isCorrect && (
                <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 animate-bounce-in">
          {selected === question.correctIndex ? (
            <p className="mb-3 font-bold text-emerald-600">Chính xác! Tuyệt vời!</p>
          ) : (
            <p className="mb-3 font-bold text-red-500">
              Chưa đúng rồi. Đáp án đúng là{' '}
              <span className="underline">{question.options[question.correctIndex]}</span>.
            </p>
          )}
          {question.explanation && (
            <p className="mb-3 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <span>{question.explanation}</span>
            </p>
          )}
          <button
            onClick={handleNext}
            className="w-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 py-3 font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
          >
            {isLast ? 'Xem kết quả' : 'Câu tiếp theo'}
          </button>
        </div>
      )}
    </div>
  );
}
