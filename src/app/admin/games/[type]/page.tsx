'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '@/types/games';
import type { GameDifficulty, MCContent, TFContent, MCQuestion, TFQuestion } from '@/types/games';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const TITLES: Record<string, string> = {
  'multiple-choice': 'Trắc nghiệm (Multiple Choice)',
  'true-false': 'Đúng / Sai (True / False)',
};

function emptyMC(): MCQuestion {
  return { id: Date.now(), question: '', options: ['', ''], answer: '', explanation: '' };
}

function emptyTF(): TFQuestion {
  return { id: Date.now(), text: '', answer: true, explanation: '' };
}

export default function GameEditorPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const gameType = params.type as string;
  const isMC = gameType === 'multiple-choice';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState<GameDifficulty>('beginner');
  const [mc, setMc] = useState<MCContent>({ beginner: [], intermediate: [], advanced: [] });
  const [tf, setTf] = useState<TFContent>({ beginner: [], intermediate: [], advanced: [] });

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: MCContent | TFContent }>(`/api/games/${gameType}`);
      if (isMC) setMc(res.data as MCContent);
      else setTf(res.data as TFContent);
    } catch {
      toast.error('Không tải được nội dung game');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType, isMC]);

  useEffect(() => {
    if (!TITLES[gameType]) {
      router.push('/admin/games');
      return;
    }
    load();
  }, [gameType, load, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/api/games/${gameType}`, { data: isMC ? mc : tf }, { auth: true });
      toast.success('Đã lưu nội dung game!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Đang tải nội dung..." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="admin-card flex items-center justify-between p-5">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">{TITLES[gameType]}</h1>
          <p className="mt-1 text-admin-text-muted">Chỉnh sửa câu hỏi theo từng cấp độ.</p>
        </div>
        <button
          onClick={() => router.push('/admin/games')}
          className="admin-btn admin-btn-ghost"
        >
          ← Quay lại
        </button>
      </header>

      {/* Difficulty tabs */}
      <div className="inline-flex gap-1 rounded-xl bg-admin-surface-muted p-1">
        {DIFFICULTIES.map((d) => {
          const count = (isMC ? mc[d] : tf[d]).length;
          return (
            <button
              key={d}
              onClick={() => setLevel(d)}
              className={`admin-tab ${level === d ? 'admin-tab-active' : ''}`}
            >
              {DIFFICULTY_LABELS[d]} ({count})
            </button>
          );
        })}
      </div>

      {isMC ? (
        <McEditor
          items={mc[level]}
          onChange={(items) => setMc((prev) => ({ ...prev, [level]: items }))}
        />
      ) : (
        <TfEditor
          items={tf[level]}
          onChange={(items) => setTf((prev) => ({ ...prev, [level]: items }))}
        />
      )}

      <div className="sticky bottom-0 mt-8 border-t border-admin-border bg-admin-surface/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            onClick={() => (isMC
              ? setMc((p) => ({ ...p, [level]: [...p[level], emptyMC()] }))
              : setTf((p) => ({ ...p, [level]: [...p[level], emptyTF()] })))}
            className="admin-btn text-white"
            style={{ background: 'var(--admin-success)' }}
          >
            + Thêm câu hỏi
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="admin-btn admin-btn-primary"
          >
            {saving ? 'Đang lưu...' : 'Lưu tất cả'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Multiple-choice editor ----
function McEditor({ items, onChange }: { items: MCQuestion[]; onChange: (items: MCQuestion[]) => void }) {
  const update = (i: number, patch: Partial<MCQuestion>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const updateOption = (qi: number, oi: number, value: string) => {
    const next = [...items];
    const options = [...next[qi].options];
    options[oi] = value;
    next[qi] = { ...next[qi], options };
    onChange(next);
  };

  if (items.length === 0) {
    return <p className="text-center text-admin-text-muted py-10">Chưa có câu hỏi. Bấm “Thêm câu hỏi”.</p>;
  }

  return (
    <div className="space-y-5">
      {items.map((q, qi) => (
        <div key={qi} className="admin-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold text-admin-text-muted">Câu #{qi + 1}</span>
            <button
              onClick={() => onChange(items.filter((_, i) => i !== qi))}
              className="h-8 w-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
              title="Xoá"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={q.question}
            onChange={(e) => update(qi, { question: e.target.value })}
            placeholder="Nội dung câu hỏi"
            className="admin-input mb-3"
          />
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`mc-${qi}`}
                  checked={q.answer === opt && opt !== ''}
                  onChange={() => update(qi, { answer: opt })}
                  className="h-5 w-5"
                  title="Đáp án đúng"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const wasAnswer = q.answer === opt;
                    updateOption(qi, oi, e.target.value);
                    if (wasAnswer) update(qi, { answer: e.target.value });
                  }}
                  placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                  className={`admin-input flex-1 ${
                    q.answer === opt && opt !== '' ? 'border-green-400 bg-green-50' : ''
                  }`}
                />
                {q.options.length > 2 && (
                  <button
                    onClick={() => {
                      const options = q.options.filter((_, i) => i !== oi);
                      update(qi, { options, answer: options.includes(q.answer) ? q.answer : '' });
                    }}
                    className="h-7 w-7 rounded-full bg-admin-surface-muted text-admin-text-muted hover:bg-admin-surface-muted"
                  >
                    −
                  </button>
                )}
              </div>
            ))}
          </div>
          {q.options.length < 4 && (
            <button
              onClick={() => update(qi, { options: [...q.options, ''] })}
              className="mt-2 text-sm font-medium text-admin-primary hover:underline"
            >
              + Thêm đáp án
            </button>
          )}
          <input
            type="text"
            value={q.explanation}
            onChange={(e) => update(qi, { explanation: e.target.value })}
            placeholder="Giải thích (tuỳ chọn)"
            className="admin-input mt-3"
          />
        </div>
      ))}
    </div>
  );
}

// ---- True/False editor ----
function TfEditor({ items, onChange }: { items: TFQuestion[]; onChange: (items: TFQuestion[]) => void }) {
  const update = (i: number, patch: Partial<TFQuestion>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  if (items.length === 0) {
    return <p className="text-center text-admin-text-muted py-10">Chưa có câu hỏi. Bấm “Thêm câu hỏi”.</p>;
  }

  return (
    <div className="space-y-5">
      {items.map((q, qi) => (
        <div key={qi} className="admin-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-bold text-admin-text-muted">Câu #{qi + 1}</span>
            <button
              onClick={() => onChange(items.filter((_, i) => i !== qi))}
              className="h-8 w-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
              title="Xoá"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={q.text}
            onChange={(e) => update(qi, { text: e.target.value })}
            placeholder="Câu khẳng định (vd: The sky is blue.)"
            className="admin-input mb-3"
          />
          <div className="mb-3 flex gap-3">
            <button
              onClick={() => update(qi, { answer: true })}
              className={`flex-1 rounded-md py-2 font-bold ${q.answer ? 'bg-green-500 text-white' : 'bg-admin-surface-muted text-admin-text-muted'}`}
            >
              Đúng (True)
            </button>
            <button
              onClick={() => update(qi, { answer: false })}
              className={`flex-1 rounded-md py-2 font-bold ${!q.answer ? 'bg-red-500 text-white' : 'bg-admin-surface-muted text-admin-text-muted'}`}
            >
              Sai (False)
            </button>
          </div>
          <input
            type="text"
            value={q.explanation}
            onChange={(e) => update(qi, { explanation: e.target.value })}
            placeholder="Giải thích (tuỳ chọn)"
            className="admin-input"
          />
        </div>
      ))}
    </div>
  );
}
