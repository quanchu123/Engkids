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
import Link from 'next/link';
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
import { formatVietnamShortDateTime } from '@/lib/vietnam-time';
import type { LearnerCurriculumState } from '@/services/curriculum-content';
import type { ParentProgressSummary } from '@/services/learning-intelligence';

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
            Má»Ÿ khóa
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
  const [dbProgress, setDbProgress] = useState<ParentProgressSummary | null>(null);

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

  useEffect(() => {
    let active = true;
    fetch('/api/parent/progress', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active) setDbProgress(data?.progress || null);
      })
      .catch(() => {
        if (active) setDbProgress(null);
      });
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

        {dbProgress && <InternationalProgressPanel progress={dbProgress} />}

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

        <LevelSettings />

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

function InternationalProgressPanel({ progress }: { progress: ParentProgressSummary }) {
  const lessonPercent = progress.totalLessons > 0 ? Math.round((progress.lessonsCompleted / progress.totalLessons) * 100) : 0;
  const maxWeekly = Math.max(1, ...progress.weeklyActivity.map((day) => day.count));
  return (
    <section className="toy-panel mt-6 rounded-3xl p-6">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase text-indigo-700">{progress.cefr}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">{progress.learningMode} mode</span>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase text-sky-700">CEFR aligned</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">International learning summary</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Current path: {progress.stageId}. Lessons completed: {progress.lessonsCompleted}/{progress.totalLessons}. Review due: {progress.dueWords} words.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400" style={{ width: `${Math.max(lessonPercent, 4)}%` }} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniParentStat label="Mastered words" value={progress.wordsMastered} />
            <MiniParentStat label="Strongest skill" value={progress.strongestSkill || 'n/a'} />
            <MiniParentStat label="Weakest skill" value={progress.weakestSkill || 'n/a'} />
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-white/50">What to do next</p>
          <h3 className="mt-2 text-xl font-black">{progress.nextAction.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">{progress.nextAction.description}</p>
          <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/70">{progress.nextAction.reason}</p>
          <Link href={progress.nextAction.href} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">
            Open next action
          </Link>
        </div>
      </div>
      <div className="mt-5 flex h-24 items-end gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
        {progress.weeklyActivity.map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-lg bg-indigo-400" style={{ height: `${day.count === 0 ? 5 : Math.round((day.count / maxWeekly) * 100)}%` }} />
            <span className="text-[10px] font-bold text-slate-400">{formatDayLabel(day.date)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniParentStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-slate-900">{value}</p>
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
    if (!confirm('Đổi level sẽ cập nhật Today Plan và nội dung ưu tiên. Lịch sử bài kiểm tra/progress vẫn được giữ. Tiếp tục?')) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/learner/level', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: selectedStageId, source: 'parent' }),
      });
      if (!response.ok) throw new Error('Không lưu được level.');
      const data = await response.json();
      setLearnerState(data.learnerState || null);
      setMessage('Đã cập nhật level học cho bé.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu được level.');
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
            <h2 className="text-lg font-bold text-slate-900">Level học của bé</h2>
          </div>
          <p className="max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            Level này dùng để ưu tiên truyện, video, game từ vựng và checkpoint. Đổi level không xóa lịch sử học.
          </p>
        </div>
        {learnerState?.selectedLevelAt && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            Đã chọn {formatDateTime(learnerState.selectedLevelAt)}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm font-bold text-slate-400">Đang tải level...</p>
      ) : learnerState ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Chặng hiện tại</span>
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
            <Save className="h-4 w-4" aria-hidden="true" /> {saving ? 'Đang lưu...' : 'Lưu level'}
          </button>
        </div>
      ) : (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
          Đăng nhập tài khoản học để lưu level vào database.
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
  return formatVietnamShortDateTime(at);
}

