'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, SubtitleCue } from '@/types';
import { lookupWord, WordInfo } from '@/services/dictionary';
import { translateToVietnamese } from '@/services/translate';
import { findCurrentCueIndex } from '@/lib/vtt-parser';
import { useAppStore } from '@/store/useAppStore';
import { useSmartPopup, WordData } from '@/components/SmartPopup';
import { trackEvent } from '@/lib/analytics';
import VideoQuizPanel from '@/components/video/VideoQuizPanel';

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
  const trackedStartRef = useRef(false);

  const { saveWord, isWordSaved, unsaveWord, recordMediaActivity, applyGameResult } = useAppStore();

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

  const handleQuizComplete = useCallback(
    (correctCount: number, totalCount: number) => {
      if (totalCount === 0) return;
      // Reward stars proportionally (1 star per correct answer) via the game-score system.
      applyGameResult({
        gameType: 'multiple_choice',
        storyId: `video:${video.id}`,
        score: correctCount,
        totalQuestions: totalCount,
        rewards: { stars: correctCount },
      });
    },
    [applyGameResult, video.id],
  );

  useEffect(() => {
    if (video.subtitles.length === 0) {
      setCurrentCue(null);
      return;
    }

    const idx = findCurrentCueIndex(video.subtitles, currentTime);
    setCurrentCue(idx >= 0 ? video.subtitles[idx] : null);
  }, [currentTime, video.subtitles]);

  useEffect(() => {
    if (!video.bunnyVideoId) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const setDefaultSpeed = () => {
      iframe.contentWindow?.postMessage({ event: 'playbackRate', value: 0.75 }, '*');
    };

    const speedTimer = setTimeout(setDefaultSpeed, 1000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data.event === 'timeupdate') {
        setCurrentTime(event.data.currentTime);
      } else if (event.data.event === 'play') {
        setIsPlaying(true);
        if (!trackedStartRef.current) {
          trackedStartRef.current = true;
          recordMediaActivity();
          trackEvent('video_started', { videoId: video.id, category: video.category });
        }
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
  }, [recordMediaActivity, video.bunnyVideoId, video.category, video.id]);

  const handleWordClick = async (word: string) => {
    const cleanWord = word.replace(/[.,!?;:"']/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;

    setLoadingWord(true);
    setSelectedWord({ word: cleanWord, info: null });

    try {
      const wordInfo = await lookupWord(cleanWord);
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

  const togglePlay = () => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.contentWindow?.postMessage(
        isPlaying ? { event: 'pause' } : { event: 'play' },
        '*',
      );
    }
  };

  const seekTo = (seconds: number) => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.contentWindow?.postMessage({ event: 'seek', value: seconds }, '*');
    }
  };

  const jumpToCue = (cue: SubtitleCue) => {
    seekTo(cue.startTime);
  };

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

  const renderClickableText = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      if (/^\s+$/.test(word)) {
        return <span key={index}>{word}</span>;
      }

      if (/[a-zA-Z]/.test(word)) {
        return (
          <span
            key={index}
            onClick={() => handleWordClick(word)}
            className="cursor-pointer rounded px-0.5 transition-colors hover:bg-yellow-200 hover:underline"
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
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${video.bunnyVideoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true&playbackSpeed=false`;
  };

  return (
    <div className="mx-auto max-w-7xl" data-testid="video-learning-player">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="toy-panel mb-4 overflow-hidden rounded-[2rem] bg-black">
            <iframe
              ref={iframeRef}
              src={getEmbedUrl()}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>

          <div className="soft-panel mb-4 rounded-[1.5rem] p-4">
            <div className="flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="rounded-2xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700"
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>

          {currentCue && (
            <div className="soft-feature rounded-[1.75rem] p-6 text-white">
              <div className="mb-3 text-2xl font-bold leading-relaxed">
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

        <div className="lg:col-span-1">
          {video.quiz && video.quiz.length > 0 && (
            <VideoQuizPanel questions={video.quiz} onComplete={handleQuizComplete} />
          )}

          {selectedWord && (
            <div className="toy-panel mb-4 border-2 border-blue-200 p-5">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-xl font-bold capitalize text-gray-800">
                  {selectedWord.word}
                </h3>
                <button
                  onClick={() => setSelectedWord(null)}
                  className="text-xl text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {loadingWord ? (
                <div className="py-4 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : selectedWord.info && (
                <div>
                  {selectedWord.info.vietnamese && (
                    <div className="toy-surface mb-3 rounded-2xl p-3">
                      <span className="text-sm text-gray-600">Vietnamese:</span>
                      <div className="font-semibold text-blue-700">{selectedWord.info.vietnamese}</div>
                    </div>
                  )}

                  {selectedWord.info.ipa && (
                    <div className="mb-2 text-gray-600">
                      /{selectedWord.info.ipa}/
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="mb-1 text-sm font-semibold text-gray-700">Definitions:</div>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {selectedWord.info.definitions.slice(0, 3).map((def, i) => (
                        <li key={i}>• {def}</li>
                      ))}
                    </ul>
                  </div>

                  {selectedWord.info.examples && selectedWord.info.examples.length > 0 && (
                    <div className="mb-3">
                      <div className="mb-1 text-sm font-semibold text-gray-700">Examples:</div>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {selectedWord.info.examples.slice(0, 2).map((ex, i) => (
                          <li key={i} className="italic">&quot;{ex}&quot;</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={handleToggleSaveWord}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                      isWordSaved(selectedWord.word)
                        ? 'border-2 border-pink-300 bg-pink-100 text-pink-600'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    }`}
                  >
                    {isWordSaved(selectedWord.word) ? 'Đã lưu' : 'Lưu từ vựng'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="soft-panel max-h-[600px] overflow-y-auto rounded-[1.75rem] p-4">
            <h3 className="mb-3 font-bold text-gray-800">Subtitles ({video.subtitles.length})</h3>
            <div className="space-y-2">
              {video.subtitles.map((cue) => (
                <div
                  key={cue.id}
                  onClick={() => jumpToCue(cue)}
                  className={`cursor-pointer rounded-lg p-3 transition-colors ${
                    currentCue?.id === cue.id
                      ? 'border-2 border-blue-500 bg-blue-100'
                      : 'border border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="mb-1 text-xs text-gray-500">
                    {Math.floor(cue.startTime / 60)}:{(cue.startTime % 60).toFixed(0).padStart(2, '0')}
                  </div>
                  <div className="text-sm font-medium text-gray-800">
                    {cue.textEn}
                  </div>
                  {cue.textVi && (
                    <div className="mt-1 text-xs text-gray-600">
                      {cue.textVi}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {PopupComponents}
    </div>
  );
}
