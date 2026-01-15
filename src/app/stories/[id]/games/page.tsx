'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { getStoryById } from '@/data/stories';
import { MatchGameItem } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface PageProps {
  params: { id: string };
}

type GameType = 'match' | 'fill_blank';

export default function GamesPage({ params }: PageProps) {
  const { id } = params;
  const story = getStoryById(id);
  
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  
  const { addGameScore, completeStory, progress } = useAppStore();

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Không tìm thấy truyện</h1>
          <Link href="/stories" className="text-blue-500 hover:underline">
            ← Quay lại thư viện
          </Link>
        </div>
      </div>
    );
  }

  const handleGameComplete = (gameType: GameType, score: number, total: number) => {
    addGameScore({
      gameType,
      storyId: story.id,
      score,
      totalQuestions: total,
      playedAt: new Date().toISOString(),
    });
    
    // Award extra star for perfect score
    if (score === total) {
      const currentStars = progress.storiesProgress[story.id]?.starsEarned || 0;
      if (currentStars < 3) {
        completeStory(story.id, currentStars + 1);
      }
    }
  };

  if (selectedGame === 'match') {
    return (
      <MatchGame 
        story={story} 
        onComplete={(score, total) => handleGameComplete('match', score, total)}
        onBack={() => setSelectedGame(null)}
      />
    );
  }

  if (selectedGame === 'fill_blank') {
    return (
      <FillBlankGame 
        story={story} 
        onComplete={(score, total) => handleGameComplete('fill_blank', score, total)}
        onBack={() => setSelectedGame(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between">
          <Link href={`/stories/${id}/vocab`} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Flashcards
          </Link>
          <h1 className="font-bold text-gray-800 text-sm">🎮 Mini Games</h1>
          <Link href="/stories" className="text-gray-500 hover:text-gray-700 text-sm">
            Thư viện
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 py-4">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-1">
            {story.title_en}
          </h2>
          <p className="text-gray-500 text-center text-sm mb-4">Chọn game để ôn tập!</p>

          <div className="space-y-3">
            {/* Match Game */}
            <button
              onClick={() => setSelectedGame('match')}
              className="w-full p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="text-2xl mb-1">🎯</div>
              <h3 className="text-lg font-bold">Match Game</h3>
              <p className="text-white/80 text-xs">Nối từ tiếng Anh với nghĩa tiếng Việt</p>
            </button>

            {/* Fill Blank Game */}
            <button
              onClick={() => setSelectedGame('fill_blank')}
              className="w-full p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="text-2xl mb-1">✏️</div>
              <h3 className="text-lg font-bold">Fill in the Blank</h3>
              <p className="text-white/80 text-xs">Điền từ còn thiếu vào câu</p>
            </button>
          </div>

          {/* Back to stories */}
          <Link
            href="/stories"
            className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm bg-white shadow-md hover:shadow-lg transition-all text-center block text-gray-700"
          >
            📚 Đọc truyện khác
          </Link>
        </div>
      </main>
    </div>
  );
}

// Match Game Component
function MatchGame({ 
  story, 
  onComplete, 
  onBack 
}: { 
  story: NonNullable<ReturnType<typeof getStoryById>>;
  onComplete: (score: number, total: number) => void;
  onBack: () => void;
}) {
  const matchItems = story.games.match;
  const [selectedEN, setSelectedEN] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Shuffle arrays
  const [shuffledEN] = useState(() => [...matchItems].sort(() => Math.random() - 0.5));
  const [shuffledVI] = useState(() => [...matchItems].sort(() => Math.random() - 0.5));

  const handleENClick = (word: string) => {
    if (matchedPairs.has(word)) return;
    setSelectedEN(word);
    setWrongPair(null);
  };

  const handleVIClick = (vi: string, word: string) => {
    if (!selectedEN || matchedPairs.has(word)) return;
    
    // Check if match is correct
    const correctMatch = matchItems.find(item => item.word === selectedEN);
    if (correctMatch && correctMatch.vi === vi) {
      // Correct!
      setMatchedPairs((prev: Set<string>) => new Set([...prev, selectedEN, word]));
      setScore(score + 1);
      setSelectedEN(null);
      
      // Check if game complete
      if (matchedPairs.size + 2 >= matchItems.length * 2) {
        setIsComplete(true);
        onComplete(score + 1, matchItems.length);
      }
    } else {
      // Wrong!
      setWrongPair(word);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedEN(null);
      }, 500);
    }
  };

  if (isComplete) {
    return (
      <GameComplete 
        score={score} 
        total={matchItems.length} 
        onBack={onBack}
        storyId={story.id}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Quay lại
          </button>
          <h1 className="font-bold text-gray-800 text-sm">🎯 Match Game</h1>
          <div className="text-green-600 font-bold text-sm">{score}/{matchItems.length}</div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4">
        <div className="max-w-xl mx-auto">
          <p className="text-center text-gray-500 text-sm mb-4">
            Chọn từ tiếng Anh, rồi chọn nghĩa tiếng Việt tương ứng
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {/* English words */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 text-center">English</p>
              {shuffledEN.map((item: MatchGameItem) => (
                <button
                  key={item.word}
                  onClick={() => handleENClick(item.word)}
                  disabled={matchedPairs.has(item.word)}
                  className={`w-full py-2.5 px-2 rounded-lg font-medium text-sm transition-all ${
                    matchedPairs.has(item.word)
                      ? 'bg-green-100 text-green-700 opacity-50'
                      : selectedEN === item.word
                      ? 'bg-blue-500 text-white shadow-md scale-105'
                      : 'bg-white shadow-sm hover:shadow-md text-gray-700'
                  }`}
                >
                  {item.word}
                </button>
              ))}
            </div>

            {/* Vietnamese meanings */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 text-center">Tiếng Việt</p>
              {shuffledVI.map((item: MatchGameItem) => (
                <button
                  key={item.word + '-vi'}
                  onClick={() => handleVIClick(item.vi, item.word)}
                  disabled={matchedPairs.has(item.word)}
                  className={`w-full py-2.5 px-2 rounded-lg font-medium text-sm transition-all ${
                    matchedPairs.has(item.word)
                      ? 'bg-green-100 text-green-700 opacity-50'
                      : wrongPair === item.word
                      ? 'bg-red-100 text-red-700 shake'
                      : 'bg-white shadow-sm hover:shadow-md text-gray-700'
                  }`}
                >
                  {item.vi}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Fill Blank Game Component
function FillBlankGame({ 
  story, 
  onComplete, 
  onBack 
}: { 
  story: NonNullable<ReturnType<typeof getStoryById>>;
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
    if (selectedAnswer) return; // Already answered
    
    setSelectedAnswer(answer);
    const correct = answer === currentQuestion.answer;
    setIsCorrect(correct);
    
    if (correct) {
      setScore(score + 1);
    }

    // Move to next question after delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setIsComplete(true);
        onComplete(correct ? score + 1 : score, questions.length);
      }
    }, 1000);
  };

  if (isComplete) {
    return (
      <GameComplete 
        score={score} 
        total={questions.length} 
        onBack={onBack}
        storyId={story.id}
      />
    );
  }

  // Highlight the blank in the sentence
  const sentenceParts = currentQuestion.sentence_en.split('___');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Quay lại
          </button>
          <h1 className="font-bold text-gray-800 text-sm">✏️ Fill in the Blank</h1>
          <div className="text-green-600 font-bold text-sm">{score}/{questions.length}</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-3 py-4">
        <div className="w-full max-w-sm">
          {/* Progress */}
          <p className="text-center text-gray-500 text-sm mb-4">
            Câu {currentIndex + 1}/{questions.length}
          </p>

          {/* Question */}
          <div className="bg-white rounded-xl p-4 shadow-md mb-4">
            <p className="text-lg text-center">
              {sentenceParts[0]}
              <span className={`px-2 py-0.5 rounded font-bold ${
                selectedAnswer 
                  ? isCorrect 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {selectedAnswer || '___'}
              </span>
              {sentenceParts[1]}
            </p>
          </div>

          {/* Answer choices */}
          <div className="space-y-2">
            {currentQuestion.choices.map((choice) => (
              <button
                key={choice}
                onClick={() => handleAnswer(choice)}
                disabled={selectedAnswer !== null}
                className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                  selectedAnswer === choice
                    ? isCorrect
                      ? 'bg-green-500 text-white bounce-success'
                      : 'bg-red-500 text-white shake'
                    : selectedAnswer && choice === currentQuestion.answer
                    ? 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-white shadow-sm hover:shadow-md text-gray-700'
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Game Complete Component
function GameComplete({ 
  score, 
  total, 
  onBack,
  storyId
}: { 
  score: number; 
  total: number; 
  onBack: () => void;
  storyId: string;
}) {
  const percentage = Math.round((score / total) * 100);
  const isPerfect = score === total;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-3 py-4">
      <div className="text-center max-w-sm">
        {/* Celebration */}
        <div className="text-4xl mb-2">
          {isPerfect ? '🎉' : score > total / 2 ? '👏' : '💪'}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          {isPerfect ? 'Hoàn hảo!' : score > total / 2 ? 'Tuyệt vời!' : 'Cố gắng thêm!'}
        </h1>
        
        <p className="text-gray-500 text-sm mb-4">
          Bạn trả lời đúng {score}/{total} câu ({percentage}%)
        </p>

        {/* Stars earned */}
        {isPerfect && (
          <div className="mb-4">
            <div className="text-3xl star-earned">⭐</div>
            <p className="text-yellow-600 font-medium text-sm">+1 Sao!</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onBack}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md hover:shadow-lg transition-all"
          >
            🎮 Chơi lại
          </button>
          
          <Link
            href="/stories"
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-white shadow-md hover:shadow-lg transition-all text-gray-700 block"
          >
            📚 Đọc truyện khác
          </Link>
        </div>
      </div>
    </div>
  );
}
