'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAllStories, clearStoriesCache } from '@/data/stories';
import { useAppStore } from '@/store/useAppStore';
import { Token, Panel, Story } from '@/types';
import { lookupWord, pronounceWord, speakWord, WordInfo } from '@/services/dictionary';
import { isImageUrl, isBase64Image } from '@/services/image';

interface PageProps {
  params: { id: string };
}

export default function StoryReaderPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedWord, setSelectedWord] = useState<Token | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  const { 
    settings, 
    toggleVietnamese, 
    markPanelViewed, 
    completeStory,
    saveWord,
    unsaveWord,
    isWordSaved,
    updateStreak
  } = useAppStore();

  // Load story on mount
  useEffect(() => {
    const loadStory = async () => {
      setIsLoading(true);
      clearStoriesCache(); // Force fresh data
      const allStories = await getAllStories();
      const foundStory = allStories.find(s => s.id === id);
      setStory(foundStory || null);
      setIsLoading(false);
    };
    loadStory();
  }, [id]);

  // Update streak on mount
  useEffect(() => {
    updateStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark all panels as viewed on mount
  useEffect(() => {
    if (story) {
      story.panels.forEach(panel => {
        markPanelViewed(story.id, panel.panel_id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  // Handle word click
  const handleWordClick = useCallback(async (token: Token) => {
    if (!token.vi) return; // Non-clickable word
    
    setSelectedWord(token);
    setShowPopup(true);
    setIsLoadingWord(true);
    setWordInfo(null);
    
    // Lookup word from dictionary API
    const info = await lookupWord(token.norm || token.display);
    setWordInfo(info);
    setIsLoadingWord(false);
  }, []);

  // Close popup
  const closePopup = useCallback(() => {
    setShowPopup(false);
    setSelectedWord(null);
    setWordInfo(null);
  }, []);

  // Pronounce word/sentence
  const handlePronounce = useCallback((text: string, audioUrl?: string | null) => {
    pronounceWord(text, audioUrl);
  }, []);

  // Handle story completion
  const handleComplete = () => {
    if (story) {
      completeStory(story.id, 1);
      router.push(`/stories/${story.id}/vocab`);
    }
  };

  // Save/unsave word
  const handleToggleSaveWord = () => {
    if (!selectedWord) return;
    
    const word = selectedWord.norm || selectedWord.display;
    if (isWordSaved(word)) {
      unsaveWord(word);
    } else {
      saveWord({
        word,
        vi: selectedWord.vi || '',
        ipa: wordInfo?.ipa || '',
        savedAt: new Date().toISOString(),
        storyId: story?.id || '',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 via-white to-amber-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📚</div>
          <h1 className="text-xl font-bold text-gray-700 mb-2">Đang tải truyện...</h1>
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-blue-500 animate-pulse rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 via-white to-amber-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-4">Không tìm thấy truyện</h1>
          <p className="text-gray-500 mb-4">Truyện có thể đã bị xóa hoặc không tồn tại.</p>
          <Link href="/stories" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors">
            ← Quay lại thư viện
          </Link>
        </div>
      </div>
    );
  }

  // Render image for a panel
  const renderPanelImage = (panel: Panel, index: number, size: 'small' | 'large' = 'large') => {
    const imageStr = panel.image;
    const sizeClass = size === 'large' 
      ? 'w-full max-w-[320px] aspect-[4/3]' 
      : 'w-24 h-24 md:w-32 md:h-32';
    
    // Base64 image
    if (isBase64Image(imageStr)) {
      return (
        <div className={`relative ${sizeClass} rounded-2xl overflow-hidden shadow-xl ring-4 ring-white`}>
          <img
            src={imageStr}
            alt={panel.image_alt || `Panel ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    
    // URL image
    if (isImageUrl(imageStr)) {
      return (
        <div className={`relative ${sizeClass} rounded-2xl overflow-hidden shadow-xl ring-4 ring-white`}>
          <Image
            src={imageStr}
            alt={panel.image_alt || `Panel ${index + 1}`}
            fill
            className="object-cover"
            priority={index < 2}
          />
        </div>
      );
    }
    
    // Emoji or text fallback
    return (
      <div className={`${sizeClass} flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-2xl shadow-xl ring-4 ring-white`}>
        <span className={size === 'large' ? 'text-7xl' : 'text-4xl'}>{imageStr || '🖼️'}</span>
      </div>
    );
  };

  // Render English sentence with clickable tokens
  const renderEnglishSentence = (panel: Panel) => (
    <p className="text-lg md:text-xl leading-relaxed font-medium">
      {panel.tokens.map((token, index) => (
        <span key={index}>
          {token.vi ? (
            <button
              onClick={() => handleWordClick(token)}
              className="word-clickable text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md px-1 py-0.5 transition-all duration-200 underline decoration-blue-300 decoration-2 underline-offset-4 hover:decoration-blue-500"
            >
              {token.display}
            </button>
          ) : (
            <span className="text-gray-700">{token.display}</span>
          )}
          {index < panel.tokens.length - 1 && ' '}
        </span>
      ))}
    </p>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* Floating Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b border-white/50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              href="/stories" 
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 hover:text-gray-800 transition-all text-sm font-medium"
            >
              <span>←</span>
              <span className="hidden sm:inline">Thư viện</span>
            </Link>
            
            <div className="text-center flex-1 px-4">
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {story.title_en}
              </h1>
              <p className="text-xs md:text-sm text-gray-500">{story.title_vi}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href={`/stories/${story.id}/vocab`}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                📚 Từ vựng
              </Link>
              <Link
                href={`/stories/${story.id}/games`}
                className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-medium shadow-md hover:shadow-lg transition-all hover:scale-105"
              >
                🎮 Game
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Story Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Story Panels */}
        <div className="space-y-6">
          {story.panels.map((panel, index) => (
            <div 
              key={panel.panel_id}
              className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Panel Header with Number */}
              <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg shadow-inner">
                      {index + 1}
                    </span>
                    <span className="text-white/90 text-sm font-medium">
                      Panel {index + 1} / {story.panels.length}
                    </span>
                  </div>
                  <button
                    onClick={() => speakWord(panel.sentence_en)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full text-white text-sm font-medium transition-all"
                  >
                    🔊 Nghe phát âm
                  </button>
                </div>
              </div>

              {/* Main Content - Image Center, Text Both Sides */}
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                  
                  {/* English Side */}
                  <div className="order-2 lg:order-1">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-100 h-full">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🇬🇧</span>
                        <span className="font-bold text-blue-700">English</span>
                      </div>
                      {renderEnglishSentence(panel)}
                      <p className="text-xs text-blue-400 mt-3 italic">
                        💡 Click vào từ để xem nghĩa
                      </p>
                    </div>
                  </div>

                  {/* Center Image */}
                  <div className="order-1 lg:order-2 flex justify-center">
                    <div className="relative">
                      {/* Decorative background */}
                      <div className="absolute -inset-4 bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 rounded-3xl blur-xl opacity-50"></div>
                      {renderPanelImage(panel, index, 'large')}
                    </div>
                  </div>

                  {/* Vietnamese Side */}
                  <div className="order-3">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-100 h-full">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">🇻🇳</span>
                        <span className="font-bold text-amber-700">Tiếng Việt</span>
                      </div>
                      <p className="text-lg md:text-xl leading-relaxed text-gray-700 font-medium">
                        {panel.sentence_vi}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completion Card */}
        <div className="mt-10 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 md:p-12 text-center text-white">
            <div className="text-7xl mb-6 animate-bounce">🎉</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Tuyệt vời! Bạn đã đọc xong!
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
              Hãy ôn tập từ vựng hoặc chơi game để ghi nhớ tốt hơn nhé!
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleComplete}
                className="px-8 py-4 rounded-2xl font-bold text-lg bg-white text-green-600 shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center gap-2"
              >
                <span className="text-2xl">📚</span>
                Học từ vựng
              </button>
              <Link
                href={`/stories/${story.id}/games`}
                className="px-8 py-4 rounded-2xl font-bold text-lg bg-white/20 backdrop-blur text-white border-2 border-white/30 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:bg-white/30 flex items-center gap-2"
              >
                <span className="text-2xl">🎮</span>
                Chơi game
              </Link>
              <Link
                href="/stories"
                className="px-8 py-4 rounded-2xl font-bold text-lg bg-white/10 backdrop-blur text-white border-2 border-white/20 shadow-xl hover:shadow-2xl transition-all hover:scale-105 hover:bg-white/20 flex items-center gap-2"
              >
                <span className="text-2xl">📖</span>
                Truyện khác
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Word Popup */}
      {showPopup && selectedWord && (
        <div 
          className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={closePopup}
        >
          <div 
            className="word-popup bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{selectedWord.display}</h3>
                <button onClick={closePopup} className="text-white/80 hover:text-white text-2xl">
                  ×
                </button>
              </div>
              {wordInfo?.ipa && (
                <p className="text-white/80">{wordInfo.ipa}</p>
              )}
            </div>
            
            <div className="p-4">
              {/* Vietnamese meaning */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Tiếng Việt</p>
                <p className="text-xl font-semibold text-gray-800">{selectedWord.vi}</p>
              </div>
              
              {/* Dictionary definitions */}
              {isLoadingWord ? (
                <div className="space-y-2">
                  <div className="skeleton h-4 rounded w-3/4"></div>
                  <div className="skeleton h-4 rounded w-1/2"></div>
                </div>
              ) : wordInfo?.definitions && wordInfo.definitions.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">
                    Định nghĩa ({wordInfo.partOfSpeech})
                  </p>
                  <ul className="text-gray-700 space-y-1">
                    {wordInfo.definitions.map((def: string, i: number) => (
                      <li key={i} className="text-sm">• {def}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handlePronounce(selectedWord.display, wordInfo?.audioUrl)}
                  className="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  🔊 Phát âm
                </button>
                <button
                  onClick={handleToggleSaveWord}
                  className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                    isWordSaved(selectedWord.norm || selectedWord.display)
                      ? 'bg-red-50 hover:bg-red-100 text-red-600'
                      : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600'
                  }`}
                >
                  {isWordSaved(selectedWord.norm || selectedWord.display) ? '💔 Bỏ lưu' : '❤️ Lưu từ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
