'use client';

import { useState } from 'react';
import { videoApi, wordBankApi } from '@/services/api';
import { speakWord } from '@/services/dictionary';
import type { WordPair } from '@/lib/word-bank';

interface VocabExtractorProps {
  videoId: string;
  /** Whether the video has saved subtitles (extraction needs them). */
  hasSubtitles: boolean;
}

interface SelectableWord extends WordPair {
  selected: boolean;
}

// Lets an admin extract learn-worthy vocabulary from a video's subtitles using
// AI, review/select the words, then merge them into the shared word-bank that
// powers the vocabulary games. Nothing is saved until the admin clicks add.
export default function VocabExtractor({ videoId, hasSubtitles }: VocabExtractorProps) {
  const [words, setWords] = useState<SelectableWord[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [messageOk, setMessageOk] = useState(false);

  const setStatus = (text: string, ok: boolean) => {
    setMessage(text);
    setMessageOk(ok);
  };

  const handleExtract = async () => {
    setExtracting(true);
    setMessage('');
    try {
      const { words: extracted } = await videoApi.extractVocab(videoId);
      if (!extracted || extracted.length === 0) {
        setStatus('AI không trích được từ vựng. Kiểm tra phụ đề rồi thử lại.', false);
        return;
      }
      setWords(extracted.map((w) => ({ ...w, selected: true })));
      setStatus(`Đã trích ${extracted.length} từ. Bỏ chọn từ không cần rồi bấm "Thêm vào kho từ vựng".`, true);
    } catch (err) {
      console.error('Extract vocab error:', err);
      setStatus(err instanceof Error ? err.message : 'Trích từ vựng thất bại', false);
    } finally {
      setExtracting(false);
    }
  };

  const toggle = (index: number) => {
    setWords((prev) => prev.map((w, i) => (i === index ? { ...w, selected: !w.selected } : w)));
  };

  const updateWord = (index: number, patch: Partial<WordPair>) => {
    setWords((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  const handleAddToBank = async () => {
    const chosen = words
      .filter((w) => w.selected)
      .map((w) => ({ en: w.en.trim(), vi: w.vi.trim() }))
      .filter((w) => w.en && w.vi);

    if (chosen.length === 0) {
      setStatus('Chưa chọn từ nào để thêm.', false);
      return;
    }

    setAdding(true);
    setMessage('');
    try {
      // Merge with the existing bank, de-duplicating by English word.
      const { data: existing } = await wordBankApi.get();
      const seen = new Set(existing.map((w) => w.en.toLowerCase()));
      const additions = chosen.filter((w) => !seen.has(w.en.toLowerCase()));

      if (additions.length === 0) {
        setStatus('Tất cả từ đã có trong kho từ vựng.', true);
        return;
      }

      const merged = [...existing, ...additions];
      await wordBankApi.save(merged);
      setStatus(`Đã thêm ${additions.length} từ mới vào kho từ vựng (bỏ ${chosen.length - additions.length} từ trùng).`, true);
      // Remove added words from the review list.
      setWords((prev) => prev.filter((w) => !w.selected));
    } catch (err) {
      console.error('Add to word-bank error:', err);
      setStatus(err instanceof Error ? err.message : 'Thêm vào kho từ vựng thất bại', false);
    } finally {
      setAdding(false);
    }
  };

  const selectedCount = words.filter((w) => w.selected).length;

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Từ vựng từ video (AI)</h2>
          <p className="text-sm text-gray-500">
            Trích từ vựng đáng học từ phụ đề và thêm vào kho từ vựng dùng chung cho các game.
          </p>
        </div>
        <button
          onClick={handleExtract}
          disabled={extracting || !hasSubtitles}
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 font-semibold"
          title={hasSubtitles ? 'Dùng AI trích từ vựng từ phụ đề' : 'Cần có phụ đề đã lưu trước'}
        >
          {extracting ? 'Đang trích...' : '✨ Trích từ vựng (AI)'}
        </button>
      </div>

      {!hasSubtitles && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 text-amber-800 text-sm">
          Video chưa có phụ đề đã lưu. Hãy thêm/lưu phụ đề trước khi trích từ vựng.
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-md ${messageOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {words.length > 0 && (
        <>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
            {words.map((w, i) => (
              <div
                key={`${w.en}-${i}`}
                className={`flex items-center gap-2 rounded-lg border p-2 ${
                  w.selected ? 'border-violet-300 bg-violet-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={w.selected}
                  onChange={() => toggle(i)}
                  className="h-5 w-5 text-violet-600"
                  title="Chọn để thêm vào kho"
                />
                <input
                  type="text"
                  value={w.en}
                  onChange={(e) => updateWord(i, { en: e.target.value })}
                  className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  value={w.vi}
                  onChange={(e) => updateWord(i, { vi: e.target.value })}
                  className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => { if (w.en.trim()) speakWord(w.en.trim()); }}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 flex items-center justify-center"
                  title="Nghe phát âm"
                  aria-label="Nghe phát âm"
                >
                  🔊
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-sm text-gray-600">
              Đã chọn <span className="font-semibold">{selectedCount}</span>/{words.length} từ
            </span>
            <button
              onClick={handleAddToBank}
              disabled={adding || selectedCount === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 font-semibold"
            >
              {adding ? 'Đang thêm...' : 'Thêm vào kho từ vựng'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
