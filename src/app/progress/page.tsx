'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { pronounceWord } from '@/services/dictionary';
import { getSupabaseClient } from '@/lib/auth-client';
import { getVocabularyStats } from '@/services/vocabulary';
import { getLearnerStageProgress } from '@/lib/curriculum';
import { Story } from '@/types';
import DailyQuestCard from '@/components/learning/DailyQuestCard';
import StreakCard from '@/components/learning/StreakCard';
import BadgeGrid from '@/components/learning/BadgeGrid';
import UiIcon, { UiIconName } from '@/components/common/UiIcon';

type TabType = 'overview' | 'vocabulary' | 'stories' | 'achievements';

const MASTERY: Array<{ level: number; label: string; icon: UiIconName; tint: string }> = [
  { level: 0, label: 'Mới', icon: 'sprout', tint: 'bg-violet-100 text-violet-700' },
  { level: 1, label: 'Đang học', icon: 'light', tint: 'bg-sky-100 text-sky-700' },
  { level: 2, label: 'Quen thuộc', icon: 'open-book', tint: 'bg-emerald-100 text-emerald-700' },
  { level: 3, label: 'Nhớ tốt', icon: 'star', tint: 'bg-amber-100 text-amber-700' },
  { level: 4, label: 'Rất tốt', icon: 'medal', tint: 'bg-pink-100 text-pink-700' },
  { level: 5, label: 'Thành thạo', icon: 'trophy', tint: 'bg-indigo-100 text-indigo-700' },
];

const TABS: Array<{ id: TabType; label: string; icon: UiIconName }> = [
  { id: 'overview', label: 'Tổng quan', icon: 'home' },
  { id: 'vocabulary', label: 'Từ vựng', icon: 'dictionary' },
  { id: 'stories', label: 'Truyện', icon: 'open-book' },
  { id: 'achievements', label: 'Thành tích', icon: 'medal' },
];

