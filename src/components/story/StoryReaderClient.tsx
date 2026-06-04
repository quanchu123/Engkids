'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
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
  const [currentPanel, setCurrentPanel] = useState(0);

  const {
    markPanelViewed,
    completeStory,
    saveWord,
    unsaveWord,
    isWordSaved,
    updateStreak,
    trackWordClick,
  } = useAppStore();

  const handleSaveWordFromAI = useCallback((wordData: WordData) => {
    saveWord(wordData.word, wordData.meaning_vi, false, wordData.pronunciation || '', story.id);
  }, [saveWord, story.id]);

  const { PopupComponents } = useSmartPopup(handleSaveWordFromAI);

  useEffect(() => {
    updateStreak();
    trackEvent('story_opened', { storyId: story.id });
    story.panels.forEach((panel) => {
      markPanelViewed(story.id, panel.panel_id);
    });
  }, [markPanelViewed, story.id, story.panels, updateStreak]);

  const handleWordClick = useCallback(async (token: Token) => {
    setSelectedWord(token);
    setShowPopup(true);
    setIsLoadingWord(true);
    setWordInfo(null);
    setVietnameseWord('');
    trackWordClick(token.norm || token.display, story.id);

    const cleanWord = (token.norm || token.display).replace(/[.,!?\"'`]/g, '').toLowerCase();
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
    completeStory(story.id, 1);
    router.push(`/stories/${story.id}/vocab`);
  };

  const handleToggleSaveWord = () => {
    if (!selectedWord) return;
    const word = selectedWord.norm || selectedWord.display;
    if (isWordSaved(word)) {
      unsaveWord(word);
    } else {
      saveWord(word, selectedWord.vi || '', false, wordInfo?.ipa || '', story.id);
    }
  };

  const panel = story.panels[currentPanel];

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

        <div className="grid gap-6 lg:grid-cols-2">
          <PanelCard
            title="English"
            actionLabel="Listen"
            onSpeak={() => speakWord(panel.sentence_en)}
            content={renderEnglishSentence(panel, selectedWord, handleWordClick)}
          >
            {renderPanelImage(panel, currentPanel)}
          </PanelCard>

          <PanelCard
            title="Tiếng Việt"
            actionLabel="Nghe"
            onSpeak={() => speakWord(panel.sentence_vi)}
            content={<p className="text-lg font-semibold text-slate-800">{panel.sentence_vi}</p>}
          >
            {renderPanelImage(panel, currentPanel)}
          </PanelCard>
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
          <div className="toy-panel w-80 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
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
            </div>
          </div>
        </div>
      )}

      {PopupComponents}
    </div>
  );
}

function PanelCard({
  title,
  actionLabel,
  onSpeak,
  children,
  content,
}: {
  title: string;
  actionLabel: string;
  onSpeak: () => void;
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <section className="toy-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <button onClick={onSpeak} className="kid-chip px-4 py-2 text-sm font-bold text-slate-700">
          {actionLabel}
        </button>
      </div>
      <div className="mb-4">{children}</div>
      <div className="toy-surface rounded-3xl p-4">{content}</div>
    </section>
  );
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
) {
  return (
    <p className="text-lg leading-relaxed">
      {panel.tokens.map((token, index) => {
        const isWord = /[a-zA-Z]/.test(token.display);
        return (
          <span key={index}>
            {isWord ? (
              <button
                type="button"
                onClick={() => onWordClick(token)}
                className={`rounded px-1 py-0.5 ${
                  selectedWord?.display === token.display ? 'bg-emerald-200 text-emerald-900' : 'hover:bg-amber-100'
                }`}
              >
                {token.display}
              </button>
            ) : (
              <span>{token.display}</span>
            )}
            {index < panel.tokens.length - 1 && ' '}
          </span>
        );
      })}
    </p>
  );
}
