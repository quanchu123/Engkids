'use client';

/**
 * F4 â€” "Báº£ng phá»¥ huynh" (Parent dashboard).
 *
 * A read-only summary of the child's learning progress aimed at parents.
 * Cleaner / less childish than the kid-facing pages, but still friendly.
 *
 * NOTE ON THE PIN GATE: the optional 4-digit PIN stored in localStorage
 * (key `engkids.parentPin`) is a SOFT, CLIENT-ONLY gate. It is meant to keep a
 * curious child out, not to provide real security â€” anyone with devtools or
 * filesystem access can read or clear it. Do not treat it as authentication.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  BookOpenCheck,
  Flame,
  Gamepad2,
  GraduationCap,
  Lock,
  RefreshCw,
  Save,
  Sparkles,
  Star,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getVocabularyStats } from '@/services/vocabulary';
import {
  summarizeProgress,
  getRecentActivity,
  getWeeklyActivityCounts,
  MASTERED_THRESHOLD,
  type ActivityKind,
} from '@/lib/parent-stats';
import { CURRICULUM_STAGES, type CurriculumStageId } from '@/lib/curriculum';
import type { LearnerCurriculumState } from '@/services/curriculum-content';

const PIN_STORAGE_KEY = 'engkids.parentPin';

type GateMode = 'loading' | 'setup' | 'enter' | 'unlocked';

export default function ParentDashboardPage() {
  const progress = useAppStore((state) => state.progress);
  const hydrated = useAppStore((state) => state.hydrated);

  const [mode, setMode] = useState<GateMode>('loading');

  // Decide which gate to show once we are on the client (localStorage access).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PIN_STORAGE_KEY);
      setMode(stored ? 'enter' : 'setup');
    } catch {
      // localStorage unavailable (privacy mode / SSR edge) â€” fall back to open.
      setMode('unlocked');
    }
  }, []);

  if (mode === 'loading') {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" />
      </>
    );
  }

  if (mode !== 'unlocked') {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-24">
          <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
            <PinGate mode={mode} onUnlock={() => setMode('unlocked')} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <Dashboard progress={progress} hydrated={hydrated} />
    </>
  );
}

/* ----------------------------- PIN gate ----------------------------- */

function PinGate({ mode, onUnlock }: { mode: GateMode; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const isValidPin = (value: string) => /^\d{4}$/.test(value);

  const handleSetup = () => {
    if (!isValidPin(pin)) {
      setError('MÃ£ PIN pháº£i gá»“m Ä‘Ãºng 4 chá»¯ sá»‘.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Hai mÃ£ PIN chÆ°a khá»›p nhau.');
      return;
    }
    try {
      window.localStorage.setItem(PIN_STORAGE_KEY, pin);
    } catch {
      // Ignore storage failures; still let the parent in for this session.
    }
    onUnlock();
  };

  const handleEnter = () => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(PIN_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (pin === stored) {
      onUnlock();
    } else {
      setError('MÃ£ PIN khÃ´ng Ä‘Ãºng. Vui lÃ²ng thá»­ láº¡i.');
    }
  };

  return (
    <div className="toy-panel w-full rounded-3xl p-8 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
        <Lock className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Báº£ng phá»¥ huynh</h1>

      {mode === 'setup' ? (
        <>
          <p className="mt-2 text-sm text-slate-500">
            Äáº·t mÃ£ PIN (4 sá»‘) Ä‘á»ƒ báº£o vá»‡ khu vá»±c dÃ nh cho phá»¥ huynh, hoáº·c bá» qua Ä‘á»ƒ xem ngay.
          </p>
          <div className="mt-6 space-y-3 text-left">
            <PinInput label="MÃ£ PIN (4 sá»‘)" value={pin} onChange={setPin} />
            <PinInput label="Nháº­p láº¡i mÃ£ PIN" value={confirmPin} onChange={setConfirmPin} />
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleSetup}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Äáº·t mÃ£ PIN vÃ  tiáº¿p tá»¥c
            </button>
            <button
              onClick={onUnlock}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              Bá» qua
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-500">Nháº­p mÃ£ PIN Ä‘á»ƒ xem tiáº¿n Ä‘á»™ há»c táº­p cá»§a bÃ©.</p>
          <div className="mt-6 text-left">
            <PinInput label="MÃ£ PIN" value={pin} onChange={setPin} onEnter={handleEnter} />
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <button
            onClick={handleEnter}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Má»Ÿ khÃ³a
          </button>
        </>
      )}
      <p className="mt-5 text-xs text-slate-400">
        MÃ£ PIN chá»‰ lÃ  lá»›p báº£o vá»‡ nháº¹ trÃªn thiáº¿t bá»‹ nÃ y, khÃ´ng pháº£i báº£o máº­t tháº­t sá»±.
      </p>
    </div>
  );
}

