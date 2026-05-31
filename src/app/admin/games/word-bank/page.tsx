'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { WordPair } from '@/lib/word-bank';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function WordBankEditorPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [words, setWords] = useState<WordPair[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: WordPair[] }>('/api/games/word-bank');
      setWords(res.data);
    } catch {
      toast.error('Không tải được kho từ vựng');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (i: number, patch: Partial<WordPair>) => {
    setWords((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = words
        .map((w) => ({ en: w.en.trim(), vi: w.vi.trim() }))
        .filter((w) => w.en && w.vi);
      if (cleaned.length === 0) {
        toast.error('Cần ít nhất 1 từ có cả tiếng Anh và tiếng Việt.');
        setSaving(false);
        return;
      }
      await api.put('/api/games/word-bank', { data: cleaned }, { auth: true });
      toast.success('Đã lưu kho từ vựng!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner message="Đang tải kho từ vựng..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kho từ vựng</h1>
            <p className="text-gray-600 mt-1">
              Dùng chung cho 6 game. Mỗi từ gồm tiếng Anh và nghĩa tiếng Việt.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/games')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Quay lại
          </button>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-6">
          Lưu ý: game Word Puzzle chỉ dùng các từ tiếng Anh có đúng <strong>5 chữ cái</strong>.
          Hãy thêm đủ từ 5 chữ cái để game này phong phú.
        </div>

        <div className="space-y-2">
          {words.map((w, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
              <span className="w-8 text-center text-sm font-bold text-gray-400">{i + 1}</span>
              <input
                type="text"
                value={w.en}
                onChange={(e) => update(i, { en: e.target.value })}
                placeholder="English (vd: Apple)"
                className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={w.vi}
                onChange={(e) => update(i, { vi: e.target.value })}
                placeholder="Tiếng Việt (vd: Quả táo)"
                className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setWords((prev) => prev.filter((_, idx) => idx !== i))}
                className="h-8 w-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                title="Xoá từ"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 mt-6 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <button
              onClick={() => setWords((prev) => [...prev, { en: '', vi: '' }])}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold"
            >
              + Thêm từ
            </button>
            <span className="text-sm text-gray-500">{words.length} từ</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 font-semibold"
            >
              {saving ? 'Đang lưu...' : 'Lưu kho từ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
