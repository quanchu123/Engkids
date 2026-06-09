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
      toast.error('KhÃ´ng táº£i Ä‘Æ°á»£c kho tá»« vá»±ng');
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
    if (words.length > 0 && !confirm('Náº¡p bá»™ seed chuáº©n Engkids sáº½ thay danh sÃ¡ch Ä‘ang chá»‰nh trÃªn mÃ n hÃ¬nh. Tiáº¿p tá»¥c?')) return;
    setWords(DEFAULT_WORD_BANK.map(enrichWordPair));
    toast.success(`ÄÃ£ náº¡p ${DEFAULT_WORD_BANK.length} tá»« theo lá»™ trÃ¬nh Engkids.`);
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
        toast.error('Cáº§n Ã­t nháº¥t 1 tá»« cÃ³ cáº£ tiáº¿ng Anh vÃ  tiáº¿ng Viá»‡t.');
        setSaving(false);
        return;
      }
      await api.put('/api/games/word-bank', { data: cleaned }, { auth: true });
      toast.success('ÄÃ£ lÆ°u kho tá»« vá»±ng!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'LÆ°u tháº¥t báº¡i');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Äang táº£i kho tá»« vá»±ng..." />;
  }

  return (
    <div className="space-y-6">
      <header className="admin-card flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-primary">Game content</p>
          <h1 className="mt-1 text-3xl font-black text-admin-text">Word bank theo lá»™ trÃ¬nh</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-admin-text-muted">
            Bá»™ tá»« nÃ y dÃ¹ng chung cho matching, farm, pet, RPG, fill blank, sentence scramble. Má»—i tá»« nÃªn cÃ³ cáº¥p Ä‘á»™, topic vÃ  cÃ¢u vÃ­ dá»¥ Ä‘á»ƒ game tá»± chá»n Ä‘Ãºng Ä‘á»™ khÃ³.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => router.push('/admin/games')} className="admin-btn admin-btn-secondary">
            Quay láº¡i
          </button>
          <button type="button" onClick={loadEngkidsSeed} className="admin-btn admin-btn-secondary">
            Náº¡p bá»™ chuáº©n Engkids
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary">
            {saving ? 'Äang lÆ°u...' : 'LÆ°u kho tá»«'}
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tá»•ng tá»«" value={stats.total} />
        <StatCard label="Tá»« 5 chá»¯" value={stats.fiveLetterCount} helper="Cho Word Puzzle" />
        <StatCard label="CÃ³ cÃ¢u vÃ­ dá»¥" value={stats.exampleCount} />
        <StatCard label="Topic" value={topics.length} />
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <QualityCard
          title="Stage dÆ°á»›i chuáº©n"
          empty="Má»i stage Ä‘áº¡t sá»‘ lÆ°á»£ng tá»‘i thiá»ƒu."
          items={quality.stagesBelowTarget.map(({ stage, count, target }) => `${stage.cefr}: ${count}/${target}`)}
        />
        <QualityCard
          title="Topic quÃ¡ Ã­t tá»«"
          empty="Topic nÃ o cÅ©ng Ä‘á»§ dá»¯ liá»‡u cÆ¡ báº£n."
          items={quality.thinTopics.slice(0, 8).map(([topic, count]) => `${topic}: ${count}`)}
        />
        <QualityCard
          title="Thiáº¿u example"
          empty="Táº¥t cáº£ tá»« Ä‘ang cÃ³ cÃ¢u vÃ­ dá»¥."
          items={quality.missingExamples.map((word) => word.en)}
        />
      </section>

      <section className="admin-card p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-admin-text">PhÃ¢n bá»• theo cháº·ng</h2>
            <p className="text-sm font-semibold text-admin-text-muted">DÃ¹ng Ä‘á»ƒ kiá»ƒm tra game easy/medium/hard cÃ³ Ä‘á»§ tá»« phÃ¹ há»£p.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
            NÃªn giá»¯ Ã­t nháº¥t 5 tá»« 5 chá»¯ cho Word Puzzle
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
              <h2 className="text-lg font-black text-admin-text">Danh sÃ¡ch tá»«</h2>
              <p className="text-sm font-semibold text-admin-text-muted">CÃ¢u vÃ­ dá»¥ nÃªn chá»©a chÃ­nh xÃ¡c tá»« tiáº¿ng Anh Ä‘á»ƒ Fill Blanks tá»± táº¡o chá»— trá»‘ng.</p>
            </div>
            <p className="text-sm font-black text-admin-text-muted">Äang xem {visibleWords.length}/{words.length} tá»«</p>
          </div>
          <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_190px_180px_auto]">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="TÃ¬m English, Vietnamese hoáº·c example"
              className="admin-input"
            />
            <select
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value as CurriculumStageId | 'all')}
              className="admin-input text-sm font-semibold"
            >
              <option value="all">Táº¥t cáº£ level</option>
              {CURRICULUM_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.cefr}</option>
              ))}
            </select>
            <select
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
              className="admin-input text-sm font-semibold"
            >
              <option value="all">Táº¥t cáº£ topic</option>
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
              XÃ³a lá»c
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
                placeholder="Tiáº¿ng Viá»‡t"
                className="admin-input"
              />
              <select
                value={w.level ?? 'pre-a1-starters'}
                onChange={(e) => update(i, { level: e.target.value as CurriculumStageId })}
                className="admin-input text-sm font-semibold"
                title="Cáº¥p Ä‘á»™"
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
                title="XÃ³a tá»«"
              >
                Ã—
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
              KhÃ´ng cÃ³ tá»« nÃ o khá»›p bá»™ lá»c hiá»‡n táº¡i.
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
            ThÃªm tá»«
          </button>
          <span className="text-sm font-black text-admin-text-muted">{words.length} tá»«</span>
          <button type="button" onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary">
            {saving ? 'Äang lÆ°u...' : 'LÆ°u kho tá»«'}
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