function PinInput({
  label,
  value,
  onChange,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && onEnter) onEnter();
        }}
        className="soft-panel w-full rounded-2xl px-4 py-3 text-center text-lg font-bold tracking-[0.5em] text-slate-700 outline-none"
        placeholder="â€¢â€¢â€¢â€¢"
      />
    </label>
  );
}

/* ----------------------------- Dashboard ----------------------------- */

interface DashboardProps {
  progress: ReturnType<typeof useAppStore.getState>['progress'];
  hydrated: boolean;
}

function Dashboard({ progress, hydrated }: DashboardProps) {
  const summary = useMemo(() => summarizeProgress(progress), [progress]);
  const recent = useMemo(() => getRecentActivity(progress, 10), [progress]);
  const weekly = useMemo(() => getWeeklyActivityCounts(progress), [progress]);

  const masteredWords = useMemo(
    () => progress.savedWords.filter((word) => (word.masteryLevel ?? 0) >= MASTERED_THRESHOLD),
    [progress.savedWords],
  );

  // `dueToday` comes from the SRS service which may throw for guests.
  const [dueToday, setDueToday] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stats = await getVocabularyStats();
        if (active) setDueToday(stats.dueToday);
      } catch {
        if (active) setDueToday(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const maxWeekly = Math.max(1, ...weekly.map((d) => d.count));

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Báº£ng phá»¥ huynh</h1>
              <p className="text-sm text-slate-500">Tá»•ng quan hÃ nh trÃ¬nh há»c tiáº¿ng Anh cá»§a bÃ©</p>
            </div>
          </div>
        </header>

        {/* Metric cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard icon={<GraduationCap className="h-5 w-5" />} label="Tá»« Ä‘Ã£ há»c" value={summary.wordsLearned} tint="from-sky-500 to-indigo-500" />
          <MetricCard icon={<Sparkles className="h-5 w-5" />} label="Tá»« thÃ nh tháº¡o" value={summary.wordsMastered} tint="from-emerald-500 to-teal-500" />
          <MetricCard icon={<BookOpenCheck className="h-5 w-5" />} label="Truyá»‡n hoÃ n thÃ nh" value={summary.storiesCompleted} tint="from-violet-500 to-fuchsia-500" />
          <MetricCard icon={<Gamepad2 className="h-5 w-5" />} label="LÆ°á»£t chÆ¡i game" value={summary.gamesPlayed} tint="from-orange-500 to-amber-500" />
          <MetricCard icon={<Star className="h-5 w-5" />} label="Tá»•ng sao" value={summary.totalStars} tint="from-amber-500 to-yellow-500" />
          <MetricCard icon={<Flame className="h-5 w-5" />} label="Chuá»—i ngÃ y há»c" value={summary.currentStreak} tint="from-rose-500 to-pink-500" />
          <MetricCard icon={<Award className="h-5 w-5" />} label="Huy hiá»‡u" value={summary.badgesUnlocked} tint="from-indigo-500 to-blue-500" />
          <MetricCard
            icon={<RefreshCw className="h-5 w-5" />}
            label="Tá»« cáº§n Ã´n hÃ´m nay"
            value={dueToday ?? 'â€”'}
            tint="from-cyan-500 to-sky-500"
          />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Weekly activity chart */}
          <section className="toy-panel rounded-3xl p-6">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Hoáº¡t Ä‘á»™ng 7 ngÃ y qua</h2>
            </div>
            <div className="flex h-44 items-end justify-between gap-2">
              {weekly.map((day) => {
                const heightPct = day.count === 0 ? 4 : Math.round((day.count / maxWeekly) * 100);
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">{day.count > 0 ? day.count : ''}</span>
                    <div className="flex h-32 w-full items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-400 transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${day.date}: ${day.count} hoáº¡t Ä‘á»™ng`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400">{formatDayLabel(day.date)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent activity */}
          <section className="toy-panel rounded-3xl p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-900">Hoáº¡t Ä‘á»™ng gáº§n Ä‘Ã¢y</h2>
            {recent.length > 0 ? (
              <ul className="space-y-3">
                {recent.map((item, index) => (
                  <li key={`${item.kind}-${index}`} className="soft-panel flex items-center gap-3 rounded-2xl px-4 py-3">
                    <ActivityIcon kind={item.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{item.labelVi}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(item.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng nÃ o Ä‘Æ°á»£c ghi nháº­n.</p>
            )}
          </section>
        </div>

        <LevelSettings />

        {/* Mastered words */}
        <section className="toy-panel mt-6 rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900">Tá»« vá»±ng bÃ© Ä‘Ã£ thÃ nh tháº¡o</h2>
            <span className="kid-chip ml-1 px-3 py-1 text-xs font-bold text-emerald-700">{masteredWords.length}</span>
          </div>
          {masteredWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {masteredWords.map((word) => (
                <span key={word.word} className="soft-panel rounded-2xl px-4 py-2 text-sm">
                  <span className="font-bold text-slate-800">{word.word}</span>
                  {word.vi && <span className="ml-2 text-slate-400">{word.vi}</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">
              BÃ© chÆ°a cÃ³ tá»« nÃ o Ä‘áº¡t má»©c thÃ nh tháº¡o. HÃ£y cÃ¹ng bÃ© luyá»‡n táº­p thÃªm nhÃ©!
            </p>
          )}
        </section>

        {!hydrated && (
          <p className="mt-6 text-center text-xs text-slate-400">Äang táº£i dá»¯ liá»‡u tiáº¿n Ä‘á»™...</p>
        )}
      </div>
    </main>
  );
}

/* ----------------------------- Small UI bits ----------------------------- */

function MetricCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tint: string;
}) {
  return (
    <div className="toy-panel rounded-3xl p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${tint} text-white shadow`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const map: Record<ActivityKind, { icon: React.ReactNode; tint: string }> = {
    word: { icon: <GraduationCap className="h-4 w-4" />, tint: 'from-sky-500 to-indigo-500' },
    story: { icon: <BookOpenCheck className="h-4 w-4" />, tint: 'from-violet-500 to-fuchsia-500' },
    game: { icon: <Gamepad2 className="h-4 w-4" />, tint: 'from-orange-500 to-amber-500' },
  };
  const { icon, tint } = map[kind];
  return (
    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white`}>
      {icon}
    </div>
  );
}

function LevelSettings() {
  const [learnerState, setLearnerState] = useState<LearnerCurriculumState | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<CurriculumStageId>('a2-key');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/learner/level', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active) return;
        const state = data?.learnerState as LearnerCurriculumState | null | undefined;
        if (state?.currentStageId) {
          setLearnerState(state);
          setSelectedStageId(state.currentStageId);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (!confirm('Äá»•i level sáº½ cáº­p nháº­t Today Plan vÃ  ná»™i dung Æ°u tiÃªn. Lá»‹ch sá»­ bÃ i kiá»ƒm tra/progress váº«n Ä‘Æ°á»£c giá»¯. Tiáº¿p tá»¥c?')) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/learner/level', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: selectedStageId, source: 'parent' }),
      });
      if (!response.ok) throw new Error('KhÃ´ng lÆ°u Ä‘Æ°á»£c level.');
      const data = await response.json();
      setLearnerState(data.learnerState || null);
      setMessage('ÄÃ£ cáº­p nháº­t level há»c cho bÃ©.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'KhÃ´ng lÆ°u Ä‘Æ°á»£c level.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="toy-panel mt-6 rounded-3xl p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900">Level há»c cá»§a bÃ©</h2>
          </div>
          <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Level nÃ y dÃ¹ng Ä‘á»ƒ Æ°u tiÃªn truyá»‡n, video, game tá»« vá»±ng vÃ  checkpoint. Äá»•i level khÃ´ng xÃ³a lá»‹ch sá»­ há»c.
          </p>
        </div>
        {learnerState?.selectedLevelAt && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            ÄÃ£ chá»n {formatDateTime(learnerState.selectedLevelAt)}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm font-bold text-slate-400">Äang táº£i level...</p>
      ) : learnerState ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Cháº·ng hiá»‡n táº¡i</span>
            <select
              value={selectedStageId}
              onChange={(event) => setSelectedStageId(event.target.value as CurriculumStageId)}
              className="soft-panel w-full rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
            >
              {CURRICULUM_STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.cefr} - {stage.titleVi}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={save}
            disabled={saving || selectedStageId === learnerState.currentStageId}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Äang lÆ°u...' : 'LÆ°u level'}
          </button>
        </div>
      ) : (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          ÄÄƒng nháº­p tÃ i khoáº£n há»c Ä‘á»ƒ lÆ°u level vÃ o database.
        </p>
      )}

      {message && <p className="mt-3 text-sm font-bold text-slate-500">{message}</p>}
    </section>
  );
}

/* ----------------------------- Formatting ----------------------------- */

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function formatDayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return WEEKDAY_LABELS[date.getDay()] ?? dateKey;
}

function formatDateTime(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

