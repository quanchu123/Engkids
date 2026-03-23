'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';

const GAMES = [
  {
    id: 'rpg-world',
    title: 'RPG World',
    desc: 'Khám phá thế giới bằng tiếng Anh!',
    icon: '🗺️',
    grad: 'from-emerald-400 via-teal-400 to-cyan-400',
    shadow: 'rgba(16,185,129,0.35)',
    border: '#10b981',
    badge: 'HOT',
    badgeColor: '#f97316',
    href: '/games/rpg-world',
    stars: '★★★★★',
  },
  {
    id: 'word-burst',
    title: 'Word Burst',
    desc: 'Nổ quả cầu năng lượng đúng!',
    icon: '💥',
    grad: 'from-violet-500 via-purple-500 to-fuchsia-500',
    shadow: 'rgba(168,85,247,0.35)',
    border: '#a855f7',
    badge: 'NEW',
    badgeColor: '#06b6d4',
    href: '/games/word-burst',
    stars: '★★★★☆',
  },
  {
    id: 'word-puzzle',
    title: 'Word Puzzle',
    desc: 'Đoán từ qua gợi ý thú vị!',
    icon: '🧩',
    grad: 'from-blue-500 via-indigo-500 to-blue-600',
    shadow: 'rgba(99,102,241,0.35)',
    border: '#6366f1',
    badge: 'NEW',
    badgeColor: '#06b6d4',
    href: '/games/word-puzzle',
    stars: '★★★★☆',
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    desc: 'Ghép cặp Anh-Việt siêu vui!',
    icon: '🃏',
    grad: 'from-pink-500 via-rose-500 to-pink-600',
    shadow: 'rgba(236,72,153,0.35)',
    border: '#ec4899',
    badge: 'NEW',
    badgeColor: '#06b6d4',
    href: '/games/memory-match',
    stars: '★★★★☆',
  },
  {
    id: 'tower-word',
    title: 'Tower Word',
    desc: 'Xếp tháp khối chữ siêu đỉnh!',
    icon: '🏗️',
    grad: 'from-cyan-400 via-sky-500 to-blue-500',
    shadow: 'rgba(6,182,212,0.35)',
    border: '#06b6d4',
    badge: 'NEW',
    badgeColor: '#06b6d4',
    href: '/games/tower-word',
    stars: '★★★★☆',
  },
  {
    id: 'tower-climb',
    title: 'Tower Climb',
    desc: 'Leo tháp, học từ vựng Anh ngữ!',
    icon: '🧗',
    grad: 'from-orange-400 via-amber-500 to-red-500',
    shadow: 'rgba(249,115,22,0.35)',
    border: '#f97316',
    badge: 'HOT',
    badgeColor: '#f97316',
    href: '/games/tower-climb',
    stars: '★★★★★',
  },
];

const EXPLORE = [
  { href: '/stories', icon: '🦄', label: 'Truyện tranh', sub: 'Học qua truyện', bg: '#f3e8ff', border: '#c084fc' },
  { href: '/videos', icon: '🎬', label: 'Video học', sub: 'Video sinh động', bg: '#dbeafe', border: '#60a5fa' },
  { href: '/progress', icon: '⭐', label: 'Thành tích', sub: 'Xem điểm số', bg: '#fef9c3', border: '#facc15' },
];

