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

  // Render English sentence with clickable tokens
  const renderEnglishSentence = (panel: Panel) => (
    <p className="text-lg md:text-xl leading-relaxed font-medium">
      {panel.tokens.map((token, index) => (
        <span key={index}>
          {token.vi ? (
            <button
              onClick={() => handleWordClick(token)}
              className={`word-clickable inline-flex items-center gap-1 font-black rounded-lg px-3 py-1.5 transition-all duration-200 shadow-md hover:shadow-xl hover:scale-110 border-2 ${
                selectedWord?.display === token.display
                  ? 'text-white bg-[#00695C] border-[#004D40] scale-110'
                  : 'text-[#004D40] bg-[#B2DFDB] border-[#80CBC4] hover:bg-[#80CBC4] hover:border-[#00695C]'
              }`}
            >
              {token.display}
              <span className="text-xs">💡</span>
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
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E9] via-[#FFF9C4] to-[#FCE4EC]">
      {/* Floating Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b-4 border-[#B2DFDB]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              href="/stories" 
              className="flex items-center gap-2 px-4 py-2 bg-[#B2DFDB] hover:bg-[#80CBC4] rounded-full text-gray-700 hover:text-gray-900 transition-all text-sm font-bold shadow-md"
            >
              <span className="text-lg">←</span>
              <span className="hidden sm:inline">Thư viện</span>
            </Link>
            
            <div className="text-center flex-1 px-4">
              <div className="inline-block bg-gradient-to-r from-[#80CBC4] to-[#F8BBD0] rounded-full px-6 py-2 shadow-lg">
                <h1 className="text-lg md:text-xl font-black text-white drop-shadow-lg">
                  {story.title_en}
                </h1>
                <p className="text-xs md:text-sm text-white/90 font-semibold">{story.title_vi}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href={`/stories/${story.id}/vocab`}
                className="px-3 py-2 bg-gradient-to-r from-[#FFF59D] to-[#FFF176] text-gray-800 rounded-full text-xs font-bold shadow-md hover:shadow-xl transition-all hover:scale-110 border-2 border-[#FFF176]"
              >
                📚 Từ vựng
              </Link>
              <Link
                href={`/stories/${story.id}/games`}
                className="px-3 py-2 bg-gradient-to-r from-[#F8BBD0] to-[#F48FB1] text-white rounded-full text-xs font-bold shadow-md hover:shadow-xl transition-all hover:scale-110 border-2 border-white"
              >
                🎮 Game
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Story Content */}
      <main className="max-w-7xl mx-auto px-3 py-4">
        {/* Story Panels */}
        <div className="space-y-6">
          {story.panels.map((panel, index) => (
            <div 
              key={panel.panel_id}
              className="relative"
            >
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
                      🔊 Listen
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
                      <span className="text-lg">🎯</span>
                      <span>Click words with 💡 to learn!</span>
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
                      🔊 Nghe
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
                      <span className="text-lg">⭐</span>
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
          ))}
        </div>

        {/* Completion Card - Gamification Style */}
        <div className="mt-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#B2DFDB] via-[#FFF59D] to-[#F8BBD0] rounded-3xl blur-xl opacity-50"></div>
          <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-[#80CBC4]">
            <div className="p-6 md:p-8 text-center">
              {/* Trophy Animation */}
              <div className="text-7xl mb-4 animate-bounce inline-block">
                🏆
              </div>
              <div className="flex justify-center gap-2 mb-4">
                <span className="text-4xl animate-pulse">⭐</span>
                <span className="text-4xl animate-pulse delay-100">⭐</span>
                <span className="text-4xl animate-pulse delay-200">⭐</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00897B] via-[#C2185B] to-[#F9A825] mb-3">
                HOÀN THÀNH XUẤT SẮC!
              </h2>
              <p className="text-gray-600 text-base font-bold mb-6 max-w-md mx-auto">
                Bạn đã đọc xong truyện! Hãy tiếp tục học từ vựng và chơi game nhé! 🎯
              </p>
              
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleComplete}
                  className="px-6 py-3 rounded-full font-black text-base bg-gradient-to-r from-[#FFF59D] to-[#FFF176] text-gray-800 shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center gap-2 border-4 border-white"
                >
                  <span className="text-2xl">📚</span>
                  Học từ vựng
                </button>
                <Link
                  href={`/stories/${story.id}/games`}
                  className="px-6 py-3 rounded-full font-black text-base bg-gradient-to-r from-[#F8BBD0] to-[#F48FB1] text-white shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center gap-2 border-4 border-white"
                >
                  <span className="text-2xl">🎮</span>
                  Chơi game
                </Link>
                <Link
                  href="/stories"
                  className="px-6 py-3 rounded-full font-black text-base bg-gradient-to-r from-[#B2DFDB] to-[#80CBC4] text-gray-800 shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center gap-2 border-4 border-white"
                >
                  <span className="text-2xl">📖</span>
                  Truyện khác
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Word Popup - Pastel Gamification Style */}
      {showPopup && selectedWord && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={closePopup}
        >
          <div 
            className="word-popup bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border-4 border-[#B2DFDB] transform transition-all animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with pastel gradient */}
            <div className="bg-gradient-to-r from-[#B2DFDB] via-[#FFF59D] to-[#F8BBD0] p-5 relative">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-black text-gray-800 drop-shadow-sm">{selectedWord.display}</h3>
                  {wordInfo?.ipa && (
                    <p className="text-gray-700 font-semibold mt-1">{wordInfo.ipa}</p>
                  )}
                </div>
                <button 
                  onClick={closePopup} 
                  className="text-gray-800 hover:text-gray-600 text-3xl font-bold bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                >
                  ×
                </button>
              </div>
              {/* Decorative stars */}
              <div className="absolute top-2 right-16 text-2xl animate-pulse">⭐</div>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Vietnamese meaning with pastel background */}
              <div className="bg-gradient-to-r from-[#FCE4EC] to-[#F8BBD0] rounded-2xl p-4 border-2 border-[#F48FB1]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🇻🇳</span>
                  <p className="text-xs font-bold text-[#C2185B] uppercase">Nghĩa tiếng Việt</p>
                </div>
                <p className="text-2xl font-black text-gray-800">{selectedWord.vi}</p>
              </div>
              
              {/* Dictionary definitions */}
              {isLoadingWord ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded-full w-1/2 animate-pulse"></div>
                </div>
              ) : wordInfo?.definitions && wordInfo.definitions.length > 0 && (
                <div className="bg-gradient-to-r from-[#E0F2F1] to-[#B2DFDB] rounded-2xl p-4 border-2 border-[#80CBC4]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📖</span>
                    <p className="text-xs font-bold text-[#00897B] uppercase">
                      Định nghĩa ({wordInfo.partOfSpeech})
                    </p>
                  </div>
                  <ul className="text-gray-700 space-y-2">
                    {wordInfo.definitions.map((def: string, i: number) => (
                      <li key={i} className="text-sm font-semibold flex items-start gap-2">
                        <span className="text-[#00897B] mt-1">●</span>
                        <span>{def}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Action buttons with gamification style */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handlePronounce(selectedWord.display, wordInfo?.audioUrl)}
                  className="flex-1 py-3 bg-gradient-to-r from-[#FFF59D] to-[#FFF176] hover:from-[#FFF176] hover:to-[#FFEE58] text-gray-800 rounded-full font-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white"
                >
                  🔊 Phát âm
                </button>
                <button
                  onClick={handleToggleSaveWord}
                  className={`flex-1 py-3 rounded-full font-black transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white ${
                    isWordSaved(selectedWord.norm || selectedWord.display)
                      ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700'
                      : 'bg-gradient-to-r from-[#F8BBD0] to-[#F48FB1] text-white'
                  }`}
                >
                  {isWordSaved(selectedWord.norm || selectedWord.display) ? '✓ Đã lưu' : '❤️ Lưu từ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
