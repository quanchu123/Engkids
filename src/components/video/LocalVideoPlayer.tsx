'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Video, SubtitleCue } from '@/types';
import { lookupWord, speakWord, WordInfo } from '@/services/dictionary';
import { translateToVietnamese } from '@/services/translate';
import { findCurrentCueIndex } from '@/lib/vtt-parser';
import { useAppStore } from '@/store/useAppStore';
import { trackEvent } from '@/lib/analytics';
import VideoQuizPanel from '@/components/video/VideoQuizPanel';
import PronunciationPractice from '@/components/learning/PronunciationPractice';
import {
  getVideoProgress,
  setVideoProgress,
  clearVideoProgress,
  shouldResume,
} from '@/lib/video-progress';
import { getActiveWordIndex } from '@/lib/subtitle-karaoke';

interface LocalVideoPlayerProps {
  video: Video;
}

type SubtitleMode = 'en' | 'vi' | 'both';
type PlaybackRate = 0.5 | 0.75 | 1;

const SPEED_OPTIONS: PlaybackRate[] = [0.5, 0.75, 1];

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Player for locally-hosted (offline) videos. Plays the file via a native
 * <video> element and keeps the same learning sidebar: clickable subtitles,
 * dictionary lookup, and the multiple-choice quiz with fireworks.
 *
 * Learning helpers added: A-B sentence repeat, playback speed, subtitle display
 * mode (EN/VI/both), auto-scrolling subtitle list, karaoke word highlight,
 * resume-where-you-left-off, plus per-word "listen" and pronunciation practice.
 */
