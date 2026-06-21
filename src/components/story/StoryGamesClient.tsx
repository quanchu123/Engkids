'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MatchGameItem, Story } from '@/types';
import { useAppStore } from '@/store/useAppStore';

type GameType = 'match' | 'fill_blank';

interface StoryGamesClientProps {
  story: Story;
}

export default function StoryGamesClient({ story }: StoryGamesClientProps) {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const { applyGameResult, completeStory, progress } = useAppStore();

  const handleGameComplete = (gameType: GameType, score: number, total: number) => {
    const currentStars = progress.storiesProgress[story.id]?.starsEarned || 0;
    const rewardStars = score === total && currentStars < 3 ? 1 : 0;

    applyGameResult({
      gameType,
      storyId: story.id,
      score,
      totalQuestions: total,
      playedAt: new Date().toISOString(),
      rewards: { stars: rewardStars },
    });

    if (score === total && currentStars < 3) {
      completeStory(story.id, currentStars + 1);
    }
  };

  if (selectedGame === 'match') {
    return <MatchGame story={story} onComplete={(score, total) => handleGameComplete('match', score, total)} onBack={() => setSelectedGame(null)} />;
  }

  if (selectedGame === 'fill_blank') {
    return <FillBlankGame story={story} onComplete={(score, total) => handleGameComplete('fill_blank', score, total)} onBack={() => setSelectedGame(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href={`/stories/${story.id}/vocab`} className="text-sm font-bold text-slate-600">Flashcards</Link>
          <h1 className="kid-chip px-4 py-1 text-sm font-black text-slate-900">Mini Games</h1>
          <Link href="/stories" className="text-sm font-bold text-slate-600">Thư viện</Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md flex-col justify-center px-4 py-6">
        <div className="soft-panel mb-6 rounded-[1.75rem] p-5 text-center">
          <h2 className="mb-2 text-center text-2xl font-black text-slate-900">{story.title_en}</h2>
          <p className="text-center text-slate-500">Chọn game để ôn lại nội dung vừa học.</p>
        </div>
        <div className="space-y-4">
          <button onClick={() => setSelectedGame('match')} className="soft-feature w-full rounded-[2rem] p-5 text-left text-white">
            <h3 className="text-lg font-black">Match Game</h3>
            <p className="mt-1 text-sm text-white/80">Nối từ tiếng Anh với nghĩa tiếng Việt.</p>
          </button>
          <button onClick={() => setSelectedGame('fill_blank')} className="w-full rounded-[2rem] bg-gradient-to-r from-sky-500 to-cyan-500 p-5 text-left text-white shadow-lg">
            <h3 className="text-lg font-black">Fill in the Blank</h3>
            <p className="mt-1 text-sm text-white/80">Điền từ còn thiếu vào câu.</p>
          </button>
        </div>
      </main>
    </div>
  );
}

function MatchGame({
  story,
  onComplete,
  onBack,
}: {
  story: Story;
  onComplete: (score: number, total: number) => void;
  onBack: () => void;
}) {
  const matchItems = story.games.match;
  const [selectedEN, setSelectedEN] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const [shuffledEN] = useState(() => [...matchItems].sort(() => Math.random() - 0.5));
  const [shuffledVI] = useState(() => [...matchItems].sort(() => Math.random() - 0.5));

  const handleENClick = (word: string) => {
    if (matchedPairs.has(word)) return;
    setSelectedEN(word);
    setWrongPair(null);
  };

  const handleVIClick = (vi: string, word: string) => {
    if (!selectedEN || matchedPairs.has(word)) return;

    const correctMatch = matchItems.find((item) => item.word === selectedEN);
    if (correctMatch && correctMatch.vi === vi) {
      setMatchedPairs((prev) => new Set([...prev, selectedEN, word]));
      setScore((prev) => prev + 1);
      setSelectedEN(null);

      if (matchedPairs.size + 2 >= matchItems.length * 2) {
        setIsComplete(true);
        onComplete(score + 1, matchItems.length);
      }
    } else {
      setWrongPair(word);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedEN(null);
      }, 500);
    }
  };

  if (isComplete) {
    return <GameComplete score={score} total={matchItems.length} onBack={onBack} />;
  }

  return (
    <GameShell title="Match Game" score={`${score}/${matchItems.length}`} onBack={onBack}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {shuffledEN.map((item: MatchGameItem) => (
            <button
              key={item.word}
              onClick={() => handleENClick(item.word)}
              disabled={matchedPairs.has(item.word)}
              className={`w-full rounded-2xl px-3 py-3 text-sm font-semibold ${
                matchedPairs.has(item.word)
                  ? 'bg-emerald-100 text-emerald-700'
                  : selectedEN === item.word
                    ? 'bg-sky-500 text-white'
                    : 'bg-white text-slate-700 shadow'
              }`}
            >
              {item.word}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledVI.map((item: MatchGameItem) => (
            <button
              key={`${item.word}-vi`}
              onClick={() => handleVIClick(item.vi, item.word)}
              disabled={matchedPairs.has(item.word)}
              className={`w-full rounded-2xl px-3 py-3 text-sm font-semibold ${
                matchedPairs.has(item.word)
                  ? 'bg-emerald-100 text-emerald-700'
                  : wrongPair === item.word
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-white text-slate-700 shadow'
              }`}
            >
              {item.vi}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}

function FillBlankGame({
  story,
  onComplete,
  onBack,
}: {
  story: Story;
  onComplete: (score: number, total: number) => void;
  onBack: () => void;
}) {
  const questions = story.games.fill_blank;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const currentQuestion = questions[currentIndex];

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return;
    const correct = answer === currentQuestion.answer;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    if (correct) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setIsComplete(true);
        onComplete(correct ? score + 1 : score, questions.length);
      }
    }, 900);
  };

  if (isComplete) {
    return <GameComplete score={score} total={questions.length} onBack={onBack} />;
  }

  const sentenceParts = currentQuestion.sentence_en.split('___');

  return (
    <GameShell title="Fill in the Blank" score={`${score}/${questions.length}`} onBack={onBack}>
      <div className="toy-panel mb-4 p-5 text-center">
        <p className="text-lg font-semibold text-slate-900">
          {sentenceParts[0]}
          <span className={`mx-2 rounded px-3 py-1 ${selectedAnswer ? (isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700') : 'bg-amber-100 text-amber-700'}`}>
            {selectedAnswer || '___'}
          </span>
          {sentenceParts[1]}
        </p>
      </div>
      <div className="space-y-2">
        {currentQuestion.choices.map((choice) => (
          <button
            key={choice}
            onClick={() => handleAnswer(choice)}
            disabled={selectedAnswer !== null}
            className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold ${
              selectedAnswer === choice
                ? isCorrect
                  ? 'bg-emerald-500 text-white'
                  : 'bg-rose-500 text-white'
                : selectedAnswer && choice === currentQuestion.answer
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-white text-slate-700 shadow'
            }`}
          >
            {choice}
          </button>
        ))}
      </div>
    </GameShell>
  );
}

function GameShell({
  title,
  score,
  onBack,
  children,
}: {
  title: string;
  score: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-pink-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <button onClick={onBack} className="text-sm font-bold text-slate-600">Quay lại</button>
          <h1 className="kid-chip px-4 py-1 text-sm font-black text-slate-900">{title}</h1>
          <span className="kid-chip px-3 py-1 text-sm font-black text-emerald-600">{score}</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
    </div>
  );
}

function GameComplete({
  score,
  total,
  onBack,
}: {
  score: number;
  total: number;
  onBack: () => void;
}) {
  const percentage = Math.round((score / total) * 100);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 via-white to-pink-50 px-4">
      <div className="toy-panel w-full max-w-sm p-8 text-center">
        <div className="mb-3 text-4xl font-black text-violet-600">{percentage}%</div>
        <h1 className="mb-2 text-2xl font-black text-slate-900">
          {score === total ? 'Hoàn hảo' : score > total / 2 ? 'Tốt lắm' : 'Thử lại nhé'}
        </h1>
        <p className="mb-5 text-sm text-slate-500">
          Bạn trả lời đúng {score}/{total} câu.
        </p>
        <div className="grid gap-2">
          <button onClick={onBack} className="rounded-2xl bg-violet-500 px-4 py-3 font-bold text-white">
            Chơi lại
          </button>
          <Link href="/stories" className="rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-700">
            Truyện khác
          </Link>
        </div>
      </div>
    </div>
  );
}
