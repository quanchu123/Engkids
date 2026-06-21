'use client';

import { useEffect, useState } from 'react';
import type { CollectedWord } from '@/game/farm/types';
import { pronounceWord } from '@/services/dictionary';

interface VocabCollectionPanelProps {
  open: boolean;
  words: CollectedWord[];
  onClose: () => void;
}

const MASTERY_MAX = 5;

/** Small mastery indicator: filled dots up to `mastery`, hollow dots after. */
function MasteryDots({ mastery }: { mastery: number }) {
  const filled = Math.max(0, Math.min(MASTERY_MAX, Math.round(mastery)));
  return (
    <span
      className="inline-flex gap-0.5"
      role="img"
      aria-label={`Mức thành thạo ${filled} trên ${MASTERY_MAX}`}
    >
      {Array.from({ length: MASTERY_MAX }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${i < filled ? 'bg-amber-400' : 'bg-slate-200'}`}
        />
      ))}
    </span>
  );
}

/**
 * Panel listing every vocabulary word the player has collected: English word,
 * Vietnamese meaning, a mastery indicator (0..5 dots), and how many times the
 * word has been seen. When the browser supports speech synthesis, each word
 * gets a speaker button that pronounces the English word; otherwise the button
 * is hidden gracefully. A friendly empty state shows before any words exist.
 */
export function VocabCollectionPanel({ open, words, onClose }: VocabCollectionPanelProps) {
  const [canSpeak, setCanSpeak] = useState(false);

  // Detect speech support on the client only (guards SSR + unsupported browsers).
  useEffect(() => {
    setCanSpeak(
      typeof window !== 'undefined' &&
        typeof window.speechSynthesis !== 'undefined' &&
        typeof pronounceWord === 'function',
    );
  }, []);

  if (!open) return null;

  const handleSpeak = (en: string) => {
    void pronounceWord(en);
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Bộ sưu tập từ vựng"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-pink-50 to-violet-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-pink-100 bg-white/80 px-5 py-4">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-2xl">📖</span>
            <div>
              <h2 className="text-xl font-black text-pink-600">Từ vựng đã thu thập</h2>
              <p className="text-xs font-bold text-slate-500">{words.length} từ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bộ sưu tập từ vựng"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-lg font-black text-slate-600 transition-colors hover:bg-rose-200 hover:text-rose-600 active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {words.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span aria-hidden="true" className="text-5xl">🌱</span>
              <p className="text-base font-black text-slate-600">Chưa thu thập từ nào</p>
              <p className="text-sm font-semibold text-slate-400">
                Hãy trồng và thu hoạch để học từ mới!
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {words.map((word) => (
                <li
                  key={word.en.toLowerCase()}
                  className="flex items-center gap-3 rounded-2xl border-2 border-pink-200 bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-black text-slate-800">{word.en}</span>
                      {canSpeak && (
                        <button
                          type="button"
                          onClick={() => handleSpeak(word.en)}
                          aria-label={`Phát âm từ ${word.en}`}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-colors hover:bg-violet-200 active:scale-95"
                        >
                          <span aria-hidden="true">🔊</span>
                        </button>
                      )}
                    </div>
                    <div className="truncate text-sm font-semibold text-slate-500">{word.vi}</div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <MasteryDots mastery={word.mastery} />
                    <span className="text-[11px] font-bold text-slate-400">
                      Đã gặp {word.timesSeen} lần
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default VocabCollectionPanel;
