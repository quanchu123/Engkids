'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { getAllStories } from '@/data/stories';
import { pronounceWord } from '@/services/dictionary';
import { Story, StoryProgress } from '@/types';
import Header from '@/components/layout/Header';

type TabType = 'overview' | 'vocabulary' | 'stories' | 'achievements';

const MASTERY = [
  { level: 0, label: 'Mới', emoji: '🐣', bg: '#f3e8ff', color: '#7c3aed' },
  { level: 1, label: 'Đang học', emoji: '🐥', bg: '#dbeafe', color: '#1d4ed8' },
  { level: 2, label: 'Quen thuộc', emoji: '🐰', bg: '#d1fae5', color: '#065f46' },
  { level: 3, label: 'Nhớ tốt', emoji: '🦊', bg: '#ffedd5', color: '#c2410c' },
  { level: 4, label: 'Rất tốt', emoji: '🦁', bg: '#ede9fe', color: '#5b21b6' },
  { level: 5, label: 'Thành thạo', emoji: '🦋', bg: '#dcfce7', color: '#166534' },
];

export default function ProgressPage() {
  const { progress, unsaveWord, toggleWordFavorite } = useAppStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [vocabFilter, setVocabFilter] = useState<'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFlashcard, setShowFlashcard] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => { getAllStories().then(setStories); }, []);

  const completedStories = Object.values(progress.storiesProgress).filter(p => p.completed);
  const totalStories = stories.length || 1;

  const filteredVocab = progress.savedWords.filter(word => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!word.word.toLowerCase().includes(q) && !word.vi.toLowerCase().includes(q)) return false;
    }
    if (vocabFilter === 'favorites') return word.isFavorite;
    return true;
  });

  const vocabStats = {
    total: progress.savedWords.length,
    favorites: progress.savedWords.filter(w => w.isFavorite).length,
    byMastery: progress.savedWords.reduce((acc, w) => {
      const lvl = w.masteryLevel || 0;
      acc[lvl] = (acc[lvl] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
  };

  const achievements = [
    { id: 'first_story', name: 'Khởi đầu', desc: 'Hoàn thành truyện đầu tiên', icon: '🐣', earned: completedStories.length >= 1 },
    { id: 'five_stories', name: 'Độc giả', desc: 'Hoàn thành 5 truyện', icon: '🐧', earned: completedStories.length >= 5 },
    { id: 'ten_words', name: 'Thu thập từ', desc: 'Lưu 10 từ vựng', icon: '🐝', earned: vocabStats.total >= 10 },
    { id: 'fifty_words', name: 'Kho báu từ', desc: 'Lưu 50 từ vựng', icon: '🦋', earned: vocabStats.total >= 50 },
    { id: 'streak_3', name: 'Kiên trì', desc: 'Streak 3 ngày', icon: '🐢', earned: progress.currentStreak >= 3 },
    { id: 'streak_7', name: 'Bền bỉ', desc: 'Streak 7 ngày', icon: '🦁', earned: progress.currentStreak >= 7 },
    { id: 'ten_stars', name: 'Ngôi sao', desc: 'Đạt 10 sao', icon: '🌟', earned: progress.totalStars >= 10 },
    { id: 'perfect_game', name: 'Hoàn hảo', desc: 'Đạt điểm tuyệt đối', icon: '🦄', earned: progress.gameScores.some(s => s.score === s.totalQuestions) },
  ];
  const earnedCount = achievements.filter(a => a.earned).length;

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: '🏠' },
    { id: 'vocabulary', label: 'Từ vựng', icon: '🐝', badge: progress.savedWords.length },
    { id: 'stories', label: 'Truyện', icon: '🦄' },
    { id: 'achievements', label: 'Thành tích', icon: '🌈' },
  ];

  return (
    <>
      <style>{`
        .prog-tab { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .prog-tab:hover { transform: scale(1.04); }
        .stat-card { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease; }
        .stat-card:hover { transform: translateY(-6px) scale(1.04); }
        .float-deco { animation: floatDeco 3.5s ease-in-out infinite; }
        .float-deco:nth-child(2) { animation-delay: 1s; }
        .float-deco:nth-child(3) { animation-delay: 2s; }
        @keyframes floatDeco { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-10px) rotate(8deg)} }
        .mascot { animation: mascotBob 2.8s ease-in-out infinite; }
        @keyframes mascotBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .bar-fill { transition: width 1s cubic-bezier(0.25, 1, 0.5, 1); }
        .achievement-card { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .achievement-card:hover { transform: scale(1.03); }
        .action-btn { transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s; }
        .action-btn:hover { transform: scale(1.05); }
        .action-btn:active { transform: scale(0.95); }
      `}</style>

      <Header />
      <main className="min-h-screen pb-24"
        style={{ background: 'linear-gradient(145deg, #FFFDE7 0%, #F3E5F5 50%, #E3F2FD 100%)' }}>

        {/* ── Rainbow strip + floating decorations ── */}
        <div className="fixed top-0 left-0 w-full h-[5px] z-40"
          style={{ background: 'linear-gradient(90deg,#f97316,#fbbf24,#4ade80,#60a5fa,#a78bfa,#f472b6)' }} />
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {/* SVG star decorations */}
          <svg className="float-deco absolute top-28 left-[8%]" width="30" height="30" viewBox="0 0 24 24">
            <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.5"/>
          </svg>
          <svg className="float-deco absolute top-20 right-[10%]" width="24" height="24" viewBox="0 0 24 24" style={{ animationDelay: '1s' }}>
            <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="#a78bfa" stroke="#7c3aed" strokeWidth="0.5"/>
          </svg>
          <svg className="float-deco absolute top-52 right-[22%]" width="20" height="20" viewBox="0 0 24 24" style={{ animationDelay: '2s' }}>
            <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="#f472b6" stroke="#ec4899" strokeWidth="0.5"/>
          </svg>
          <svg className="float-deco absolute bottom-1/3 left-[15%]" width="18" height="18" viewBox="0 0 24 24" style={{ animationDelay: '1.5s' }}>
            <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="#4ade80" stroke="#22c55e" strokeWidth="0.5"/>
          </svg>
          <svg className="float-deco absolute top-1/3 right-[6%]" width="22" height="22" viewBox="0 0 24 24" style={{ animationDelay: '0.5s' }}>
            <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="#60a5fa" stroke="#3b82f6" strokeWidth="0.5"/>
          </svg>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-4" style={{ zIndex: 1 }}>

          {/* ── HERO HEADER ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div className="flex items-center gap-4">
              {/* SVG Trophy/Progress illustration */}
              <div className="mascot flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="2"/>
                  {/* trophy cup */}
                  <rect x="22" y="18" width="20" height="18" rx="4" fill="#F59E0B"/>
                  <rect x="24" y="20" width="16" height="8" rx="2" fill="#FCD34D"/>
                  {/* handles */}
                  <path d="M22 22 Q16 22 16 28 Q16 34 22 34" stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <path d="M42 22 Q48 22 48 28 Q48 34 42 34" stroke="#F59E0B" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  {/* stem */}
                  <rect x="29" y="36" width="6" height="8" rx="2" fill="#D97706"/>
                  <rect x="24" y="43" width="16" height="3" rx="1.5" fill="#D97706"/>
                  {/* star on cup */}
                  <polygon points="32,21 33.5,25 37.5,25 34.5,27.5 35.5,31.5 32,29 28.5,31.5 29.5,27.5 26.5,25 30.5,25" fill="white" opacity="0.9"/>
                </svg>
              </div>
              <div>
                <h1 className="font-black leading-tight"
                  style={{
                    fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                    background: 'linear-gradient(135deg, #f97316 0%, #ec4899 40%, #7c3aed 80%, #2563eb 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    letterSpacing: '-0.025em',
                  }}>
                  Tiến Độ Học Tập!
                </h1>
                <p className="font-bold text-sm mt-0.5" style={{ color: '#6b5b8f' }}>
                  Theo dõi hành trình học tiếng Anh của bạn 🌈
                </p>
              </div>
            </div>
            {/* Streak badge */}
            <div className="action-btn flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm"
              style={{
                background: 'linear-gradient(135deg, #fb923c, #f97316)',
                color: 'white',
                boxShadow: '0 6px 20px rgba(249,115,22,0.4)',
              }}>
              🦊 {progress.currentStreak} ngày liên tiếp!
            </div>
          </div>

          {/* ── TAB BAR ── */}
          <div className="flex gap-2 flex-wrap mb-7 p-1.5 rounded-3xl"
            style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(124,58,237,0.1)' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
                  className="prog-tab flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm whitespace-nowrap min-w-[100px]"
                  style={active ? {
                    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                    color: 'white',
                    boxShadow: '0 6px 18px rgba(124,58,237,0.4)',
                  } : { color: '#7c3aed' }}>
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={active ? { background: 'rgba(255,255,255,0.25)', color: 'white' } : { background: '#ede9fe', color: '#7c3aed' }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ══════════ OVERVIEW TAB ══════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Tổng sao', value: progress.totalStars, gradFrom: '#fbbf24', gradTo: '#f97316', shadow: 'rgba(251,191,36,0.45)', svgPath: <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="white"/> },
                  { label: 'Từ đã học', value: vocabStats.total, gradFrom: '#60a5fa', gradTo: '#7c3aed', shadow: 'rgba(124,58,237,0.35)', svgPath: <><rect x="4" y="3" width="16" height="18" rx="2" stroke="white" strokeWidth="2" fill="none"/><line x1="8" y1="8" x2="16" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="16" x2="13" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></> },
                  { label: 'Truyện xong', value: completedStories.length, gradFrom: '#4ade80', gradTo: '#10b981', shadow: 'rgba(16,185,129,0.35)', svgPath: <><path d="M12 2 L15 8 L22 9 L17 14 L18 21 L12 18 L6 21 L7 14 L2 9 L9 8 Z" fill="white" opacity="0.9"/><circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.4)"/></> },
                  { label: 'Streak ngày', value: progress.currentStreak, gradFrom: '#fb923c', gradTo: '#ec4899', shadow: 'rgba(249,115,22,0.35)', svgPath: <path d="M12 2 C8 8 6 10 8 14 C10 18 12 18 12 22 C12 18 14 18 16 14 C18 10 16 8 12 2 Z" fill="white" opacity="0.9"/> },
                ].map(s => (
                  <div key={s.label} className="stat-card rounded-3xl p-5 text-center"
                    style={{ background: '#ffffff', boxShadow: `0 8px 32px ${s.shadow}` }}>
                    {/* Colored icon background */}
                    <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${s.gradFrom}, ${s.gradTo})`, boxShadow: `0 4px 12px ${s.shadow}` }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{s.svgPath}</svg>
                    </div>
                    <div className="text-4xl font-black mb-1"
                      style={{ background: `linear-gradient(135deg, ${s.gradFrom}, ${s.gradTo})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {s.value}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Two columns */}
              <div className="grid md:grid-cols-2 gap-5">
                {/* Progress bars */}
                <div className="rounded-3xl p-6" style={{ background: 'white', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
                  <h3 className="font-black text-lg mb-5 flex items-center gap-2" style={{ color: '#1e1b4b' }}>
                    📊 Tiến độ học tập
                  </h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Truyện', current: completedStories.length, total: totalStories, gradFrom: '#4ade80', gradTo: '#10b981' },
                      { label: 'Thành tích', current: earnedCount, total: achievements.length, gradFrom: '#fbbf24', gradTo: '#f97316' },
                      { label: 'Từ yêu thích', current: vocabStats.favorites, total: vocabStats.total || 1, gradFrom: '#f472b6', gradTo: '#ec4899' },
                    ].map(bar => {
                      const pct = Math.min(Math.round((bar.current / bar.total) * 100), 100);
                      return (
                        <div key={bar.label}>
                          <div className="flex justify-between text-sm font-bold mb-2">
                            <span style={{ color: '#374151' }}>{bar.label}</span>
                            <span style={{ color: '#6b7280' }}>{bar.current}/{bar.total} · {pct}%</span>
                          </div>
                          <div className="h-4 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                            <div className="bar-fill h-full rounded-full"
                              style={{ width: `${pct || 2}%`, background: `linear-gradient(90deg, ${bar.gradFrom}, ${bar.gradTo})`, boxShadow: `0 2px 8px ${bar.gradTo}66` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Mastery grid */}
                <div className="rounded-3xl p-6" style={{ background: 'white', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
                  <h3 className="font-black text-lg mb-5 flex items-center gap-2" style={{ color: '#1e1b4b' }}>
                    🐱 Mức độ nhớ từ
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {MASTERY.map(m => (
                      <div key={m.level} className="achievement-card rounded-2xl p-3 text-center"
                        style={{ background: m.bg }}>
                        <div className="text-2xl mb-1">{m.emoji}</div>
                        <div className="text-xl font-black" style={{ color: m.color }}>
                          {vocabStats.byMastery[m.level] || 0}
                        </div>
                        <div className="text-[10px] font-bold mt-0.5" style={{ color: m.color + 'cc' }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div className="rounded-3xl p-6" style={{ background: 'white', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
                <h3 className="font-black text-lg mb-5 flex items-center gap-2" style={{ color: '#1e1b4b' }}>
                  🐰 Hoạt động gần đây
                </h3>
                {completedStories.length > 0 ? (
                  <div className="space-y-2">
                    {completedStories.slice(0, 5).map(sp => {
                      const story = stories.find(s => s.id === sp.storyId);
                      if (!story) return null;
                      return (
                        <Link key={sp.storyId} href={`/stories/${sp.storyId}`}
                          className="flex items-center gap-4 p-3 rounded-2xl transition-colors hover:bg-purple-50 group">
                          <div className="text-3xl">{story.cover_image}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm truncate" style={{ color: '#1e1b4b' }}>{story.title_en}</h4>
                            <p className="text-xs font-semibold truncate" style={{ color: '#7b5ea7' }}>{story.title_vi}</p>
                          </div>
                          <div className="text-base">{'🌟'.repeat(sp.starsEarned)}</div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="mascot inline-block text-7xl mb-4">🦄</div>
                    <p className="font-black text-base mb-1" style={{ color: '#1e1b4b' }}>Chưa có hoạt động nào</p>
                    <p className="text-sm font-semibold mb-5" style={{ color: '#7b5ea7' }}>Bắt đầu đọc truyện để ghi lại hành trình học nhé!</p>
                    <Link href="/stories"
                      className="action-btn inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-black text-white text-sm"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 6px 20px rgba(124,58,237,0.45)' }}>
                      🚀 Bắt đầu học thôi!
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ VOCABULARY TAB ══════════ */}
          {activeTab === 'vocabulary' && (
            <div className="space-y-5">
              {/* Stats banner */}
              <div className="rounded-3xl p-6 text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 8px 32px rgba(124,58,237,0.45)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <h3 className="text-xl font-black">📚 Kho từ vựng của bạn</h3>
                  <div className="flex gap-2 flex-wrap">
                    {filteredVocab.length > 0 && (
                      <>
                        <Link href="/progress/review"
                          className="action-btn bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-black transition-colors">
                          🐱 Ôn tập SM-2
                        </Link>
                        <button onClick={() => { setShowFlashcard(true); setCurrentFlashcardIndex(0); setIsFlipped(false); }}
                          className="action-btn bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-black transition-colors">
                          🐰 Flashcard
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[{ v: vocabStats.total, l: 'Tổng từ' }, { v: vocabStats.favorites, l: 'Yêu thích' }, { v: vocabStats.byMastery[5] || 0, l: 'Thành thạo' }].map(s => (
                    <div key={s.l}>
                      <div className="text-3xl font-black">{s.v}</div>
                      <div className="text-white/75 text-xs font-bold uppercase tracking-wide">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search & filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                  <input type="text" placeholder="Tìm kiếm từ vựng..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl font-bold focus:outline-none"
                    style={{ background: 'white', boxShadow: '0 2px 12px rgba(124,58,237,0.12)', color: '#374151' }} />
                </div>
                <div className="flex gap-2">
                  {[{ id: 'all' as const, icon: '📚', label: 'Tất cả' }, { id: 'favorites' as const, icon: '💖', label: 'Yêu thích' }].map(f => (
                    <button key={f.id} onClick={() => setVocabFilter(f.id)}
                      className="action-btn px-4 py-2 rounded-2xl text-sm font-black flex items-center gap-1.5"
                      style={vocabFilter === f.id ? { background: 'linear-gradient(135deg, #7c3aed, #ec4899)', color: 'white', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' } : { background: 'white', color: '#7c3aed', boxShadow: '0 2px 8px rgba(124,58,237,0.1)' }}>
                      {f.icon} {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vocab list */}
              {filteredVocab.length > 0 ? (
                <div className="grid gap-3">
                  {filteredVocab.map(item => {
                    const lvl = item.masteryLevel || 0;
                    const m = MASTERY[lvl];
                    return (
                      <div key={item.word} className="rounded-3xl p-4"
                        style={{ background: 'white', boxShadow: '0 2px 16px rgba(124,58,237,0.08)' }}>
                        <div className="flex items-center gap-4">
                          <button onClick={() => pronounceWord(item.word)}
                            className="action-btn w-12 h-12 rounded-2xl text-white flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #60a5fa, #7c3aed)', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                            🎵
                          </button>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-black text-lg" style={{ color: '#1e1b4b' }}>{item.word}</h4>
                            <p className="text-sm font-semibold" style={{ color: '#7b5ea7' }}>{item.vi}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="px-2.5 py-1 rounded-xl text-xs font-black"
                              style={{ background: m.bg, color: m.color }}>
                              {m.emoji} {m.label}
                            </div>
                            <button onClick={() => toggleWordFavorite(item.word)}
                              className="action-btn p-2 rounded-xl"
                              style={{ background: item.isFavorite ? '#fce7f3' : '#f9fafb' }}>
                              {item.isFavorite ? '💖' : '🤍'}
                            </button>
                            <button onClick={() => unsaveWord(item.word)}
                              className="action-btn p-2 rounded-xl text-gray-400 hover:text-red-500"
                              style={{ background: '#f9fafb' }}>🗑</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-14 rounded-3xl" style={{ background: 'white' }}>
                  <div className="mascot inline-block text-6xl mb-4">📚</div>
                  <p className="font-black text-lg mb-1" style={{ color: '#1e1b4b' }}>{searchQuery ? 'Không tìm thấy từ nào' : 'Chưa có từ vựng nào'}</p>
                  <p className="text-sm font-semibold mb-5" style={{ color: '#7b5ea7' }}>Lưu từ khi đọc truyện để xây dựng kho từ vựng!</p>
                  <Link href="/stories" className="action-btn inline-block px-6 py-3 rounded-2xl font-black text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 6px 20px rgba(124,58,237,0.4)' }}>
                    Đọc truyện ngay! 🦄
                  </Link>
                </div>
              )}

              {/* Flashcard Modal */}
              {showFlashcard && filteredVocab.length > 0 && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
                  <div className="rounded-3xl p-7 max-w-md w-full" style={{ background: 'white', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-black text-lg" style={{ color: '#1e1b4b' }}>🐰 Học Flashcard</h3>
                      <button onClick={() => setShowFlashcard(false)}
                        className="action-btn w-9 h-9 rounded-2xl flex items-center justify-center font-black text-lg"
                        style={{ background: '#f3e8ff', color: '#7c3aed' }}>✕</button>
                    </div>
                    <p className="text-center text-sm font-bold mb-5" style={{ color: '#7b5ea7' }}>
                      {currentFlashcardIndex + 1} / {filteredVocab.length}
                    </p>
                    <div onClick={() => setIsFlipped(!isFlipped)} className="rounded-3xl p-8 min-h-[180px] flex items-center justify-center cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #f3e8ff, #fce7f3)', boxShadow: '0 6px 20px rgba(124,58,237,0.2)' }}>
                      <div className="text-center">
                        {!isFlipped ? (
                          <>
                            <p className="text-3xl font-black mb-2" style={{ color: '#1e1b4b' }}>{filteredVocab[currentFlashcardIndex]?.word}</p>
                            <p className="text-sm font-bold" style={{ color: '#7b5ea7' }}>Nhấp để xem nghĩa 👆</p>
                          </>
                        ) : (
                          <>
                            <p className="text-2xl font-black mb-3" style={{ color: '#1e1b4b' }}>{filteredVocab[currentFlashcardIndex]?.vi}</p>
                            <button onClick={(e) => { e.stopPropagation(); pronounceWord(filteredVocab[currentFlashcardIndex]?.word); }}
                              className="action-btn text-sm font-black px-4 py-2 rounded-xl text-white"
                              style={{ background: 'linear-gradient(135deg, #60a5fa, #7c3aed)' }}>🎵 Nghe phát âm</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center gap-4 mt-5">
                      <button onClick={() => { setIsFlipped(false); setCurrentFlashcardIndex(prev => prev > 0 ? prev - 1 : filteredVocab.length - 1); }}
                        className="action-btn px-6 py-2.5 rounded-2xl font-black text-sm"
                        style={{ background: '#f3e8ff', color: '#7c3aed' }}>← Trước</button>
                      <button onClick={() => { setIsFlipped(false); setCurrentFlashcardIndex(prev => prev < filteredVocab.length - 1 ? prev + 1 : 0); }}
                        className="action-btn px-6 py-2.5 rounded-2xl font-black text-sm text-white"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>Tiếp →</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ STORIES TAB ══════════ */}
          {activeTab === 'stories' && (
            <div className="space-y-5">
              {[
                { title: '🎀 Đã hoàn thành', filter: (s: Story) => !!progress.storiesProgress[s.id]?.completed, empty: 'Chưa hoàn thành truyện nào' },
                { title: '🦄 Đang đọc', filter: (s: Story) => !!(progress.storiesProgress[s.id] && !progress.storiesProgress[s.id].completed), empty: 'Không có truyện đang đọc' },
                { title: '🐣 Chưa đọc', filter: (s: Story) => !progress.storiesProgress[s.id], empty: 'Đã đọc hết truyện!' },
              ].map(section => {
                const filtered = stories.filter(section.filter);
                return (
                  <div key={section.title} className="rounded-3xl p-6" style={{ background: 'white', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
                    <h3 className="font-black text-base mb-4" style={{ color: '#1e1b4b' }}>
                      {section.title} {filtered.length > 0 && <span style={{ color: '#9ca3af', fontWeight: 700 }}>({filtered.length})</span>}
                    </h3>
                    {filtered.length === 0 ? (
                      <p className="text-center py-4 font-bold text-sm" style={{ color: '#7b5ea7' }}>{section.empty}</p>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-3">
                        {filtered.map(story => {
                          const prog = progress.storiesProgress[story.id];
                          return (
                            <Link key={story.id} href={`/stories/${story.id}`}
                              className="flex items-center gap-3 p-3 rounded-2xl transition-colors hover:bg-purple-50">
                              <div className="text-3xl">{story.cover_image}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-black text-sm truncate" style={{ color: '#1e1b4b' }}>{story.title_en}</h4>
                                <p className="text-xs font-semibold truncate" style={{ color: '#7b5ea7' }}>{story.title_vi}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#ede9fe', color: '#7c3aed' }}>{story.level}</span>
                                  {prog?.completed && <span className="text-xs">{'🌟'.repeat(prog.starsEarned)}</span>}
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

          {/* ══════════ ACHIEVEMENTS TAB ══════════ */}
          {activeTab === 'achievements' && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="rounded-3xl p-7 text-white flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f97316)', boxShadow: '0 8px 32px rgba(251,191,36,0.5)' }}>
                <div>
                  <h3 className="text-2xl font-black mb-1">🏆 Thành tích</h3>
                  <p className="font-bold text-white/85">Đã đạt {earnedCount}/{achievements.length} thành tích</p>
                  <div className="h-3 rounded-full mt-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)', width: '200px' }}>
                    <div className="h-full rounded-full bg-white bar-fill"
                      style={{ width: `${Math.round(earnedCount / achievements.length * 100) || 2}%` }} />
                  </div>
                </div>
                <div className="text-7xl opacity-50 text-right">🦋</div>
              </div>

              {/* Achievement grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {achievements.map(a => (
                  <div key={a.id} className="achievement-card rounded-3xl p-5"
                    style={{ background: a.earned ? 'white' : '#f9fafb', boxShadow: a.earned ? '0 6px 24px rgba(124,58,237,0.15)' : '0 2px 8px rgba(0,0,0,0.04)', opacity: a.earned ? 1 : 0.65 }}>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl" style={{ filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-sm" style={{ color: '#1e1b4b' }}>{a.name}</h4>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: '#7b5ea7' }}>{a.desc}</p>
                      </div>
                      {a.earned && (
                        <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)', boxShadow: '0 3px 10px rgba(34,197,94,0.4)' }}>✓</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Game history */}
              {progress.gameScores.length > 0 && (
                <div className="rounded-3xl p-6" style={{ background: 'white', boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
                  <h3 className="font-black text-base mb-4" style={{ color: '#1e1b4b' }}>🎮 Lịch sử game</h3>
                  <div className="space-y-2">
                    {progress.gameScores.slice(-10).reverse().map((score, i) => {
                      const story = stories.find(s => s.id === score.storyId);
                      const perfect = score.score === score.totalQuestions;
                      return (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-2xl" style={{ background: '#faf5ff' }}>
                          <div className="text-2xl">{score.gameType === 'match' ? '🐙' : '🦊'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm truncate" style={{ color: '#1e1b4b' }}>{story?.title_en || score.storyId}</p>
                            <p className="text-xs font-semibold" style={{ color: '#7b5ea7' }}>{score.gameType === 'match' ? 'Matching Game' : 'Fill in Blank'}</p>
                          </div>
                          <div className="font-black text-sm" style={{ color: perfect ? '#22c55e' : '#7b5ea7' }}>
                            {perfect && '🦋 '}{score.score}/{score.totalQuestions}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FOOTER BANNER ── */}
          <div className="mt-8 rounded-3xl p-7 text-center"
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 40%, #ec4899 100%)', boxShadow: '0 10px 40px rgba(251,191,36,0.45)' }}>
            <p className="text-2xl font-black text-white mb-1.5" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
              🏆 Học giỏi tiếng Anh mỗi ngày!
            </p>
            <p className="text-white/90 font-bold">Kiên trì mỗi ngày, giỏi tiếng Anh mỗi ngày! 🚀✨</p>
          </div>
        </div>
      </main>
    </>
  );
}