export default function ProgressPage() {
  const { progress, unsaveWord, toggleWordFavorite, updateStreak } = useAppStore();
  const coins = useAppStore((state) => state.coins);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [vocabFilter, setVocabFilter] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [srsStats, setSrsStats] = useState<{
    total: number;
    dueToday: number;
    accuracy: number;
    byMastery: Record<number, number>;
  } | null>(null);
  const learner = useMemo(() => getLearnerStageProgress(progress), [progress]);

  useEffect(() => {
    getAllStories().then(setStories);
  }, []);

  // Refresh the learning streak once when the progress page mounts.
  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  useEffect(() => {
    let active = true;

    const loadSrsStats = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
          if (active) setSrsStats(null);
          return;
        }

        const stats = await getVocabularyStats();
        if (active) {
          setSrsStats({
            total: stats.total,
            dueToday: stats.dueToday,
            accuracy: stats.accuracy,
            byMastery: stats.byMastery,
          });
        }
      } catch (error) {
        console.error('Error loading SRS stats:', error);
        if (active) setSrsStats(null);
      }
    };

    loadSrsStats();

    return () => {
      active = false;
    };
  }, []);

  const completedStories = useMemo(
    () => Object.values(progress.storiesProgress).filter((item) => item.completed),
    [progress.storiesProgress],
  );

  const totalStories = stories.length || 1;

  const filteredVocab = useMemo(() => {
    return progress.savedWords.filter((word) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!word.word.toLowerCase().includes(query) && !word.vi.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (vocabFilter === 'favorites') {
        return word.isFavorite;
      }

      return true;
    });
  }, [progress.savedWords, searchQuery, vocabFilter]);

  const vocabStats = useMemo(() => {
    return {
      total: progress.savedWords.length,
      favorites: progress.savedWords.filter((word) => word.isFavorite).length,
      byMastery: progress.savedWords.reduce((acc, word) => {
        const level = word.masteryLevel || 0;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<number, number>),
    };
  }, [progress.savedWords]);

  const achievements = useMemo(
    () => [
      { id: 'first_story', name: 'Khởi đầu', desc: 'Hoàn thành truyện đầu tiên', icon: 'open-book' as UiIconName, earned: completedStories.length >= 1 },
      { id: 'five_stories', name: 'Đọc nhiều', desc: 'Hoàn thành 5 truyện', icon: 'books' as UiIconName, earned: completedStories.length >= 5 },
      { id: 'ten_words', name: 'Thu thập từ', desc: 'Lưu 10 từ vựng', icon: 'notebook' as UiIconName, earned: vocabStats.total >= 10 },
      { id: 'fifty_words', name: 'Kho báu từ', desc: 'Lưu 50 từ vựng', icon: 'treasure-chest' as UiIconName, earned: vocabStats.total >= 50 },
      { id: 'streak_3', name: 'Kiên trì', desc: 'Giữ streak 3 ngày', icon: 'fire' as UiIconName, earned: progress.currentStreak >= 3 },
      { id: 'streak_7', name: 'Bền bỉ', desc: 'Giữ streak 7 ngày', icon: 'crown' as UiIconName, earned: progress.currentStreak >= 7 },
      { id: 'ten_stars', name: 'Ngôi sao', desc: 'Đạt 10 sao', icon: 'star' as UiIconName, earned: progress.totalStars >= 10 },
      { id: 'perfect_game', name: 'Hoàn hảo', desc: 'Đạt điểm tuyệt đối trong game', icon: 'trophy' as UiIconName, earned: progress.gameScores.some((item) => item.score === item.totalQuestions) },
    ],
    [completedStories.length, progress.currentStreak, progress.gameScores, progress.totalStars, vocabStats.total],
  );

  const earnedCount = achievements.filter((item) => item.earned).length;

  const storySections = [
    {
      title: 'Đã hoàn thành',
      filter: (story: Story) => Boolean(progress.storiesProgress[story.id]?.completed),
      empty: 'Chưa hoàn thành truyện nào',
    },
    {
      title: 'Đang đọc',
      filter: (story: Story) => Boolean(progress.storiesProgress[story.id] && !progress.storiesProgress[story.id].completed),
      empty: 'Không có truyện đang đọc',
    },
    {
      title: 'Chưa đọc',
      filter: (story: Story) => !progress.storiesProgress[story.id],
      empty: 'Đã đọc hết truyện hiện có',
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-sky-50 pb-24">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="mascot flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="2" />
                  <rect x="22" y="18" width="20" height="18" rx="4" fill="#F59E0B" />
                  <rect x="24" y="20" width="16" height="8" rx="2" fill="#FCD34D" />
                  <path d="M22 22 Q16 22 16 28 Q16 34 22 34" stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M42 22 Q48 22 48 28 Q48 34 42 34" stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <rect x="29" y="36" width="6" height="8" rx="2" fill="#D97706" />
                  <rect x="24" y="43" width="16" height="3" rx="1.5" fill="#D97706" />
                  <polygon points="32,21 33.5,25 37.5,25 34.5,27.5 35.5,31.5 32,29 28.5,31.5 29.5,27.5 26.5,25 30.5,25" fill="white" opacity="0.9" />
                </svg>
              </div>
              <div>
                <h1
                  className="font-black leading-tight"
                  style={{
                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 40%, #7c3aed 80%, #2563eb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.025em',
                  }}
                >
                  Tiến Độ Học Tập!
                </h1>
                <p className="mt-0.5 text-sm font-bold" style={{ color: '#6b5b8f' }}>
                  Theo dõi hành trình học tiếng Anh của bạn
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Link
                href="/shop"
                className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-amber-600 shadow"
                aria-label={`Bạn có ${coins} xu`}
              >
                <UiIcon name="coins" size={20} /> {coins} xu
              </Link>
              <div
                className="action-btn rounded-2xl px-5 py-2.5 text-sm font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #fb923c, #f97316)',
                  boxShadow: '0 6px 20px rgba(249,115,22,0.4)',
                }}
              >
                {progress.currentStreak} ngày liên tiếp!
              </div>
            </div>
          </div>

          <section className="soft-panel mb-6 flex flex-wrap gap-2 rounded-[1.75rem] p-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                    active
                      ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg'
                      : 'bg-white text-violet-700 shadow'
                  }`}
                >
                  <UiIcon name={tab.icon} size={22} />
                  {tab.label}
                </button>
              );
            })}
          </section>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <SrsCard stats={srsStats} />

              <div className="grid gap-5 md:grid-cols-2">
                <DailyQuestCard />
                <StreakCard />
              </div>

              <div className="toy-panel p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-wide text-violet-500">Lộ trình chuẩn quốc tế</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">{learner.stage.cefr}: {learner.stage.titleVi}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Mục tiêu gần nhất: {learner.missing[0] ?? 'sẵn sàng chuyển sang chặng kế tiếp'}.
                    </p>
                  </div>
                  <Link href="/roadmap" className="kid-chip flex-shrink-0 px-4 py-2 text-sm font-black text-violet-700">
                    Xem roadmap
                  </Link>
                </div>
                <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: `${Math.max(learner.percent, 3)}%` }} />
                </div>
                <div className="mt-4 grid gap-3 text-center sm:grid-cols-3">
                  {[
                    ['Từ nhớ tốt', learner.stats.masteredWords],
                    ['Truyện xong', learner.stats.completedStories],
                    ['Game 70%+', learner.stats.strongGameScores],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-2xl font-black text-slate-900">{value}</div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="toy-panel p-4">
                <div className="flex flex-wrap gap-2">
                  <Link href="/roadmap" className="kid-chip flex items-center gap-2 px-4 py-2 text-sm font-black text-violet-700">
                    <UiIcon name="goal" size={20} /> Lộ trình học
                  </Link>
                  <Link href="/roadmap" className="kid-chip flex items-center gap-2 px-4 py-2 text-sm font-black text-violet-700">
                    <UiIcon name="calendar" size={20} /> Học tiếp
                  </Link>
                  <Link href="/shop" className="kid-chip flex items-center gap-2 px-4 py-2 text-sm font-black text-violet-700">
                    <UiIcon name="gift" size={20} /> Cửa hàng
                  </Link>
                  <Link href="/parent" className="kid-chip flex items-center gap-2 px-4 py-2 text-sm font-black text-violet-700">
                    <UiIcon name="family" size={20} /> Phụ huynh
                  </Link>
                  <Link href="/progress/certificate" className="kid-chip flex items-center gap-2 px-4 py-2 text-sm font-black text-violet-700">
                    <UiIcon name="certificate" size={20} /> Chứng nhận
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard title="Tổng sao" value={progress.totalStars} icon="star" tint="from-amber-400 to-orange-400" />
                <MetricCard title="Từ đã học" value={vocabStats.total} icon="abc" tint="from-sky-400 to-indigo-500" />
                <MetricCard title="Truyện xong" value={completedStories.length} icon="open-book" tint="from-emerald-400 to-teal-500" />
                <MetricCard title="Streak" value={progress.currentStreak} icon="fire" tint="from-pink-400 to-rose-500" />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="toy-panel p-6">
                  <h2 className="mb-5 text-lg font-black text-slate-900">Tiến độ tổng quan</h2>
                  <div className="space-y-5">
                    <ProgressBar label="Truyện" current={completedStories.length} total={totalStories} color="from-emerald-400 to-teal-500" />
                    <ProgressBar label="Thành tích" current={earnedCount} total={achievements.length} color="from-amber-400 to-orange-400" />
                    <ProgressBar label="Từ yêu thích" current={vocabStats.favorites} total={vocabStats.total || 1} color="from-pink-400 to-rose-500" />
                  </div>
                </div>

                <div className="toy-panel p-6">
                  <h2 className="mb-5 text-lg font-black text-slate-900">Mức độ nhớ từ</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {MASTERY.map((item) => (
                      <div key={item.level} className={`rounded-2xl px-3 py-4 text-center ${item.tint}`}>
                        <div className="flex justify-center">
                          <UiIcon name={item.icon} size={32} />
                        </div>
                        <div className="mt-1 text-2xl font-black">{vocabStats.byMastery[item.level] || 0}</div>
                        <div className="mt-1 text-xs font-bold">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="toy-panel p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-900">Hoạt động gần đây</h2>
                  <Link href="/stories" className="kid-chip px-4 py-2 text-sm font-bold text-violet-700">
                    Xem truyện
                  </Link>
                </div>
                {completedStories.length > 0 ? (
                  <div className="space-y-3">
                    {completedStories.slice(0, 5).map((item) => {
                      const story = stories.find((candidate) => candidate.id === item.storyId);
                      if (!story) return null;

                      return (
                        <Link
                          key={item.storyId}
                          href={`/stories/${item.storyId}`}
                          className="toy-surface flex items-center gap-4 rounded-2xl p-3 transition-transform hover:-translate-y-0.5"
                        >
                          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-pink-100 text-2xl font-black text-violet-500">
                            {story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:') ? (
                              <Image
                                src={story.cover_image}
                                alt={story.title_en}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : (
                              story.cover_image || story.title_en.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-black text-slate-900">{story.title_en}</h3>
                            <p className="truncate text-sm text-slate-500">{story.title_vi}</p>
                          </div>
                          <div className="kid-chip px-3 py-1 text-sm font-black text-amber-700">
                            {item.starsEarned} sao
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyPanel
                    title="Chưa có hoạt động nào"
                    description="Bắt đầu đọc truyện để hệ thống ghi lại hành trình học tập."
                    href="/stories"
                    action="Đọc truyện ngay"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'vocabulary' && (
            <div className="space-y-5">
              <div className="soft-feature rounded-[2rem] p-6 text-white">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Kho từ vựng</h2>
                    <p className="text-sm text-white/85">Ôn lại các từ đã lưu và mở flashcard khi cần luyện nhanh.</p>
                  </div>
                  <div className="flex gap-2">
                    {filteredVocab.length > 0 && (
                      <>
                        <Link href="/progress/review" className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white">
                          Ôn tập
                        </Link>
                        <button
                          onClick={() => {
                            setShowFlashcard(true);
                            setCurrentFlashcardIndex(0);
                            setIsFlipped(false);
                          }}
                          className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white"
                        >
                          Flashcard
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <SummaryStat label="Tổng từ" value={vocabStats.total} />
                  <SummaryStat label="Yêu thích" value={vocabStats.favorites} />
                  <SummaryStat label="Thành thạo" value={vocabStats.byMastery[5] || 0} />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  placeholder="Tìm kiếm từ vựng..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="soft-panel w-full rounded-2xl px-4 py-3 font-semibold text-slate-700 outline-none"
                />
                <div className="flex gap-2">
                  <FilterButton active={vocabFilter === 'all'} onClick={() => setVocabFilter('all')}>
                    Tất cả
                  </FilterButton>
                  <FilterButton active={vocabFilter === 'favorites'} onClick={() => setVocabFilter('favorites')}>
                    Yêu thích
                  </FilterButton>
                </div>
              </div>

              {filteredVocab.length > 0 ? (
                <div className="grid gap-3">
                  {filteredVocab.map((item) => {
                    const mastery = MASTERY[item.masteryLevel || 0];
                    return (
                      <div key={item.word} className="toy-panel p-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => pronounceWord(item.word)}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg"
                            aria-label="Nghe phát âm"
                          >
                            <UiIcon name="audio" size={24} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-black text-slate-900">{item.word}</h3>
                            <p className="text-sm text-slate-500">{item.vi}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-black ${mastery.tint}`}>
                              <UiIcon name={mastery.icon} size={16} /> {mastery.label}
                            </span>
                            <button
                              onClick={() => toggleWordFavorite(item.word)}
                              className="kid-chip px-3 py-2 text-xs font-black text-pink-700"
                            >
                              {item.isFavorite ? 'Loved' : 'Like'}
                            </button>
                            <button
                              onClick={() => unsaveWord(item.word)}
                              className="kid-chip px-3 py-2 text-xs font-black text-slate-500"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyPanel
                  title={searchQuery ? 'Không tìm thấy từ phù hợp' : 'Chưa có từ vựng nào'}
                  description="Lưu từ khi đọc truyện hoặc xem video để xây kho từ vựng riêng."
                  href="/stories"
                  action="Đọc truyện"
                />
              )}

              {showFlashcard && filteredVocab.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                  <div className="toy-panel max-w-md w-full p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900">Flashcard</h3>
                      <button onClick={() => setShowFlashcard(false)} className="kid-chip px-3 py-2 text-sm font-black text-violet-700">
                        Đóng
                      </button>
                    </div>
                    <p className="mb-4 text-center text-sm font-bold text-slate-500">
                      {currentFlashcardIndex + 1} / {filteredVocab.length}
                    </p>
                    <button
                      onClick={() => setIsFlipped((value) => !value)}
                      className="toy-surface min-h-[200px] w-full rounded-[2rem] p-8 text-center"
                    >
                      {!isFlipped ? (
                        <>
                          <p className="text-3xl font-black text-slate-900">{filteredVocab[currentFlashcardIndex]?.word}</p>
                          <p className="mt-3 text-sm font-bold text-slate-500">Bấm để xem nghĩa</p>
                        </>
                      ) : (
                        <>
                          <p className="text-3xl font-black text-slate-900">{filteredVocab[currentFlashcardIndex]?.vi}</p>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              pronounceWord(filteredVocab[currentFlashcardIndex]?.word);
                            }}
                            className="mt-4 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 px-4 py-2 text-sm font-black text-white shadow-lg"
                          >
                            Nghe phát âm
                          </button>
                        </>
                      )}
                    </button>
                    <div className="mt-5 flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setIsFlipped(false);
                          setCurrentFlashcardIndex((prev) => (prev > 0 ? prev - 1 : filteredVocab.length - 1));
                        }}
                        className="kid-chip px-5 py-3 text-sm font-black text-violet-700"
                      >
                        Trước
                      </button>
                      <button
                        onClick={() => {
                          setIsFlipped(false);
                          setCurrentFlashcardIndex((prev) => (prev < filteredVocab.length - 1 ? prev + 1 : 0));
                        }}
                        className="rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3 text-sm font-black text-white shadow-lg"
                      >
                        Tiếp
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stories' && (
            <div className="space-y-5">
              {storySections.map((section) => {
                const filtered = stories.filter(section.filter);
                return (
                  <div key={section.title} className="toy-panel p-6">
                    <h2 className="mb-4 text-lg font-black text-slate-900">
                      {section.title}
                      {filtered.length > 0 && <span className="ml-2 text-sm font-bold text-slate-400">({filtered.length})</span>}
                    </h2>
                    {filtered.length === 0 ? (
                      <p className="py-6 text-center text-sm font-bold text-slate-500">{section.empty}</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {filtered.map((story) => {
                          const item = progress.storiesProgress[story.id];
                          return (
                            <Link
                              key={story.id}
                              href={`/stories/${story.id}`}
                              className="toy-surface flex items-center gap-4 rounded-2xl p-3 transition-transform hover:-translate-y-0.5"
                            >
                              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-pink-100 to-violet-100 text-xl font-black text-violet-500">
                                {story.cover_image?.startsWith('http') || story.cover_image?.startsWith('data:') ? (
                                  <Image
                                    src={story.cover_image}
                                    alt={story.title_en}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                ) : (
                                  story.cover_image || story.title_en.charAt(0)
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate font-black text-slate-900">{story.title_en}</h3>
                                <p className="truncate text-sm text-slate-500">{story.title_vi}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="kid-chip px-3 py-1 text-xs font-black text-violet-700">{story.level}</span>
                                  {item?.completed && (
                                    <span className="kid-chip px-3 py-1 text-xs font-black text-amber-700">
                                      {item.starsEarned} sao
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-5">
              <div className="soft-feature rounded-[2rem] p-6 text-white">
                <h2 className="text-2xl font-black">Thành tích</h2>
                <p className="mt-1 text-white/85">Đã đạt {earnedCount}/{achievements.length} cột mốc học tập.</p>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${Math.max(earnedCount / achievements.length, 0.02) * 100}%` }}
                  />
                </div>
              </div>

              <BadgeGrid />

              <div className="grid gap-4 md:grid-cols-2">
                {achievements.map((item) => (
                  <div
                    key={item.id}
                    className={`toy-panel p-5 ${item.earned ? '' : 'opacity-70 grayscale-[0.15]'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.earned ? 'bg-gradient-to-br from-amber-300 to-orange-400' : 'bg-slate-100 grayscale'}`}>
                        <UiIcon name={item.icon} size={32} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-slate-900">{item.name}</h3>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      {item.earned && (
                        <span className="kid-chip px-3 py-1 text-xs font-black text-emerald-700">Done</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {progress.gameScores.length > 0 && (
                <div className="toy-panel p-6">
                  <h2 className="mb-4 text-lg font-black text-slate-900">Lịch sử game</h2>
                  <div className="space-y-3">
                    {progress.gameScores.slice(-10).reverse().map((item, index) => {
                      const story = stories.find((candidate) => candidate.id === item.storyId);
                      const perfect = item.score === item.totalQuestions;

                      return (
                        <div key={`${item.storyId}-${index}`} className="toy-surface flex items-center gap-4 rounded-2xl p-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100">
                            <UiIcon name="controller" size={26} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-black text-slate-900">{story?.title_en || item.storyId}</p>
                            <p className="text-sm text-slate-500">{item.gameType === 'match' ? 'Matching Game' : 'Fill in the Blank'}</p>
                          </div>
                          <div className={`kid-chip px-3 py-1 text-sm font-black ${perfect ? 'text-emerald-700' : 'text-violet-700'}`}>
                            {item.score}/{item.totalQuestions}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function MetricCard({ title, value, tint, icon }: { title: string; value: number; tint: string; icon: UiIconName }) {
  return (
    <div className="toy-panel p-5 text-center">
      <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tint} shadow-lg`}>
        <UiIcon name={icon} size={28} />
      </div>
      <div className={`bg-gradient-to-r ${tint} bg-clip-text text-4xl font-black text-transparent`}>{value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</div>
    </div>
  );
}

function ProgressBar({
  label,
  current,
  total,
  color,
}: {
  label: string;
  current: number;
  total: number;
  color: string;
}) {
  const percentage = Math.min(Math.round((current / total) * 100), 100);

  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-bold">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-400">{current}/{total} · {percentage}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(percentage, 2)}%` }} />
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wide text-white/70">{label}</div>
    </div>
  );
}

function SrsCard({
  stats,
}: {
  stats: { total: number; dueToday: number; accuracy: number; byMastery: Record<number, number> } | null;
}) {
  // Guest or not loaded: friendly invite to log in (additive, never crashes).
  if (!stats) {
    return (
      <div className="soft-feature rounded-[2rem] p-6 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">Ôn tập giãn cách</h2>
            <p className="mt-1 text-sm text-white/85">
              Đăng nhập để bật lịch ôn tập thông minh, nhắc bạn ôn đúng từ vào đúng lúc.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 px-5 py-3 text-sm font-black text-white"
          >
            Đăng nhập để bật
          </Link>
        </div>
      </div>
    );
  }

  const hasDue = stats.dueToday > 0;

  return (
    <div className="soft-feature rounded-[2rem] p-6 text-white">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-3xl bg-white/15">
            <span className="text-3xl font-black leading-none">{stats.dueToday}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/80">đến hạn</span>
          </div>
          <div>
            <h2 className="text-2xl font-black">Đến hạn hôm nay</h2>
            <p className="mt-1 text-sm text-white/85">
              {hasDue
                ? `Có ${stats.dueToday} từ đến hạn. Mỗi phiên ôn tối đa 20 từ nhé!`
                : 'Tuyệt vời! Hôm nay bạn không có từ nào đến hạn.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-xl bg-white/15 px-3 py-1 text-xs font-black">
                Tổng từ: {stats.total}
              </span>
              <span className="rounded-xl bg-white/15 px-3 py-1 text-xs font-black">
                Độ chính xác: {stats.accuracy}%
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/progress/review"
          className={`inline-flex flex-shrink-0 items-center justify-center rounded-2xl px-6 py-3 text-sm font-black shadow-lg transition-transform hover:-translate-y-0.5 ${
            hasDue ? 'bg-white text-violet-700' : 'bg-white/15 text-white'
          }`}
        >
          {hasDue ? `Ôn nhanh ${Math.min(stats.dueToday, 20)} từ` : 'Không có từ đến hạn'}
        </Link>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${
        active
          ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg'
          : 'bg-white text-violet-700 shadow'
      }`}
    >
      {children}
    </button>
  );
}

function EmptyPanel({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="toy-panel py-12 text-center">
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      <Link href={href} className="mt-5 inline-flex rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 py-3 text-sm font-black text-white shadow-lg">
        {action}
      </Link>
    </div>
  );
}
