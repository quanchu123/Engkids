'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAllStories, clearStoriesCache } from '@/data/stories';
import { useAppStore } from '@/store/useAppStore';
import { Token, Panel, Story } from '@/types';
import { lookupWord, pronounceWord, speakWord, WordInfo } from '@/services/dictionary';
import { translateToVietnamese } from '@/services/translate';
import { isImageUrl, isBase64Image } from '@/services/image';
import { useSmartPopup, WordData } from '@/components/SmartPopup';

interface PageProps {
  params: { id: string };
}

export default function StoryReaderPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Keep old popup for single word click with dictionary lookup
  const [selectedWord, setSelectedWord] = useState<Token | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [vietnameseWord, setVietnameseWord] = useState<string>('');
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  const [currentPanel, setCurrentPanel] = useState(0);

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

  // Smart popup for text selection (LLM translation + grammar)
  const handleSaveWordFromAI = useCallback((wordData: WordData) => {
    saveWord(
      wordData.word,
      wordData.meaning_vi,
      false,
      wordData.pronunciation || '',
      story?.id || '',
    );
  }, [saveWord, story?.id]);

  const { PopupComponents } = useSmartPopup(handleSaveWordFromAI);

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

  // Handle word click - lookup from Dictionary API + Translation
  const handleWordClick = useCallback(async (token: Token) => {
    setSelectedWord(token);
    setShowPopup(true);
    setIsLoadingWord(true);
    setWordInfo(null);
    setVietnameseWord('');
    
    // Lookup word from dictionary API
    const cleanWord = (token.norm || token.display).replace(/[.,!?'"]/g, '').toLowerCase();
    
    // Fetch both dictionary and translation in parallel
    const [info, translation] = await Promise.all([
      lookupWord(cleanWord),
      translateToVietnamese(cleanWord)
    ]);
    
    setWordInfo(info);
    setVietnameseWord(translation.success ? translation.vietnamese : '');
    setIsLoadingWord(false);
  }, []);

  // Close popup
  const closePopup = useCallback(() => {
    setShowPopup(false);
    setSelectedWord(null);
    setWordInfo(null);
    setVietnameseWord('');
  }, []);

  // Keyboard navigation - ESC to close popup, Arrow keys for panels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPopup) closePopup();
      }
      if (story && !showPopup) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setCurrentPanel(p => Math.min(p + 1, story.panels.length - 1));
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setCurrentPanel(p => Math.max(p - 1, 0));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPopup, closePopup, story]);

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
      saveWord(
        word,
        selectedWord.vi || '',
        false,
        wordInfo?.ipa || '',
        story?.id || '',
      );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 via-white to-amber-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">�</div>
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
          <div className="text-6xl mb-4">🦄</div>
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
      ? 'w-full aspect-[4/3]' 
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

  // Render English sentence with clickable tokens - ALL words clickable
  const renderEnglishSentence = (panel: Panel) => {
    return (
      <p className="text-lg md:text-xl leading-relaxed">
        {panel.tokens.map((token, index) => {
          // Tất cả từ có chữ cái đều clickable (tra từ điển API)
          const isWord = /[a-zA-Z]/.test(token.display);
          
          return (
            <span key={index}>
              {isWord ? (
                <button
                  type="button"
                  onClick={() => handleWordClick(token)}
                  className={`cursor-pointer inline-block px-1 py-0.5 mx-0.5 transition-all duration-150 rounded ${
                    selectedWord?.display === token.display
                      ? 'bg-[#B2DFDB] text-[#004D40] font-semibold'
                      : 'text-gray-800 hover:bg-[#FFF59D]/70'
                  }`}
                >
                  {token.display}
                </button>
              ) : (
                <span className="text-gray-700">{token.display}</span>
              )}
              {index < panel.tokens.length - 1 && ' '}
            </span>
          );
        })}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E9] via-[#FFF9C4] to-[#FCE4EC]">
      {/* Compact Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-[#B2DFDB]">
        <div className="max-w-6xl mx-auto px-2 py-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <Link 
              href="/stories" 
              className="flex items-center gap-1 px-2 py-1 bg-[#B2DFDB] hover:bg-[#80CBC4] rounded-full text-gray-700 hover:text-gray-900 transition-all text-xs font-semibold"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </Link>
            
            <div className="text-center flex-1 px-1">
              <div className="inline-block bg-gradient-to-r from-[#80CBC4] to-[#F8BBD0] rounded-full px-3 py-0.5 shadow-sm">
                <h1 className="text-xs md:text-sm font-bold text-white drop-shadow">
                  {story.title_en}
                </h1>
                <p className="text-[10px] text-white/90 font-medium leading-tight">{story.title_vi}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Link
                href={`/stories/${story.id}/vocab`}
                className="px-2 py-1 bg-gradient-to-r from-[#FFF59D] to-[#FFF176] text-gray-800 rounded-full text-xs font-semibold hover:shadow-sm transition-all hover:scale-105"
              >
                �
                <span className="hidden sm:inline ml-0.5 text-[10px]">Vocab</span>
              </Link>
              <Link
                href={`/stories/${story.id}/games`}
                className="px-2 py-1 bg-gradient-to-r from-[#F8BBD0] to-[#F48FB1] text-white rounded-full text-xs font-semibold hover:shadow-sm transition-all hover:scale-105"
              >
                �
                <span className="hidden sm:inline ml-0.5 text-[10px]">Game</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Story Content */}
      <main className="max-w-7xl mx-auto px-3 py-3">
        {/* Panel Indicator Dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {story.panels.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPanel(idx)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                idx === currentPanel
                  ? 'bg-gradient-to-r from-[#00897B] to-[#F48FB1] scale-125 shadow-md'
                  : idx <= currentPanel
                    ? 'bg-[#80CBC4]'
                    : 'bg-gray-300'
              }`}
              aria-label={`Panel ${idx + 1}`}
            />
          ))}
        </div>

        {/* Single Panel View */}
        {(() => {
          const panel = story.panels[currentPanel];
          const index = currentPanel;
          return (
            <div className="relative">
              {/* Gamification Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-[#F8BBD0] via-[#FFF59D] to-[#B2DFDB] rounded-full px-6 py-2 shadow-xl border-4 border-white">
                  <span className="font-black text-lg text-gray-800">Panel {index + 1}/{story.panels.length}</span>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                
                {/* LEFT COLUMN - English + Image */}
                <div className="bg-gradient-to-br from-[#E0F2F1] to-[#B2DFDB] rounded-3xl p-6 shadow-2xl border-4 border-white hover:scale-[1.02] transition-transform duration-300">
                  {/* English Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-white/80 rounded-full px-4 py-2 shadow-md">
                      <span className="font-black text-[#00897B] text-sm">English</span>
                    </div>
                    <button
                      onClick={() => speakWord(panel.sentence_en)}
                      className="bg-gradient-to-r from-[#FFF59D] to-[#FFF176] hover:from-[#FFF176] hover:to-[#FFEE58] text-gray-800 px-4 py-2 rounded-full font-bold text-xs shadow-lg hover:shadow-xl transition-all hover:scale-110"
                    >
                      🎵 Listen
                    </button>
                  </div>

                  {/* Image with decorative frame - Full Width */}
                  <div className="mb-4 relative w-full">
                    <div className="absolute -inset-2 bg-gradient-to-br from-[#FFF59D] via-[#F8BBD0] to-[#B2DFDB] rounded-2xl opacity-50 blur-lg"></div>
                    <div className="relative bg-white p-2 rounded-2xl shadow-xl w-full">
                      {renderPanelImage(panel, index, 'large')}
                    </div>
                  </div>

                  {/* English Sentence */}
                  <div className="bg-white/90 rounded-2xl p-5 shadow-inner border-2 border-[#80CBC4]">
                    <div className="text-base md:text-lg font-semibold leading-relaxed mb-3">
                      {renderEnglishSentence(panel)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#00897B] font-bold bg-[#E0F2F1] rounded-lg px-3 py-2">
                      <span className="text-lg">🐙</span>
                      <span>Click any word to learn!</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN - Vietnamese */}
                <div className="bg-gradient-to-br from-[#FCE4EC] to-[#F8BBD0] rounded-3xl p-6 shadow-2xl border-4 border-white hover:scale-[1.02] transition-transform duration-300">
                  {/* Vietnamese Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-white/80 rounded-full px-4 py-2 shadow-md">
                      <span className="font-black text-[#C2185B] text-sm">Tiếng việt</span>
                    </div>
                    <button
                      onClick={() => speakWord(panel.sentence_vi)}
                      className="bg-gradient-to-r from-[#F8BBD0] to-[#F48FB1] hover:from-[#F48FB1] hover:to-[#EC407A] text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg hover:shadow-xl transition-all hover:scale-110"
                    >
                      🎵 Nghe
                    </button>
                  </div>

                  {/* Image with decorative frame - Full Width */}
                  <div className="mb-4 relative w-full">
                    <div className="absolute -inset-2 bg-gradient-to-br from-[#F8BBD0] via-[#FFF59D] to-[#B2DFDB] rounded-2xl opacity-50 blur-lg"></div>
                    <div className="relative bg-white p-2 rounded-2xl shadow-xl w-full">
                      {renderPanelImage(panel, index, 'large')}
                    </div>
                  </div>

                  {/* Vietnamese Translation */}
                  <div className="bg-white/90 rounded-2xl p-5 shadow-inner border-2 border-[#F48FB1]">
                    <p className="text-base md:text-lg font-semibold text-gray-800 text-center leading-relaxed mb-3">
                      {panel.sentence_vi}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-[#C2185B] font-bold bg-[#FCE4EC] rounded-lg px-3 py-2">
                      <span className="text-lg">🌟</span>
                      <span>Bản dịch tiếng Việt</span>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute top-8 right-8 text-5xl opacity-20">
                    🌸
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6 mb-4 max-w-3xl mx-auto">
          <button
            onClick={() => setCurrentPanel(p => Math.max(p - 1, 0))}
            disabled={currentPanel === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base transition-all border-4 border-white shadow-lg ${
              currentPanel === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#B2DFDB] to-[#80CBC4] text-gray-800 hover:shadow-xl hover:scale-105 active:scale-95'
            }`}
          >
            ← Trang trước
          </button>

          <span className="font-black text-gray-600 text-sm bg-white/80 px-4 py-2 rounded-full shadow">
            {currentPanel + 1} / {story.panels.length}
          </span>

          {currentPanel < story.panels.length - 1 ? (
            <button
              onClick={() => setCurrentPanel(p => Math.min(p + 1, story.panels.length - 1))}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base bg-gradient-to-r from-[#F8BBD0] to-[#F48FB1] text-white hover:shadow-xl hover:scale-105 active:scale-95 transition-all border-4 border-white shadow-lg"
            >
              Trang sau →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-base bg-gradient-to-r from-[#FFF59D] to-[#FFF176] text-gray-800 hover:shadow-xl hover:scale-105 active:scale-95 transition-all border-4 border-white shadow-lg animate-pulse"
            >
              🏆 Hoàn thành!
            </button>
          )}
        </div>

        {/* Completion Card - Gamification Style - Only on last page */}
        {currentPanel === story.panels.length - 1 && (
        <div className="mt-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#B2DFDB] via-[#FFF59D] to-[#F8BBD0] rounded-3xl blur-xl opacity-50"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-[#80CBC4]">
            <div className="p-6 md:p-8 text-center">
              {/* Trophy Animation */}
              <div className="text-7xl mb-4 animate-bounce inline-block">
                �
              </div>
              <div className="flex justify-center gap-2 mb-4">
                <span className="text-4xl animate-pulse">🌟</span>
                <span className="text-4xl animate-pulse delay-100">🌟</span>
                <span className="text-4xl animate-pulse delay-200">🌟</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00897B] via-[#C2185B] to-[#F9A825] mb-3">
                HOÀN THÀNH XUẤT SẮC!
              </h2>
              <p className="text-gray-600 text-base font-bold mb-6 max-w-md mx-auto">
                Bạn đã đọc xong truyện! Hãy tiếp tục học từ vựng và chơi game nhé! 🐙
              </p>
              
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleComplete}
                  className="px-6 py-3 rounded-full font-black text-base bg-gradient-to-r from-[#FFF59D] to-[#FFF176] text-gray-800 shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center gap-2 border-4 border-white"
                >
                  <span className="text-2xl">�</span>
                  Học từ vựng
                </button>
                <Link
                  href={`/stories/${story.id}/games`}
                  className="px-6 py-3 rounded-full font-black text-base bg-gradient-to-r from-[#F8BBD0] to-[#F48FB1] text-white shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center gap-2 border-4 border-white"
                >
                  <span className="text-2xl">�</span>
                  Chơi game
                </Link>
                <Link
                  href="/stories"
                  className="px-6 py-3 rounded-full font-black text-base bg-gradient-to-r from-[#B2DFDB] to-[#80CBC4] text-gray-800 shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center gap-2 border-4 border-white"
                >
                  <span className="text-2xl">🦄</span>
                  Truyện khác
                </Link>
              </div>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Word Popup - Compact & Beautiful */}
      {showPopup && selectedWord && (
        <div 
          className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4"
          onClick={closePopup}
        >
          <div 
            className="bg-white rounded-2xl w-72 shadow-xl overflow-hidden animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedWord.display}</h3>
                {wordInfo?.ipa && (
                  <p className="text-white/80 text-xs">/{wordInfo.ipa}/</p>
                )}
              </div>
              <button 
                onClick={closePopup} 
                className="w-6 h-6 bg-white/20 rounded-full text-white text-sm hover:bg-white/30"
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="p-3 space-y-2">
              {isLoadingWord ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  {/* Vietnamese */}
                  {vietnameseWord && (
                    <div className="bg-pink-50 rounded-xl px-3 py-2 border border-pink-100">
                      <p className="text-[10px] text-pink-400 font-semibold uppercase">Tiếng Việt</p>
                      <p className="text-lg font-bold text-gray-800">{vietnameseWord}</p>
                    </div>
                  )}
                  
                  {/* Definition */}
                  {wordInfo?.definitions?.[0] && (
                    <div className="bg-blue-50 rounded-xl px-3 py-2 border border-blue-100">
                      <p className="text-[10px] text-blue-400 font-semibold uppercase">Definition</p>
                      <p className="text-sm text-gray-700 leading-snug">{wordInfo.definitions[0]}</p>
                    </div>
                  )}

                  {/* Examples */}
                  {wordInfo?.examples && wordInfo.examples.length > 0 && (
                    <div className="bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                      <p className="text-[10px] text-amber-500 font-semibold uppercase mb-1">Ví dụ</p>
                      <div className="space-y-1">
                        {wordInfo.examples.slice(0, 2).map((ex, i) => (
                          <p key={i} className="text-xs text-gray-600 italic leading-snug">• {ex}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!wordInfo && !vietnameseWord && (
                    <p className="text-center text-gray-400 text-sm py-2">Không tìm thấy</p>
                  )}
                </>
              )}
              
              {/* Pronounce Button */}
              <button
                onClick={() => handlePronounce(selectedWord.display, wordInfo?.audioUrl)}
                className="w-full py-2.5 bg-gradient-to-r from-[#11998e] to-[#38ef7d] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                🎵 Nghe phát âm
              </button>
              
              {/* Save Word Button */}
              <button
                onClick={handleToggleSaveWord}
                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
                  isWordSaved(selectedWord.norm || selectedWord.display)
                    ? 'bg-pink-100 text-pink-600 border-2 border-pink-300'
                    : 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white'
                }`}
              >
                {isWordSaved(selectedWord.norm || selectedWord.display) ? '💖 Đã lưu' : '⭐ Lưu từ vựng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Popup - LLM Translation & Grammar (Draggable) */}
      {PopupComponents}
    </div>
  );
}
