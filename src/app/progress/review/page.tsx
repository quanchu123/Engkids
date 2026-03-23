'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { pronounceWord } from '@/services/dictionary';
import Header from '@/components/layout/Header';
import { SavedWord } from '@/types';

// SM-2 algorithm constants - Cute Animals Theme
const QUALITY_RESPONSES = [
  { label: 'Không nhớ', emoji: '🙀', quality: 0, color: 'from-red-400 to-red-500' },
  { label: 'Khó nhớ', emoji: '😿', quality: 2, color: 'from-orange-400 to-orange-500' },
  { label: 'Nhớ', emoji: '🐱', quality: 3, color: 'from-yellow-400 to-yellow-500' },
  { label: 'Dễ dàng', emoji: '😺', quality: 4, color: 'from-green-400 to-green-500' },
  { label: 'Quá dễ', emoji: '😸', quality: 5, color: 'from-emerald-400 to-emerald-500' },
];

const MASTERY_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  0: { label: 'Mới', emoji: '🐣', color: 'gray' },
  1: { label: 'Đang học', emoji: '🐥', color: 'blue' },
  2: { label: 'Quen thuộc', emoji: '🐰', color: 'yellow' },
  3: { label: 'Nhớ tốt', emoji: '🦊', color: 'orange' },
  4: { label: 'Rất tốt', emoji: '🦁', color: 'purple' },
  5: { label: 'Thành thạo', emoji: '🦋', color: 'green' },
};

export default function ReviewPage() {
  const { progress, updateWordMastery } = useAppStore();
  const [reviewWords, setReviewWords] = useState<SavedWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    incorrect: 0,
    reviewed: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  // Load words for review
  useEffect(() => {
    // Sort by mastery level (lower first) and last reviewed
    const wordsToReview = [...progress.savedWords].sort((a, b) => {
      const masteryDiff = (a.masteryLevel || 0) - (b.masteryLevel || 0);
      if (masteryDiff !== 0) return masteryDiff;
      
      // Then by last reviewed (older first)
      const aReviewed = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0;
      const bReviewed = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0;
      return aReviewed - bReviewed;
    });
    
    setReviewWords(wordsToReview);
    setSessionStats(prev => ({ ...prev, total: wordsToReview.length }));
  }, [progress.savedWords]);

  const currentWord = reviewWords[currentIndex];

  // Calculate new mastery level based on quality response
  const calculateNewMastery = (currentLevel: number, quality: number): 0 | 1 | 2 | 3 | 4 | 5 => {
    if (quality < 2) {
      // Incorrect - decrease mastery
      return Math.max(0, currentLevel - 1) as 0 | 1 | 2 | 3 | 4 | 5;
    } else if (quality >= 4) {
      // Easy - increase mastery
      return Math.min(5, currentLevel + 1) as 0 | 1 | 2 | 3 | 4 | 5;
    }
    // Medium - keep same level
    return currentLevel as 0 | 1 | 2 | 3 | 4 | 5;
  };

  const handleResponse = (quality: number) => {
    if (!currentWord) return;

    const currentMastery = currentWord.masteryLevel || 0;
    const newMastery = calculateNewMastery(currentMastery, quality);
    
    // Update mastery in store
    updateWordMastery(currentWord.word, newMastery);

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      incorrect: quality < 3 ? prev.incorrect + 1 : prev.incorrect,
    }));

    // Move to next word
    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setIsComplete(true);
    }
  };

  const handlePronounce = () => {
    if (currentWord) {
      pronounceWord(currentWord.word);
    }
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(false);
    setSessionStats({
      total: reviewWords.length,
      correct: 0,
      incorrect: 0,
      reviewed: 0,
    });
  };

  // No words to review
  if (reviewWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="bg-white rounded-2xl p-12 shadow-sm">
            <div className="text-6xl mb-4">�</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Chưa có từ vựng nào!</h1>
            <p className="text-gray-500 mb-6">Hãy lưu từ vựng khi đọc truyện để bắt đầu ôn tập</p>
            <Link 
              href="/stories" 
              className="inline-block px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
            >
              Đọc truyện ngay
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Session complete
  if (isComplete) {
    const accuracy = sessionStats.reviewed > 0 
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) 
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-6xl mb-4">🦋</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Hoàn thành!</h1>
            <p className="text-gray-500 mb-6">Bạn đã ôn tập xong {sessionStats.reviewed} từ</p>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-green-600">{sessionStats.correct}</div>
                <div className="text-sm text-green-600">Đúng</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-red-600">{sessionStats.incorrect}</div>
                <div className="text-sm text-red-600">Cần ôn lại</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-purple-600">{accuracy}%</div>
                <div className="text-sm text-purple-600">Độ chính xác</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <button 
                onClick={restartSession}
                className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
              >
                🔄 Ôn tập lại
              </button>
              <Link 
                href="/progress" 
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                ← Quay lại
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const masteryInfo = MASTERY_LABELS[currentWord?.masteryLevel || 0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/progress" className="text-gray-500 hover:text-gray-700">
            ← Quay lại
          </Link>
          <div className="text-sm text-gray-500">
            {currentIndex + 1} / {reviewWords.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
            style={{ width: `${((currentIndex + 1) / reviewWords.length) * 100}%` }}
          />
        </div>

        {/* Flashcard */}
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative w-full aspect-[3/2] cursor-pointer perspective-1000 mb-8`}
        >
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front */}
            <div className={`absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 flex flex-col items-center justify-center backface-hidden shadow-xl ${isFlipped ? 'invisible' : ''}`}>
              <div className="text-white/50 text-sm mb-2">Từ vựng</div>
              <h2 className="text-4xl font-bold text-white mb-4">{currentWord?.word}</h2>
              <button 
                onClick={(e) => { e.stopPropagation(); handlePronounce(); }}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🎵 Nghe phát âm
              </button>
              <div className="absolute bottom-4 text-white/50 text-sm">
                Nhấp để xem nghĩa
              </div>
            </div>

            {/* Back */}
            <div className={`absolute inset-0 bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow-xl ${!isFlipped ? 'invisible' : ''}`} style={{ transform: 'rotateY(180deg)' }}>
              <div className="text-gray-400 text-sm mb-2">Nghĩa tiếng Việt</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{currentWord?.vi}</h2>
              {currentWord?.ipa && (
                <p className="text-gray-400 text-lg mb-4">/{currentWord.ipa}/</p>
              )}
              {currentWord?.exampleSentence && (
                <p className="text-gray-500 italic text-center">"{currentWord.exampleSentence}"</p>
              )}
              <div className={`mt-4 px-3 py-1 rounded-full text-sm bg-${masteryInfo.color}-100 text-${masteryInfo.color}-600`}>
                {masteryInfo.emoji} {masteryInfo.label}
              </div>
            </div>
          </div>
        </div>

        {/* Response buttons - only show when flipped */}
        {isFlipped && (
          <div className="space-y-4">
            <p className="text-center text-gray-500 mb-4">Bạn nhớ từ này như thế nào?</p>
            <div className="grid grid-cols-5 gap-2">
              {QUALITY_RESPONSES.map((response) => (
                <button
                  key={response.quality}
                  onClick={() => handleResponse(response.quality)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl bg-gradient-to-br ${response.color} text-white hover:scale-105 transition-transform`}
                >
                  <span className="text-2xl">{response.emoji}</span>
                  <span className="text-xs font-medium">{response.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Session stats */}
        <div className="mt-8 flex justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Đúng: {sessionStats.correct}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-gray-600">Sai: {sessionStats.incorrect}</span>
          </div>
        </div>
      </main>

      {/* Custom CSS for 3D flip */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
