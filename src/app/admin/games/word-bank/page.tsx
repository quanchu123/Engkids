'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import type { WordPair } from '@/lib/word-bank';
import { DEFAULT_WORD_BANK, enrichWordPair, getWordBankStats, getWordBankTopics } from '@/lib/word-bank';
import { CURRICULUM_STAGES, type CurriculumStageId } from '@/lib/curriculum';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const STAGE_MINIMUMS: Record<CurriculumStageId, number> = {
  'a2-key': 1000,
  'b1-preliminary': 1200,
  'b2-first': 1400,
  'c1-advanced': 1600,
};

export default function WordBankEditorPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [words, setWords] = useState<WordPair[]>([]);

  const [levelFilter, setLevelFilter] = useState<CurriculumStageId | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: WordPair[] }>('/api/games/word-bank');
      const loaded = Array.isArray(res.data) && res.data.length > 0
        ? res.data.map(enrichWordPair)
        : DEFAULT_WORD_BANK.map(enrichWordPair);
      setWords(loaded);
    } catch {
      toast.error('Không tải được kho từ vựng');
      setWords(DEFAULT_WORD_BANK.map(enrichWordPair));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => getWordBankStats(words), [words]);
  const topics = useMemo(() => getWordBankTopics(words), [words]);
  const quality = useMemo(() => {
    const stagesBelowTarget = CURRICULUM_STAGES
      .map((stage) => ({ stage, count: stats.byLevel[stage.id] ?? 0, target: STAGE_MINIMUMS[stage.id] }))
      .filter((item) => item.count < item.target);
    const thinTopics = Object.entries(stats.byTopic)
      .filter(([, count]) => count < 10)
      .sort((a, b) => a[1] - b[1]);
    const missingExamples = words.filter((word) => !word.example?.trim()).slice(0, 12);
    return { stagesBelowTarget, thinTopics, missingExamples };
  }, [stats, words]);
  const visibleWords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return words
      .map((word, index) => ({ word, index }))
      .filter(({ word }) => {
        if (levelFilter !== 'all' && word.level !== levelFilter) return false;
        if (topicFilter !== 'all' && word.topic !== topicFilter) return false;
        if (!query) return true;
        return word.en.toLowerCase().includes(query) ||
          word.vi.toLowerCase().includes(query) ||
          (word.example ?? '').toLowerCase().includes(query);
      });
  }, [levelFilter, searchQuery, topicFilter, words]);


  const update = (i: number, patch: Partial<WordPair>) => {
    setWords((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const loadEngkidsSeed = () => {
    if (words.length > 0 && !confirm('Nạp bộ seed chuẩn Engkids sẽ thay danh sách đang chỉnh trên màn hình. Tiếp tục?')) return;
    setWords(DEFAULT_WORD_BANK.map(enrichWordPair));
    toast.success(`Đã nạp ${DEFAULT_WORD_BANK.length} từ theo lộ trình Engkids.`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = words
        .map((w) => ({
          en: w.en.trim(),
          vi: w.vi.trim(),
          level: w.level,
          topic: w.topic?.trim().toLowerCase() || undefined,
          example: w.example?.trim() || undefined,
        }))
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
    return <LoadingSpinner message="Đang tải kho từ vựng..." />;
  }

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Game content</p>
          <h1 className="mt-1 text-3xl font-black text-admin-text">Word bank theo lộ trình</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-admin-text-muted">
            Bộ từ này dùng chung cho matching, farm, pet, RPG, fill blank, sentence scramble. Mỗi từ nên có cấp độ, topic và câu ví dụ để game tự chọn đúng độ khó.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => router.push('/admin/games')} className="admin-btn admin-btn-secondary">
            Quay lại
          </button>
          <button type="button" onClick={loadEngkidsSeed} className="admin-btn admin-btn-secondary">
            Nạp bộ chuẩn Engkids
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary">
            {saving ? 'Đang lưu...' : 'Lưu kho từ'}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng từ" value={stats.total} />
        <StatCard label="Từ 5 chữ" value={stats.fiveLetterCount} helper="Cho Word Puzzle" />
        <StatCard label="Có câu ví dụ" value={stats.exampleCount} />
        <StatCard label="Topic" value={topics.length} />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <QualityCard
          title="Stage dưới chuẩn"
          empty="Mọi stage đạt số lượng tối thiểu."
          items={quality.stagesBelowTarget.map(({ stage, count, target }) => `${stage.cefr}: ${count}/${target}`)}
        />
        <QualityCard
          title="Topic quá ít từ"
          empty="Topic nào cÅ©ng đủ dữ liệu cơ bản."
          items={quality.thinTopics.slice(0, 8).map(([topic, count]) => `${topic}: ${count}`)}
        />
        <QualityCard
          title="Thiếu example"
          empty="Tất cả từ đang có câu ví dụ."
          items={quality.missingExamples.map((word) => word.en)}
        />
      </section>

      <section className="admin-card p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-admin-text">Phân bổ theo chặng</h2>
            <p className="text-sm font-semibold text-admin-text-muted">Dùng để kiểm tra game easy/medium/hard có đủ từ phù hợp.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            Nên giữ ít nhất 5 từ 5 chữ cho Word Puzzle
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {CURRICULUM_STAGES.map((stage) => (
            <div key={stage.id} className="rounded-xl bg-admin-surface-muted p-3">
              <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{stage.cefr}</p>
              <p className="mt-1 text-2xl font-black text-admin-text">{stats.byLevel[stage.id] ?? 0}</p>
              <p className="mt-1 text-xs font-bold text-admin-text-muted">{stage.titleVi}</p>
            </div>
          ))}
        </div>
        {topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {topics.slice(0, 18).map((topic) => (
              <span key={topic} className="rounded-full bg-white px-3 py-1 text-xs font-black text-admin-primary ring-1 ring-admin-border">
                {topic}: {stats.byTopic[topic]}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="admin-card overflow-hidden">
        <div className="border-b border-admin-border p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-admin-text">Danh sách từ</h2>
              <p className="text-sm font-semibold text-admin-text-muted">Câu ví dụ nên chứa chính xác từ tiếng Anh để Fill Blanks tự tạo chỗ trống.</p>
            </div>
            <p className="text-sm font-black text-admin-text-muted">Đang xem {visibleWords.length}/{words.length} từ</p>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_190px_180px_auto]">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm English, Vietnamese hoặc example"
              className="admin-input"
            />
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value as CurriculumStageId | 'all')}
              className="admin-input text-sm font-semibold"
            >
              <option value="all">Tất cả level</option>
              {CURRICULUM_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.cefr}</option>
              ))}
            </select>
            <select
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="admin-input text-sm font-semibold"
            >
              <option value="all">Tất cả topic</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setLevelFilter('all');
                setTopicFilter('all');
              }}
              className="admin-btn admin-btn-secondary justify-center"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <div className="divide-y divide-admin-border">
          {visibleWords.map(({ word: w, index: i }) => (
            <div key={i} className="grid gap-2 p-3 md:grid-cols-[42px_1fr_1fr_170px_150px_44px]">
              <span className="flex h-10 items-center justify-center text-sm font-black text-admin-text-muted">{i + 1}</span>
              <input
                type="text"
                value={w.en}
                onChange={(e) => update(i, { en: e.target.value })}
                placeholder="English"
                className="admin-input"
              />
              <input
                type="text"
                value={w.vi}
                onChange={(e) => update(i, { vi: e.target.value })}
                placeholder="Tiếng Việt"
                className="admin-input"
              />
              <select
                value={w.level ?? 'pre-a1-starters'}
                onChange={(e) => update(i, { level: e.target.value as CurriculumStageId })}
                className="admin-input text-sm font-semibold"
                title="Cấp độ"
              >
                {CURRICULUM_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>{stage.cefr}</option>
                ))}
              </select>
              <input
                type="text"
                value={w.topic ?? ''}
                onChange={(e) => update(i, { topic: e.target.value })}
                placeholder="topic"
                className="admin-input text-sm"
              />
              <button
                type="button"
                onClick={() => setWords((prev) => prev.filter((_, idx) => idx !== i))}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-red-600 transition-colors hover:bg-red-100"
                title="Xóa từ"
              >
                ×
              </button>
              <input
                type="text"
                value={w.example ?? ''}
                onChange={(e) => update(i, { example: e.target.value })}
                placeholder="Example sentence"
                className="admin-input md:col-span-5 md:col-start-2"
              />
            </div>
          ))}
        </div>
          {visibleWords.length === 0 && (
            <div className="p-8 text-center text-sm font-bold text-admin-text-muted">
              Không có từ nào khớp bộ lọc hiện tại.
            </div>
          )}
      </section>

      <div className="sticky bottom-0 -mx-6 border-t border-admin-border bg-admin-bg/90 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setWords((prev) => [...prev, { en: '', vi: '', level: 'pre-a1-starters', topic: '', example: '' }])}
            className="admin-btn admin-btn-secondary"
          >
            Thêm từ
          </button>
          <span className="text-sm font-black text-admin-text-muted">{words.length} từ</span>
          <button type="button" onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary">
            {saving ? 'Đang lưu...' : 'Lưu kho từ'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{label}</p>
      <p className="mt-1 text-3xl font-black text-admin-text">{value}</p>
      {helper && <p className="mt-1 text-xs font-bold text-admin-text-muted">{helper}</p>}
    </div>
  );
}

function QualityCard({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="admin-card p-4">
      <p className="text-xs font-black uppercase tracking-wide text-admin-text-muted">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{empty}</p>
      )}
    </div>
  );
}

