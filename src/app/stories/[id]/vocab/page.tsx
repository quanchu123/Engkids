'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getStoryById } from '@/data/stories';
import { useAppStore } from '@/store/useAppStore';
import { lookupWord, pronounceWord, WordInfo } from '@/services/dictionary';

interface PageProps {
  params: { id: string };
}

export default function VocabPage({ params }: PageProps) {
  const { id } = params;
  const story = getStoryById(id);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [wordInfoMap, setWordInfoMap] = useState<Map<string, WordInfo>>(new Map());
  
  const { saveWord, unsaveWord, isWordSaved } = useAppStore();

  // Extract unique vocabulary from story - memoized to prevent infinite loop
  const vocabulary = useMemo(() => story ? getUniqueVocabulary(story) : [], [story]);

  // Preload word info with proper dependency
  useEffect(() => {
    let isMounted = true;
    
    async function loadWordInfo() {
      for (const word of vocabulary) {
        if (!isMounted) break;
        if (!wordInfoMap.has(word.word)) {
          const info = await lookupWord(word.word);
          if (info && isMounted) {
            setWordInfoMap(prev => new Map(prev).set(word.word, info));
          }
        }
      }
    }
    
    if (vocabulary.length > 0) {
      loadWordInfo();
    }
    
    return () => {
      isMounted = false;
    };
  }, [vocabulary.length]); // Use vocabulary.length instead of vocabulary to prevent infinite loop

  const currentWord = vocabulary[currentIndex];
  const currentWordInfo = currentWord ? wordInfoMap.get(currentWord.word) : null;

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        setIsFlipped(false);
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < vocabulary.length - 1) {
        setIsFlipped(false);
        return prev + 1;
      }
      return prev;
    });
  }, [vocabulary.length]);

  const handlePronounce = useCallback(() => {
    if (currentWord) {
      pronounceWord(currentWord.word, currentWordInfo?.audioUrl);
    }
  }, [currentWord, currentWordInfo]);

  const handleToggleSave = useCallback(() => {
    if (!currentWord || !story) return;
    
    if (isWordSaved(currentWord.word)) {
      unsaveWord(currentWord.word);
    } else {
      saveWord(
        currentWord.word,
        currentWord.vi,
        false,
        currentWordInfo?.ipa || '',
        story.id,
      );
    }
  }, [currentWord, story, isWordSaved, saveWord, unsaveWord, currentWordInfo]);

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🦄</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Không tìm thấy truyện</h1>
          <Link href="/stories" className="text-blue-500 hover:underline">
            ← Quay lại thư viện
          </Link>
        </div>
      </div>
    );
  }

  if (vocabulary.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Không có từ vựng</h1>
          <Link href={`/stories/${id}/games`} className="text-blue-500 hover:underline">
            Chơi game →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between">
          <Link href={`/stories/${id}`} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Truyện
          </Link>
          <h1 className="font-bold text-gray-800 text-sm">🃏 Flashcards</h1>
          <Link 
            href={`/stories/${id}/games`}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-full text-xs font-semibold"
          >
            Game →
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 py-4">
        <div className="w-full max-w-sm">
          {/* Progress */}
          <p className="text-center text-gray-500 text-sm mb-3">
            Từ {currentIndex + 1}/{vocabulary.length}
          </p>

          {/* Flashcard */}
          <div 
            className={`flashcard cursor-pointer mb-4 ${isFlipped ? 'flipped' : ''}`}
            onClick={handleFlip}
          >
            <div className="flashcard-inner relative" style={{ minHeight: '200px' }}>
              {/* Front - English */}
              <div className="flashcard-front absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 flex flex-col items-center justify-center text-white shadow-lg">
                <p className="text-3xl font-bold mb-1">{currentWord.word}</p>
                {currentWordInfo?.ipa && (
                  <p className="text-white/70 text-base">{currentWordInfo.ipa}</p>
                )}
                <p className="text-white/50 text-xs mt-3">👆 Bấm để lật</p>
              </div>
              
              {/* Back - Vietnamese */}
              <div className="flashcard-back absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 flex flex-col items-center justify-center text-white shadow-lg">
                <p className="text-2xl font-bold mb-1">{currentWord.vi}</p>
                {currentWordInfo?.definitions && currentWordInfo.definitions[0] && (
                  <p className="text-white/80 text-center text-xs mt-2">
                    {currentWordInfo.definitions[0]}
                  </p>
                )}
                <p className="text-white/50 text-xs mt-3">👆 Bấm để lật</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handlePronounce}
              className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium text-sm transition-colors"
            >
              🎵 Phát âm
            </button>
            <button
              onClick={handleToggleSave}
              className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                isWordSaved(currentWord.word)
                  ? 'bg-red-50 hover:bg-red-100 text-red-600'
                  : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600'
              }`}
            >
              {isWordSaved(currentWord.word) ? '💔 Bỏ lưu' : '💖 Lưu từ'}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                currentIndex === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white shadow-md hover:shadow-lg text-gray-700'
              }`}
            >
              ← Trước
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === vocabulary.length - 1}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                currentIndex === vocabulary.length - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-md hover:shadow-lg'
              }`}
            >
              Tiếp →
            </button>
          </div>

          {/* Go to games button */}
          {currentIndex === vocabulary.length - 1 && (
            <Link
              href={`/stories/${id}/games`}
              className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-md hover:shadow-lg transition-all text-center block"
            >
              � Chơi game ôn tập!
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper function to extract unique vocabulary
function getUniqueVocabulary(story: ReturnType<typeof getStoryById>) {
  if (!story) return [];
  
  const vocabMap = new Map<string, { word: string; vi: string }>();
  
  // From games.match
  story.games.match.forEach(item => {
    vocabMap.set(item.word.toLowerCase(), { word: item.word, vi: item.vi });
  });
  
  // From panels tokens
  story.panels.forEach(panel => {
    panel.tokens.forEach(token => {
      if (token.vi && !vocabMap.has(token.norm.toLowerCase())) {
        vocabMap.set(token.norm.toLowerCase(), { 
          word: token.norm, 
          vi: token.vi 
        });
      }
    });
  });
  
  return Array.from(vocabMap.values());
}
