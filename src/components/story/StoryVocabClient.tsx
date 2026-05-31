'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useAppStore } from '@/store/useAppStore';
import { lookupWord, pronounceWord, WordInfo } from '@/services/dictionary';
import { Story } from '@/types';

interface StoryVocabClientProps {
  story: Story;
}

export default function StoryVocabClient({ story }: StoryVocabClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [wordInfoMap, setWordInfoMap] = useState<Map<string, WordInfo>>(new Map());
  const { saveWord, unsaveWord, isWordSaved } = useAppStore();

  const vocabulary = useMemo(() => getUniqueVocabulary(story), [story]);

  useEffect(() => {
    let isMounted = true;

    async function loadWordInfo() {
      for (const word of vocabulary) {
        if (!isMounted) break;
        const info = await lookupWord(word.word);
        if (info && isMounted) {
          setWordInfoMap((prev) => {
            if (prev.has(word.word)) return prev;
            return new Map(prev).set(word.word, info);
          });
        }
      }
    }

    if (vocabulary.length > 0) {
      loadWordInfo();
    }

    return () => {
      isMounted = false;
    };
  }, [vocabulary]);

  const currentWord = vocabulary[currentIndex];
  const currentWordInfo = currentWord ? wordInfoMap.get(currentWord.word) : null;

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      setIsFlipped(false);
      return prev > 0 ? prev - 1 : prev;
    });
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      setIsFlipped(false);
      return prev < vocabulary.length - 1 ? prev + 1 : prev;
    });
  }, [vocabulary.length]);

  const handleToggleSave = useCallback(() => {
    if (!currentWord) return;
    if (isWordSaved(currentWord.word)) {
      unsaveWord(currentWord.word);
    } else {
      saveWord(currentWord.word, currentWord.vi, false, currentWordInfo?.ipa || '', story.id);
    }
  }, [currentWord, currentWordInfo?.ipa, isWordSaved, saveWord, story.id, unsaveWord]);

  if (vocabulary.length === 0) {
    return <LoadingSpinner message="Không có từ vựng cho truyện này." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href={`/stories/${story.id}`} className="text-sm font-bold text-slate-600">
            Truyện
          </Link>
          <h1 className="kid-chip px-4 py-1 text-sm font-black text-slate-900">Flashcards</h1>
          <Link href={`/stories/${story.id}/games`} className="text-sm font-bold text-violet-600">
            Game
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-md flex-col items-center justify-center px-4 py-6">
        <p className="kid-chip mb-4 px-4 py-2 text-sm font-bold text-slate-500">
          Từ {currentIndex + 1}/{vocabulary.length}
        </p>

        <button
          type="button"
          onClick={() => setIsFlipped((value) => !value)}
          className="toy-panel mb-4 min-h-[220px] w-full p-8 text-left"
        >
          {!isFlipped ? (
            <div className="text-center">
              <p className="text-4xl font-black text-slate-900">{currentWord.word}</p>
              {currentWordInfo?.ipa && <p className="mt-2 text-slate-500">{currentWordInfo.ipa}</p>}
            </div>
          ) : (
            <div className="text-center">
              <p className="text-3xl font-black text-slate-900">{currentWord.vi}</p>
              {currentWordInfo?.definitions?.[0] && (
                <p className="mt-3 text-sm text-slate-500">{currentWordInfo.definitions[0]}</p>
              )}
            </div>
          )}
        </button>

        <div className="soft-panel mb-4 grid w-full gap-2 rounded-[1.75rem] p-3">
          <button onClick={() => pronounceWord(currentWord.word, currentWordInfo?.audioUrl)} className="rounded-2xl bg-sky-100 px-4 py-3 font-bold text-sky-700 shadow">
            Phát âm
          </button>
          <button
            onClick={handleToggleSave}
            className={`rounded-2xl px-4 py-3 font-bold shadow ${isWordSaved(currentWord.word) ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}
          >
            {isWordSaved(currentWord.word) ? 'Bỏ lưu' : 'Lưu từ'}
          </button>
        </div>

        <div className="flex w-full gap-3">
          <button onClick={goToPrev} disabled={currentIndex === 0} className="flex-1 rounded-2xl bg-white px-4 py-3 font-bold text-slate-700 shadow disabled:opacity-40">
            Trước
          </button>
          <button onClick={goToNext} disabled={currentIndex === vocabulary.length - 1} className="flex-1 rounded-2xl bg-violet-500 px-4 py-3 font-bold text-white shadow disabled:opacity-40">
            Tiếp
          </button>
        </div>
      </main>
    </div>
  );
}

function getUniqueVocabulary(story: Story) {
  const vocabMap = new Map<string, { word: string; vi: string }>();

  story.games.match.forEach((item) => {
    vocabMap.set(item.word.toLowerCase(), { word: item.word, vi: item.vi });
  });

  story.panels.forEach((panel) => {
    panel.tokens.forEach((token) => {
      if (token.vi && !vocabMap.has(token.norm.toLowerCase())) {
        vocabMap.set(token.norm.toLowerCase(), {
          word: token.norm,
          vi: token.vi,
        });
      }
    });
  });

  return Array.from(vocabMap.values());
}
