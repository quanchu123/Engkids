'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Panel, Story, Token } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { lookupWord, pronounceWord, speakWord, WordInfo } from '@/services/dictionary';
import { translateToVietnamese } from '@/services/translate';
import { isBase64Image, isImageUrl } from '@/services/image';
import { useSmartPopup, WordData } from '@/components/SmartPopup';
import { trackEvent } from '@/lib/analytics';
import { computeStoryStars } from '@/lib/story-rewards';
import { readingRate } from '@/lib/reading-speed';
import PronunciationPractice from '@/components/learning/PronunciationPractice';

interface StoryReaderClientProps {
  story: Story;
}

export default function StoryReaderClient({ story }: StoryReaderClientProps) {
  const router = useRouter();
  const [selectedWord, setSelectedWord] = useState<Token | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [vietnameseWord, setVietnameseWord] = useState('');
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [currentPanel, setCurrentPanel] = useState(0);

  // Karaoke highlight: index of the token currently being spoken (or null).
  const [highlightTokenIndex, setHighlightTokenIndex] = useState<number | null>(null);

  // Engagement tracking (fix A). Sets dedupe; count state drives star math.
  const viewedPanelsRef = useRef<Set<number>>(new Set());
  const clickedWordsRef = useRef<Set<string>>(new Set());
  const [wordsClickedCount, setWordsClickedCount] = useState(0);

  const {
    markPanelViewed,
    completeStory,
    saveWord,
    unsaveWord,
    isWordSaved,
    updateStreak,
    trackWordClick,
    settings,
  } = useAppStore();

  const handleSaveWordFromAI = useCallback((wordData: WordData) => {
    saveWord(wordData.word, wordData.meaning_vi, false, wordData.pronunciation || '', story.id);
  }, [saveWord, story.id]);

  const { PopupComponents } = useSmartPopup(handleSaveWordFromAI);

  // Mount: streak + analytics only. Panels are marked as the child navigates.
  useEffect(() => {
    updateStreak();
    trackEvent('story_opened', { storyId: story.id });
  }, [story.id, updateStreak]);

  // Fix B: mark the CURRENT panel viewed whenever it changes, and record the
  // index for engagement-based star scoring.
  useEffect(() => {
    const activePanel = story.panels[currentPanel];
    if (!activePanel) return;
    markPanelViewed(story.id, activePanel.panel_id);
    viewedPanelsRef.current.add(currentPanel);
  }, [currentPanel, markPanelViewed, story.id, story.panels]);

  // Fix D: optionally auto-play the English sentence when the panel changes.
  // Subtle and non-blocking; speakWord cancels any prior utterance.
  useEffect(() => {
    if (!settings.autoPlayAudio) return;
    if (typeof window === 'undefined') return;
    const activePanel = story.panels[currentPanel];
    if (!activePanel) return;
    speakWord(activePanel.sentence_en, readingRate(settings.readingSpeed));
  }, [currentPanel, settings.autoPlayAudio, settings.readingSpeed, story.panels]);

  const handleWordClick = useCallback(async (token: Token) => {
    setSelectedWord(token);
    setShowPopup(true);
    setShowPractice(false);
    setIsLoadingWord(true);
    setWordInfo(null);
    setVietnameseWord('');
    trackWordClick(token.norm || token.display, story.id);

    const cleanWord = (token.norm || token.display).replace(/[.,!?\"'`]/g, '').toLowerCase();

    // Dedupe distinct clicked words for star scoring (fix A).
    if (cleanWord && !clickedWordsRef.current.has(cleanWord)) {
      clickedWordsRef.current.add(cleanWord);
      setWordsClickedCount(clickedWordsRef.current.size);
    }

    const [info, translation] = await Promise.all([
      lookupWord(cleanWord),
      translateToVietnamese(cleanWord),
    ]);

    setWordInfo(info);
    setVietnameseWord(translation.success ? translation.vietnamese : '');
    setIsLoadingWord(false);
  }, [story.id, trackWordClick]);

  const closePopup = useCallback(() => {
    setShowPopup(false);
    setShowPractice(false);
    setSelectedWord(null);
    setWordInfo(null);
    setVietnameseWord('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPopup) {
        closePopup();
        return;
      }

      if (showPopup) return;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        setCurrentPanel((panel) => Math.min(panel + 1, story.panels.length - 1));
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        setCurrentPanel((panel) => Math.max(panel - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePopup, showPopup, story.panels.length]);

  const handleComplete = () => {
    const stars = computeStoryStars({
      panelsViewed: viewedPanelsRef.current.size,
      totalPanels: story.panels.length,
      wordsClicked: wordsClickedCount,
    });
    completeStory(story.id, stars);
    router.push(`/stories/${story.id}/vocab`);
  };

  const handleToggleSaveWord = () => {
    if (!selectedWord) return;
    const word = selectedWord.norm || selectedWord.display;
    if (isWordSaved(word)) {
      unsaveWord(word);
    } else {
      // Fix C: best-available Vietnamese meaning + English example sentence.
      const meaning = selectedWord.vi || vietnameseWord || '';
      saveWord(word, meaning, false, wordInfo?.ipa || '', story.id, panel.sentence_en);
    }
  };

  const panel = story.panels[currentPanel];

  // Fix E: read the whole English sentence with a karaoke-style word highlight.
  const readWholeSentence = useCallback(() => {
    const text = panel.sentence_en;
    const rate = readingRate(settings.readingSpeed);

    // SSR / unsupported guard — degrade to a plain speak, never throw.
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      try {
        speakWord(text, rate);
      } catch {
        /* no-op */
      }
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const enVoice =
        voices.find((v) => v.lang.startsWith('en-US')) ||
        voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;

      // onboundary may be unsupported in some browsers — that's fine, we just
      // won't highlight. Guard everything so it never throws.
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (typeof event.charIndex !== 'number') return;
        const index = tokenIndexAtChar(panel.tokens, text, event.charIndex);
        if (index >= 0) setHighlightTokenIndex(index);
      };

      const clearHighlight = () => setHighlightTokenIndex(null);
      utterance.onend = clearHighlight;
      utterance.onerror = clearHighlight;

      window.speechSynthesis.speak(utterance);
    } catch {
      setHighlightTokenIndex(null);
      try {
        speakWord(text, rate);
      } catch {
        /* no-op */
      }
    }
  }, [panel, settings.readingSpeed]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-amber-50 to-pink-50" data-testid="story-reader">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/stories" className="text-sm font-bold text-slate-600">
            Quay lại
          </Link>
          <div className="kid-chip px-4 py-1 text-sm font-black text-slate-700">
            {story.title_en}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/stories/${story.id}/vocab`} data-testid="story-vocab-link" className="kid-chip px-3 py-2 text-sm font-bold text-amber-700">
              Vocab
            </Link>
            <Link href={`/stories/${story.id}/games`} data-testid="story-games-link" className="kid-chip px-3 py-2 text-sm font-bold text-pink-700">
              Game
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="soft-panel mb-5 rounded-[1.75rem] px-4 py-4">
          <div className="mb-2 text-center text-sm font-bold uppercase tracking-[0.18em] text-emerald-500">
            Story Reader
          </div>
          <div className="flex items-center justify-center gap-2">
            {story.panels.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPanel(index)}
                aria-label={`Panel ${index + 1}`}
                className={`h-3 w-3 rounded-full ${index === currentPanel ? 'bg-emerald-500' : 'bg-slate-300'}`}
              />
            ))}
          </div>
        </div>

        {/* Fix G: ONE image, full-width above the two text columns. */}
        <div className="mx-auto mb-6 max-w-3xl">
          {renderPanelImage(panel, currentPanel)}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* English column */}
          <section className="toy-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900">English</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => speakWord(panel.sentence_en, readingRate(settings.readingSpeed))}
                  className="kid-chip px-4 py-2 text-sm font-bold text-slate-700"
                >
                  Listen
                </button>
                <button
                  onClick={readWholeSentence}
                  className="kid-chip px-4 py-2 text-sm font-bold text-emerald-700"
                >
                  Đọc cả câu 🔊
                </button>
              </div>
            </div>
            <div className="toy-surface rounded-3xl p-4">
              {renderEnglishSentence(panel, selectedWord, handleWordClick, highlightTokenIndex)}
            </div>
          </section>

          {/* Vietnamese column */}
          <section className="toy-panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">Tiếng Việt</h2>
              <button
                onClick={() => speakWord(panel.sentence_vi)}
                className="kid-chip px-4 py-2 text-sm font-bold text-slate-700"
              >
                Nghe
              </button>
            </div>
            <div className="toy-surface rounded-3xl p-4">
              <p className="text-lg font-semibold text-slate-800">{panel.sentence_vi}</p>
            </div>
          </section>
        </div>

        <div className="soft-panel mx-auto mt-6 flex max-w-3xl items-center justify-between rounded-[1.75rem] px-4 py-4">
          <button
            onClick={() => setCurrentPanel((value) => Math.max(value - 1, 0))}
            disabled={currentPanel === 0}
            className="kid-chip px-5 py-3 font-bold text-slate-700 disabled:opacity-40"
          >
            Trang trước
          </button>
          <span className="kid-chip px-4 py-2 text-sm font-bold text-slate-600">
            {currentPanel + 1} / {story.panels.length}
          </span>
          {currentPanel < story.panels.length - 1 ? (
            <button
              onClick={() => setCurrentPanel((value) => Math.min(value + 1, story.panels.length - 1))}
              className="rounded-2xl bg-emerald-500 px-5 py-3 font-bold text-white shadow"
            >
              Trang sau
            </button>
          ) : (
            <button onClick={handleComplete} className="rounded-2xl bg-amber-400 px-5 py-3 font-bold text-slate-900 shadow">
              Hoàn thành
            </button>
          )}
        </div>
      </main>

      {showPopup && selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={closePopup}>
          <div
            className="toy-panel max-h-[85vh] w-80 overflow-y-auto p-5 shadow-2xl sm:w-96"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">{selectedWord.display}</h3>
                {wordInfo?.ipa && <p className="text-sm text-slate-500">/{wordInfo.ipa}/</p>}
              </div>
              <button onClick={closePopup} className="text-sm font-bold text-slate-500">
                Đóng
              </button>
            </div>

            {isLoadingWord ? (
              <div className="py-6 text-center text-sm text-slate-500">Đang tải...</div>
            ) : (
              <div className="space-y-3">
                {vietnameseWord && (
                  <div className="toy-surface rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-400">Tiếng Việt</p>
                    <p className="text-lg font-bold text-slate-900">{vietnameseWord}</p>
                  </div>
                )}
                {wordInfo?.definitions?.[0] && (
                  <div className="toy-surface rounded-2xl px-4 py-3 text-sm text-slate-700">
                    {wordInfo.definitions[0]}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid gap-2">
              <button
                onClick={() => pronounceWord(selectedWord.display, wordInfo?.audioUrl)}
                className="rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-white"
              >
                Nghe phát âm
              </button>
              <button
                onClick={handleToggleSaveWord}
                className={`rounded-2xl px-4 py-3 font-bold ${
                  isWordSaved(selectedWord.norm || selectedWord.display)
                    ? 'bg-pink-100 text-pink-700'
                    : 'bg-violet-500 text-white'
                }`}
              >
                {isWordSaved(selectedWord.norm || selectedWord.display) ? 'Đã lưu' : 'Lưu từ vựng'}
              </button>
              <button
                onClick={() => setShowPractice((value) => !value)}
                className={`rounded-2xl px-4 py-3 font-bold ${
                  showPractice ? 'bg-orange-100 text-orange-700' : 'bg-orange-500 text-white'
                }`}
              >
                Luyện nói 🎤
              </button>
            </div>

            {showPractice && (
              <div className="mt-4">
                <PronunciationPractice
                  word={selectedWord.display}
                  ipa={wordInfo?.ipa}
                  meaningVi={vietnameseWord || selectedWord.vi}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {PopupComponents}
    </div>
  );
}

/**
 * Map a character offset within `sentence` to the index of the token in
 * `tokens` that contains it. Walks tokens in order, matching each token's
 * display text against the sentence. Returns the best (last start <= charIndex)
 * match, or -1 if nothing sensible is found. Pure and defensive.
 */
function tokenIndexAtChar(tokens: Token[], sentence: string, charIndex: number): number {
  let searchPos = 0;
  let best = -1;

  for (let i = 0; i < tokens.length; i++) {
    const display = tokens[i].display;
    if (!display) continue;
    const start = sentence.indexOf(display, searchPos);
    if (start === -1) continue;
    const end = start + display.length;
    searchPos = end;

    if (charIndex >= start && charIndex < end) {
      return i;
    }
    if (start <= charIndex) {
      best = i;
    }
  }

  return best;
}

function renderPanelImage(panel: Panel, index: number) {
  const imageStr = panel.image;

  if (isBase64Image(imageStr)) {
    return (
      <div className="toy-surface relative aspect-[4/3] overflow-hidden rounded-3xl">
        <img src={imageStr} alt={panel.image_alt || `Panel ${index + 1}`} className="h-full w-full object-cover" />
      </div>
    );
  }

  if (isImageUrl(imageStr)) {
    return (
      <div className="toy-surface relative aspect-[4/3] overflow-hidden rounded-3xl">
        <Image src={imageStr} alt={panel.image_alt || `Panel ${index + 1}`} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div className="toy-surface flex aspect-[4/3] items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-pink-100 text-7xl">
      {imageStr || 'IMG'}
    </div>
  );
}

function renderEnglishSentence(
  panel: Panel,
  selectedWord: Token | null,
  onWordClick: (token: Token) => void,
  highlightTokenIndex: number | null,
) {
  return (
    <p className="text-lg leading-relaxed">
      {panel.tokens.map((token, index) => {
        const isWord = /[a-zA-Z]/.test(token.display);
        const isHighlighted = highlightTokenIndex === index;
        return (
          <span key={index}>
            {isWord ? (
              <button
                type="button"
                onClick={() => onWordClick(token)}
                className={`rounded px-1 py-0.5 ${
                  isHighlighted
                    ? 'bg-yellow-300 text-slate-900'
                    : selectedWord?.display === token.display
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'hover:bg-amber-100'
                }`}
              >
                {token.display}
              </button>
            ) : (
              <span className={isHighlighted ? 'bg-yellow-300' : undefined}>{token.display}</span>
            )}
            {index < panel.tokens.length - 1 && ' '}
          </span>
        );
      })}
    </p>
  );
}
