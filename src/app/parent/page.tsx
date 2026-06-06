'use client';

/**
 * F4 — "Bảng phụ huynh" (Parent dashboard).
 *
 * A read-only summary of the child's learning progress aimed at parents.
 * Cleaner / less childish than the kid-facing pages, but still friendly.
 *
 * NOTE ON THE PIN GATE: the optional 4-digit PIN stored in localStorage
 * (key `engkids.parentPin`) is a SOFT, CLIENT-ONLY gate. It is meant to keep a
 * curious child out, not to provide real security — anyone with devtools or
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
      // localStorage unavailable (privacy mode / SSR edge) — fall back to open.
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
      setError('Mã PIN phải gồm đúng 4 chữ số.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Hai mã PIN chưa khớp nhau.');
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
      setError('Mã PIN không đúng. Vui lòng thử lại.');
    }
  };

  return (
    <div className="toy-panel w-full rounded-3xl p-8 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
        <Lock className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Bảng phụ huynh</h1>

      {mode === 'setup' ? (
        <>
          <p className="mt-2 text-sm text-slate-500">
            Đặt mã PIN (4 số) để bảo vệ khu vực dành cho phụ huynh, hoặc bỏ qua để xem ngay.
          </p>
          <div className="mt-6 space-y-3 text-left">
            <PinInput label="Mã PIN (4 số)" value={pin} onChange={setPin} />
            <PinInput label="Nhập lại mã PIN" value={confirmPin} onChange={setConfirmPin} />
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleSetup}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Đặt mã PIN và tiếp tục
            </button>
            <button
              onClick={onUnlock}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
            >
              Bỏ qua
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-500">Nhập mã PIN để xem tiến độ học tập của bé.</p>
          <div className="mt-6 text-left">
            <PinInput label="Mã PIN" value={pin} onChange={setPin} onEnter={handleEnter} />
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
          <button
            onClick={handleEnter}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Mở khóa
          </button>
        </>
      )}
      <p className="mt-5 text-xs text-slate-400">
        Mã PIN chỉ là lớp bảo vệ nhẹ trên thiết bị này, không phải bảo mật thật sự.
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
        placeholder="••••"
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
              <h1 className="text-2xl font-bold text-slate-900">Bảng phụ huynh</h1>
              <p className="text-sm text-slate-500">Tổng quan hành trình học tiếng Anh của bé</p>
            </div>
          </div>
        </header>

        {/* Metric cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard icon={<GraduationCap className="h-5 w-5" />} label="Từ đã học" value={summary.wordsLearned} tint="from-sky-500 to-indigo-500" />
          <MetricCard icon={<Sparkles className="h-5 w-5" />} label="Từ thành thạo" value={summary.wordsMastered} tint="from-emerald-500 to-teal-500" />
          <MetricCard icon={<BookOpenCheck className="h-5 w-5" />} label="Truyện hoàn thành" value={summary.storiesCompleted} tint="from-violet-500 to-fuchsia-500" />
          <MetricCard icon={<Gamepad2 className="h-5 w-5" />} label="Lượt chơi game" value={summary.gamesPlayed} tint="from-orange-500 to-amber-500" />
          <MetricCard icon={<Star className="h-5 w-5" />} label="Tổng sao" value={summary.totalStars} tint="from-amber-500 to-yellow-500" />
          <MetricCard icon={<Flame className="h-5 w-5" />} label="Chuỗi ngày học" value={summary.currentStreak} tint="from-rose-500 to-pink-500" />
          <MetricCard icon={<Award className="h-5 w-5" />} label="Huy hiệu" value={summary.badgesUnlocked} tint="from-indigo-500 to-blue-500" />
          <MetricCard
            icon={<RefreshCw className="h-5 w-5" />}
            label="Từ cần ôn hôm nay"
            value={dueToday ?? '—'}
            tint="from-cyan-500 to-sky-500"
          />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Weekly activity chart */}
          <section className="toy-panel rounded-3xl p-6">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900">Hoạt động 7 ngày qua</h2>
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
                        title={`${day.date}: ${day.count} hoạt động`}
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
            <h2 className="mb-5 text-lg font-bold text-slate-900">Hoạt động gần đây</h2>
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
              <p className="py-8 text-center text-sm text-slate-400">Chưa có hoạt động nào được ghi nhận.</p>
            )}
          </section>
        </div>

        {/* Mastered words */}
        <section className="toy-panel mt-6 rounded-3xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900">Từ vựng bé đã thành thạo</h2>
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
              Bé chưa có từ nào đạt mức thành thạo. Hãy cùng bé luyện tập thêm nhé!
            </p>
          )}
        </section>

        {!hydrated && (
          <p className="mt-6 text-center text-xs text-slate-400">Đang tải dữ liệu tiến độ...</p>
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
