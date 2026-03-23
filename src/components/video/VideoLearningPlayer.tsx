'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, SubtitleCue } from '@/types';
import { lookupWord, WordInfo } from '@/services/dictionary';
import { translateToVietnamese } from '@/services/translate';
import { findCurrentCueIndex } from '@/lib/vtt-parser';
import { useAppStore } from '@/store/useAppStore';
import { useSmartPopup, WordData } from '@/components/SmartPopup';

interface VideoLearningPlayerProps {
  video: Video;
}

export default function VideoLearningPlayer({ video }: VideoLearningPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCue, setCurrentCue] = useState<SubtitleCue | null>(null);
  const [selectedWord, setSelectedWord] = useState<{ word: string; info: WordInfo | null } | null>(null);
  const [loadingWord, setLoadingWord] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const { saveWord, isWordSaved, unsaveWord } = useAppStore();

  // Smart popup for text selection (LLM translation + grammar)
  const handleSaveWordFromAI = useCallback((wordData: WordData) => {
    saveWord(
      wordData.word,
      wordData.meaning_vi,
      false,
      wordData.pronunciation || '',
      video.id,
    );
  }, [saveWord, video.id]);

  const { PopupComponents } = useSmartPopup(handleSaveWordFromAI);

  // Find current subtitle cue
  useEffect(() => {
    if (video.subtitles.length === 0) {
      setCurrentCue(null);
      return;
    }

    const idx = findCurrentCueIndex(video.subtitles, currentTime);
    setCurrentCue(idx >= 0 ? video.subtitles[idx] : null);
  }, [currentTime, video.subtitles]);

  // Initialize Bunny.net Stream player
  useEffect(() => {
    if (!video.bunnyVideoId) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    // Set default playback rate to 0.75 when iframe loads
    const setDefaultSpeed = () => {
      iframe.contentWindow?.postMessage({ event: 'playbackRate', value: 0.75 }, '*');
    };
    
    // Set speed after a short delay to ensure player is ready
    const speedTimer = setTimeout(setDefaultSpeed, 1000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data.event === 'timeupdate') {
        setCurrentTime(event.data.currentTime);
      } else if (event.data.event === 'play') {
        setIsPlaying(true);
        // Ensure speed stays at 0.75 when playing
        iframe.contentWindow?.postMessage({ event: 'playbackRate', value: 0.75 }, '*');
      } else if (event.data.event === 'pause') {
        setIsPlaying(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(speedTimer);
    };
  }, [video.bunnyVideoId]);

  // Handle word click
  const handleWordClick = async (word: string) => {
    // Clean word (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:"']/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;

    setLoadingWord(true);
    setSelectedWord({ word: cleanWord, info: null });

    try {
      // Lookup word definition
      const wordInfo = await lookupWord(cleanWord);
      
      // Get Vietnamese translation
      const viTranslation = await translateToVietnamese(cleanWord);
      if (viTranslation.success && wordInfo) {
        wordInfo.vietnamese = viTranslation.vietnamese;
      }

      setSelectedWord({ word: cleanWord, info: wordInfo });
    } catch (error) {
      console.error('Word lookup error:', error);
      setSelectedWord({
        word: cleanWord,
        info: {
          word: cleanWord,
          ipa: '',
          definitions: [`Could not find definition for "${cleanWord}"`],
          examples: [],
          vietnamese: '',
          audioUrl: null,
          partOfSpeech: '',
        },
      });
    } finally {
      setLoadingWord(false);
    }
  };

  // Control playback
  const togglePlay = () => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.contentWindow?.postMessage(
        isPlaying ? { event: 'pause' } : { event: 'play' },
        '*'
      );
    }
  };

  const seekTo = (seconds: number) => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.contentWindow?.postMessage({ event: 'seek', value: seconds }, '*');
    }
  };

  // Jump to subtitle cue
  const jumpToCue = (cue: SubtitleCue) => {
    seekTo(cue.startTime);
  };
  
  // Save/unsave word
  const handleToggleSaveWord = () => {
    if (!selectedWord) return;
    
    const word = selectedWord.word;
    if (isWordSaved(word)) {
      unsaveWord(word);
    } else {
      saveWord(
        word,
        selectedWord.info?.vietnamese || '',
        false,
        selectedWord.info?.ipa || '',
        video.id,
      );
    }
  };

  // Render clickable words
  const renderClickableText = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      if (/^\s+$/.test(word)) {
        return <span key={index}>{word}</span>;
      }
      
      // Check if it's a word (contains letters)
      if (/[a-zA-Z]/.test(word)) {
        return (
          <span
            key={index}
            onClick={() => handleWordClick(word)}
            className="cursor-pointer hover:bg-yellow-200 hover:underline transition-colors px-0.5 rounded"
          >
            {word}
          </span>
        );
      }
      
      return <span key={index}>{word}</span>;
    });
  };

  const getEmbedUrl = () => {
    const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || process.env.BUNNY_LIBRARY_ID;
    // Hide playback speed controls from the Bunny player interface
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${video.bunnyVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&playbackSpeed=false`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player + Subtitles */}
        <div className="lg:col-span-2">
          {/* Player */}
          <div className="bg-black rounded-lg overflow-hidden shadow-lg mb-4">
            <iframe
              ref={iframeRef}
              src={getEmbedUrl()}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              className="w-full aspect-video"
            />
          </div>

          {/* Controls - Only Play/Pause button, no speed controls */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-4">
            <div className="flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>
          </div>

          {/* Current Subtitle Display */}
          {currentCue && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg shadow-lg text-white">
              <div className="text-2xl font-bold mb-3 leading-relaxed">
                {renderClickableText(currentCue.textEn)}
              </div>
              {currentCue.textVi && (
                <div className="text-lg opacity-90">
                  {currentCue.textVi}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Word Popup */}
          {selectedWord && (
            <div className="bg-white rounded-lg shadow-lg p-5 mb-4 border-2 border-blue-500">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-800 capitalize">
                  {selectedWord.word}
                </h3>
                <button
                  onClick={() => setSelectedWord(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ✕
                </button>
              </div>

              {loadingWord ? (
                <div className="text-center py-4">
                  <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : selectedWord.info && (
                <div>
                  {/* Vietnamese */}
                  {selectedWord.info.vietnamese && (
                    <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded">
                      <span className="text-sm text-gray-600">Vietnamese:</span>
                      <div className="font-semibold text-blue-700">{selectedWord.info.vietnamese}</div>
                    </div>
                  )}

                  {/* IPA */}
                  {selectedWord.info.ipa && (
                    <div className="text-gray-600 mb-2">
                      /{selectedWord.info.ipa}/
                    </div>
                  )}

                  {/* Definitions */}
                  <div className="mb-3">
                    <div className="text-sm font-semibold text-gray-700 mb-1">Definitions:</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedWord.info.definitions.slice(0, 3).map((def, i) => (
                        <li key={i}>• {def}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Examples */}
                  {selectedWord.info.examples && selectedWord.info.examples.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-gray-700 mb-1">Examples:</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {selectedWord.info.examples.slice(0, 2).map((ex, i) => (
                          <li key={i} className="italic">"{ex}"</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Save Word Button */}
                  <button
                    onClick={handleToggleSaveWord}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      isWordSaved(selectedWord.word)
                        ? 'bg-pink-100 text-pink-600 border-2 border-pink-300'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    }`}
                  >
                    {isWordSaved(selectedWord.word) ? '💖 Đã lưu' : '⭐ Lưu từ vựng'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subtitle List */}
          <div className="bg-white rounded-lg shadow-md p-4 max-h-[600px] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-3">Subtitles ({video.subtitles.length})</h3>
            <div className="space-y-2">
              {video.subtitles.map((cue, index) => (
                <div
                  key={cue.id}
                  onClick={() => jumpToCue(cue)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentCue?.id === cue.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    {Math.floor(cue.startTime / 60)}:{(cue.startTime % 60).toFixed(0).padStart(2, '0')}
                  </div>
                  <div className="text-sm font-medium text-gray-800">
                    {cue.textEn}
                  </div>
                  {cue.textVi && (
                    <div className="text-xs text-gray-600 mt-1">
                      {cue.textVi}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Smart Popup - LLM Translation & Grammar (Draggable) */}
      {PopupComponents}
    </div>
  );
}