export default function LocalVideoPlayer({ video }: LocalVideoPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [currentCue, setCurrentCue] = useState<SubtitleCue | null>(null);
  const [selectedWord, setSelectedWord] = useState<{ word: string; info: WordInfo | null } | null>(null);
  const [loadingWord, setLoadingWord] = useState(false);
  const [showPractice, setShowPractice] = useState(false);

  // Learning controls.
  const [loopSentence, setLoopSentence] = useState(false);
  const [speed, setSpeed] = useState<PlaybackRate>(1);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('both');

  // Resume banner.
  const [resumeSeconds, setResumeSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackedStartRef = useRef(false);
  const lastSavedRef = useRef(0);
  const cueItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { saveWord, isWordSaved, unsaveWord, recordMediaActivity, applyGameResult } = useAppStore();

  const src = video.videoUrl || '';

  const handleQuizComplete = useCallback(
    (correctCount: number, totalCount: number) => {
      if (totalCount === 0) return;
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

  // Resolve the active subtitle cue from the current playback time.
  useEffect(() => {
    if (video.subtitles.length === 0) {
      setCurrentCue(null);
      return;
    }
    const idx = findCurrentCueIndex(video.subtitles, currentTime);
    setCurrentCue(idx >= 0 ? video.subtitles[idx] : null);
  }, [currentTime, video.subtitles]);

  // Auto-scroll the subtitle list so the active cue stays in view.
  useEffect(() => {
    if (!currentCue) return;
    const el = cueItemRefs.current[currentCue.id];
    try {
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
      /* older browsers without smooth scroll options */
    }
  }, [currentCue]);

  // Keep the <video> element's playbackRate in sync with the chosen speed.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    const saved = getVideoProgress(video.id);
    const duration = videoRef.current?.duration ?? video.duration ?? 0;
    if (shouldResume(saved, duration)) {
      setResumeSeconds(saved);
    }
  };

  const handlePlay = () => {
    if (!trackedStartRef.current) {
      trackedStartRef.current = true;
      recordMediaActivity();
      trackEvent('video_started', { videoId: video.id, category: video.category });
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const t = e.currentTarget.currentTime;
    setCurrentTime(t);

    // A-B repeat: loop the sentence the child is currently on.
    if (loopSentence && currentCue && t >= currentCue.endTime) {
      e.currentTarget.currentTime = currentCue.startTime;
    }

    // Throttle progress persistence to ~once every 5s.
    if (Math.abs(t - lastSavedRef.current) >= 5) {
      lastSavedRef.current = t;
      setVideoProgress(video.id, t);
    }
  };

  const handleEnded = () => {
    clearVideoProgress(video.id);
  };

  const resumePlayback = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = resumeSeconds;
      videoRef.current.play().catch(() => {});
    }
    setResumeSeconds(0);
  };

  const restartFromStart = () => {
    clearVideoProgress(video.id);
    setResumeSeconds(0);
  };

  const handleWordClick = async (word: string) => {
    const cleanWord = word.replace(/[.,!?;:"']/g, '').toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return;

    setLoadingWord(true);
    setShowPractice(false);
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

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
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
        currentCue?.textEn || '',
      );
    }
  };

  // Render a caption with clickable words; optionally karaoke-highlight the
  // word currently being spoken (index from the pure timing helper).
  const renderClickableText = (text: string, highlightIndex: number) => {
    const tokens = text.split(/(\s+)/);
    let wordCounter = -1;
    return tokens.map((token, index) => {
      if (/^\s+$/.test(token)) return <span key={index}>{token}</span>;
      if (/[a-zA-Z]/.test(token)) {
        wordCounter += 1;
        const isActive = wordCounter === highlightIndex;
        return (
          <span
            key={index}
            onClick={() => handleWordClick(token)}
            className={`cursor-pointer rounded px-0.5 transition-colors hover:bg-yellow-200 hover:underline ${
              isActive ? 'bg-yellow-300 text-slate-900' : ''
            }`}
          >
            {token}
          </span>
        );
      }
      return <span key={index}>{token}</span>;
    });
  };

  // Active word index for the current cue (only matters when EN is visible).
  const activeWordIndex = currentCue
    ? getActiveWordIndex(currentCue.textEn, currentCue.startTime, currentCue.endTime, currentTime)
    : -1;

  const showEn = subtitleMode === 'en' || subtitleMode === 'both';
  const showVi = subtitleMode === 'vi' || subtitleMode === 'both';

  return (
    <div className="mx-auto max-w-7xl" data-testid="local-video-player">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Learning controls */}
          <div className="soft-panel mb-3 flex flex-wrap items-center gap-3 rounded-[1.5rem] p-3">
            <button
              onClick={() => setLoopSentence((v) => !v)}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                loopSentence ? 'bg-violet-500 text-white shadow' : 'bg-white text-violet-700 shadow-sm'
              }`}
              aria-pressed={loopSentence}
            >
              Lặp câu 🔁
            </button>

            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-500">Tốc độ</span>
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setSpeed(option)}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-bold transition ${
                    speed === option ? 'bg-sky-500 text-white shadow' : 'bg-white text-sky-700 shadow-sm'
                  }`}
                >
                  {option}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-500">Phụ đề</span>
              {([
                ['both', 'Cả hai'],
                ['en', 'Anh'],
                ['vi', 'Việt'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setSubtitleMode(mode)}
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-bold transition ${
                    subtitleMode === mode ? 'bg-emerald-500 text-white shadow' : 'bg-white text-emerald-700 shadow-sm'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="toy-panel relative mb-4 overflow-hidden rounded-[2rem] bg-black">
            {src ? (
              <video
                ref={videoRef}
                src={src}
                controls
                playsInline
                onPlay={handlePlay}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                className="aspect-video w-full"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center text-white/70">
                Không tìm thấy video. (video not found)
              </div>
            )}

            {resumeSeconds > 0 && (
              <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/75 px-4 py-3 text-white backdrop-blur">
                <span className="text-sm font-bold">
                  Xem tiếp từ phút {formatClock(resumeSeconds)}?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={resumePlayback}
                    className="rounded-xl bg-emerald-500 px-3 py-1.5 text-sm font-bold text-white"
                  >
                    Xem tiếp
                  </button>
                  <button
                    onClick={restartFromStart}
                    className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-bold text-white"
                  >
                    Xem từ đầu
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentCue && (showEn || showVi) && (
            <div className="soft-feature rounded-[1.75rem] p-6 text-white">
              {showEn && (
                <div className="mb-3 text-2xl font-bold leading-relaxed">
                  {renderClickableText(currentCue.textEn, activeWordIndex)}
                </div>
              )}
              {showVi && currentCue.textVi && (
                <div className="text-lg opacity-90">{currentCue.textVi}</div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          {video.quiz && video.quiz.length > 0 && (
            <VideoQuizPanel questions={video.quiz} onComplete={handleQuizComplete} />
          )}

          {selectedWord && (
            <div className="toy-panel mb-4 max-h-[80vh] overflow-y-auto border-2 border-blue-200 p-5">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-xl font-bold capitalize text-gray-800">{selectedWord.word}</h3>
                <button
                  onClick={() => {
                    setSelectedWord(null);
                    setShowPractice(false);
                  }}
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
                    <div className="mb-2 text-gray-600">/{selectedWord.info.ipa}/</div>
                  )}
                  <div className="mb-3">
                    <div className="mb-1 text-sm font-semibold text-gray-700">Definitions:</div>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {selectedWord.info.definitions.slice(0, 3).map((def, i) => (
                        <li key={i}>• {def}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid gap-2">
                    <button
                      onClick={() => speakWord(selectedWord.word)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 py-2.5 text-sm font-bold text-white"
                    >
                      Nghe 🔊
                    </button>
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
                    <button
                      onClick={() => setShowPractice((v) => !v)}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
                        showPractice ? 'bg-orange-100 text-orange-700' : 'bg-orange-500 text-white'
                      }`}
                    >
                      Luyện nói 🎤
                    </button>
                  </div>

                  {showPractice && (
                    <div className="mt-4">
                      <PronunciationPractice
                        word={selectedWord.word}
                        ipa={selectedWord.info?.ipa}
                        meaningVi={selectedWord.info?.vietnamese}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {video.subtitles.length > 0 && (
            <div className="soft-panel max-h-[600px] overflow-y-auto rounded-[1.75rem] p-4">
              <h3 className="mb-3 font-bold text-gray-800">Subtitles ({video.subtitles.length})</h3>
              <div className="space-y-2">
                {video.subtitles.map((cue) => (
                  <div
                    key={cue.id}
                    ref={(el) => {
                      cueItemRefs.current[cue.id] = el;
                    }}
                    onClick={() => seekTo(cue.startTime)}
                    className={`cursor-pointer rounded-lg p-3 transition-colors ${
                      currentCue?.id === cue.id
                        ? 'border-2 border-blue-500 bg-blue-100'
                        : 'border border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="mb-1 text-xs text-gray-500">
                      {Math.floor(cue.startTime / 60)}:{(cue.startTime % 60).toFixed(0).padStart(2, '0')}
                    </div>
                    <div className="text-sm font-medium text-gray-800">{cue.textEn}</div>
                    {cue.textVi && <div className="mt-1 text-xs text-gray-600">{cue.textVi}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