export default function GamesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = GAMES.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <>
      <style>{`

        .game-card {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
          cursor: pointer;
        }
        .game-card:hover {
          transform: translateY(-6px) scale(1.02);
        }

        .play-btn {
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease;
        }
        .game-card:hover .play-btn {
          transform: scale(1.05);
          opacity: 1;
        }

        .float-star {
          animation: floatStar 3s ease-in-out infinite;
        }
        .float-star:nth-child(2) { animation-delay: 0.5s; }
        .float-star:nth-child(3) { animation-delay: 1.0s; }
        .float-star:nth-child(4) { animation-delay: 1.5s; }
        .float-star:nth-child(5) { animation-delay: 2.0s; }
        .float-star:nth-child(6) { animation-delay: 2.5s; }

        @keyframes floatStar {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(10deg); }
        }

        .mascot-bounce {
          animation: mascotBounce 2.5s ease-in-out infinite;
        }
        @keyframes mascotBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .pulse-dot {
          animation: pulseDot 1.5s ease-in-out infinite;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }

        .explore-tile {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
        }
        .explore-tile:hover {
          transform: translateY(-4px) scale(1.04);
        }

        .badge-hot {
          animation: badgePulse 1.8s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .rainbow-title {
          background: linear-gradient(135deg, #f97316 0%, #ec4899 25%, #a855f7 50%, #3b82f6 75%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cloud-shape {
          animation: cloudFloat 6s ease-in-out infinite;
        }
        @keyframes cloudFloat {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(15px); }
        }
      `}</style>

      <Header />
      <main className="games-page min-h-screen pb-20 pt-2" style={{
        background: 'linear-gradient(160deg, #e0f2fe 0%, #f3e8ff 45%, #fef9c3 100%)',
      }}>

        {/* ── Header Banner ── */}
        <section className="relative overflow-hidden mb-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 p-5 shadow-lg">
              {/* Decorative elements */}
              <div className="absolute top-2 right-4 text-5xl opacity-30 animate-pulse">🎮</div>
              <div className="absolute bottom-2 left-3 text-4xl opacity-25">⭐</div>
              <div className="absolute top-4 left-1/4 text-3xl opacity-20">🎯</div>
              <div className="absolute bottom-3 right-1/4 text-2xl opacity-20">🏆</div>
              
              <div className="relative z-10 max-w-2xl">
                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
                  🎮 Phòng Game Engkids!
                </h1>
                
                {/* Search bar */}
                <div className="relative max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5"/>
                    <path d="M16.5 16.5 L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Tìm game..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl font-semibold text-sm text-gray-700 placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4">
          {/* ── Game Cards Grid ── */}
          <section className="max-w-7xl mx-auto">
            {filteredGames.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-gray-600 font-semibold">Không tìm thấy game nào!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {filteredGames.map((g) => (
                <Link key={g.id} href={g.href} className="game-card block rounded-3xl overflow-hidden"
                  style={{
                    background: 'white',
                    boxShadow: `0 8px 32px ${g.shadow}, 0 2px 8px rgba(0,0,0,0.08)`,
                    border: `3px solid ${g.border}44`,
                  }}>

                  {/* Icon Zone */}
                  <div className={`relative flex items-center justify-center h-32 bg-gradient-to-br ${g.grad}`}
                    style={{ borderRadius: '20px 20px 0 0' }}>
                    {/* Shine */}
                    <div className="absolute inset-0 opacity-30" style={{
                      background: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.7) 0%, transparent 55%)',
                      borderRadius: '20px 20px 0 0',
                    }} />
                    {/* SVG star deco */}
                    <svg className="float-star absolute top-2 right-3" width="20" height="20" viewBox="0 0 24 24">
                      <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="rgba(255,255,255,0.85)"/>
                    </svg>
                    <span className="relative z-10 text-6xl drop-shadow-md" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                      {g.icon}
                    </span>
                    {/* Badge */}
                    {g.badge && (
                      <div className={`${g.badge === 'HOT' ? 'badge-hot' : ''} absolute top-2.5 left-3 z-10 text-white text-[11px] font-black px-2.5 py-1 rounded-full`}
                        style={{ background: g.badgeColor, boxShadow: `0 2px 10px ${g.badgeColor}88` }}>
                        {g.badge === 'HOT' ? '🔥 HOT' : '✨ NEW'}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 pb-3">
                    <h3 className="font-black text-base mb-1" style={{ color: '#1e1b4b', letterSpacing: '-0.01em' }}>
                      {g.title}
                    </h3>
                    <p className="text-xs font-semibold mb-3" style={{ color: '#6b7280', lineHeight: '1.4' }}>
                      {g.desc}
                    </p>
                    {/* Star rating as colored dots */}
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-3 h-3 rounded-full" style={{ background: i < (g.stars.split('★').length - 1) ? '#fbbf24' : '#e5e7eb' }} />
                      ))}
                    </div>
                  </div>

                  {/* Play button */}
                  <div className="px-4 pb-4">
                    <div className="play-btn w-full text-center text-sm font-black py-2.5 rounded-2xl text-white"
                      style={{
                        background: `linear-gradient(135deg, ${g.border}, ${g.border}cc)`,
                        boxShadow: `0 4px 14px ${g.shadow}`,
                        letterSpacing: '0.01em',
                      }}>
                      ▶ CHƠI NGAY!
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            )}
          </section>

          {/* ── Explore More ── */}
          <section className="max-w-5xl mx-auto px-4 mt-12">
            <div className="text-center mb-4">
              <span className="text-sm font-black uppercase tracking-widest px-4 py-1.5 rounded-full"
                style={{ background: 'white', color: '#7c3aed', border: '2px solid #c084fc' }}>
                🌈 Khám phá thêm nào!
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {EXPLORE.map(item => (
                <Link key={item.href} href={item.href}
                  className="explore-tile flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{
                    background: item.bg,
                    border: `2.5px solid ${item.border}`,
                    boxShadow: `0 4px 16px ${item.border}33`,
                  }}>
                  <span className="text-3xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <span className="font-black text-sm block" style={{ color: '#1e1b4b' }}>{item.label}</span>
                    <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>{item.sub}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Motivational Footer Banner ── */}
          <section className="max-w-5xl mx-auto px-4 mt-10">
            <div className="rounded-3xl p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ec4899 100%)',
                boxShadow: '0 8px 32px rgba(251,191,36,0.4)',
              }}>
              <p className="text-2xl font-black text-white mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                🏆 Học giỏi tiếng Anh mỗi ngày!
              </p>
              <p className="text-white/90 font-bold text-sm">
                Chơi game = Học tiếng Anh = Vui mỗi ngày! 🚀✨
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
