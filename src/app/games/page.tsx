'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import { DecorIcon } from '@/components/common/DecorIcon';
import { PUBLIC_GAMES } from '@/data/public-games';

const EXPLORE = [
  { href: '/roadmap', icon: 'sparkles', label: 'Lộ trình học', sub: 'Theo chuẩn CEFR', bg: '#e0e7ff', border: '#818cf8' },
  { href: '/stories', icon: 'story', label: 'Truyện tranh', sub: 'Học qua truyện', bg: '#f3e8ff', border: '#c084fc' },
  { href: '/videos', icon: 'video', label: 'Video học', sub: 'Video sinh động', bg: '#dbeafe', border: '#60a5fa' },
  { href: '/progress', icon: 'progress', label: 'Thành tích', sub: 'Xem điểm số', bg: '#fef9c3', border: '#facc15' },
];

export default function GamesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return PUBLIC_GAMES;
    return PUBLIC_GAMES.filter((game) =>
      game.title.toLowerCase().includes(query) ||
      game.desc.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  return (
    <>
      <Header />
      <main
        className="min-h-screen pb-20 pt-6"
        style={{ background: 'linear-gradient(160deg, #e0f2fe 0%, #f3e8ff 45%, #fef9c3 100%)' }}
      >
        <section className="relative mb-6 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 p-5 shadow-lg">
              <DecorIcon name="game" className="absolute right-5 top-4 hidden h-14 w-14 rounded-2xl bg-white/15 text-white opacity-50 sm:flex" iconClassName="h-8 w-8" imageClassName="h-11 w-11 object-contain" />
              <DecorIcon name="trophy" className="absolute bottom-4 left-4 hidden h-11 w-11 rounded-2xl bg-white/15 text-white opacity-45 sm:flex" iconClassName="h-6 w-6" imageClassName="h-9 w-9 object-contain" />

              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
                  <DecorIcon name="game" iconClassName="h-4 w-4" imageClassName="h-5 w-5 object-contain" />
                  Phòng game
                </div>
                <h1 className="mb-3 text-3xl font-black text-white drop-shadow-lg md:text-4xl">
                  Phòng Game Engkids
                </h1>

                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Tìm game..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="min-h-[46px] w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-700 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4">
          {filteredGames.length === 0 ? (
            <div className="soft-panel rounded-3xl p-10 text-center">
              <p className="font-semibold text-slate-600">Không tìm thấy game nào.</p>
            </div>
          ) : (
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {filteredGames.map((game) => (
                <Link
                  key={game.id}
                  href={game.href}
                  className="playful-card block overflow-hidden rounded-2xl bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
                  style={{ border: `2px solid ${game.border}44` }}
                >
                  <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${game.grad}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.65),transparent_55%)]" />
                    <DecorIcon name={game.icon} className="relative z-10 h-14 w-14 text-white" iconClassName="h-9 w-9 drop-shadow-md" imageClassName="h-12 w-12 object-contain drop-shadow-md" />
                    {game.badge && (
                      <div className="absolute left-2 top-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black text-slate-800">
                        {game.badge}
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="truncate text-sm font-black text-slate-900">{game.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{game.desc}</p>
                    <div
                      className="mt-3 rounded-xl py-2 text-center text-xs font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${game.border}, ${game.border}cc)` }}
                    >
                      Chơi
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          )}

          <section className="mx-auto mt-12 max-w-5xl">
            <div className="mb-4 text-center">
              <span className="rounded-full border-2 border-violet-300 bg-white px-4 py-1.5 text-sm font-black uppercase tracking-widest text-violet-600">
                Khám phá thêm
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXPLORE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: item.bg, border: `2.5px solid ${item.border}` }}
                >
                  <DecorIcon name={item.icon} className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white/70" iconClassName="h-7 w-7" imageClassName="h-10 w-10 object-contain" />
                  <div>
                    <span className="block text-sm font-black text-slate-900">{item.label}</span>
                    <span className="text-xs font-semibold text-slate-500">{item.sub}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-10 max-w-5xl">
            <div className="rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-6 text-center shadow-xl">
              <p className="mb-1 text-2xl font-black text-white drop-shadow">Học giỏi tiếng Anh mỗi ngày</p>
              <p className="text-sm font-bold text-white/90">Chơi game, học từ mới và quay lại luyện tiếp.</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
