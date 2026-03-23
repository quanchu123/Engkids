'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Video } from '@/types';

const GRADIENTS = ['from-yellow-400 to-orange-400','from-purple-400 to-pink-400','from-green-400 to-teal-400','from-blue-400 to-indigo-400','from-pink-400 to-rose-400','from-amber-400 to-red-400','from-cyan-400 to-blue-400','from-lime-400 to-green-400'];
const SHADOWS = ['rgba(251,191,36,0.35)','rgba(168,85,247,0.35)','rgba(16,185,129,0.35)','rgba(99,102,241,0.35)','rgba(236,72,153,0.35)','rgba(249,115,22,0.35)','rgba(6,182,212,0.35)','rgba(132,204,22,0.35)'];
const EMOJIS = ['🌟','🦄','🌈','🐬','🦁','🐸','🦋','🐙','🎸','🎹','🪗','🎺'];

export default function MusicPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => { loadVideos(); }, []);

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos?category=music');
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load music videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const topics = useMemo(() => Array.from(new Set(videos.flatMap(v => v.topics || []))), [videos]);

  const filteredVideos = useMemo(() => videos.filter(video => {
    const matchesSearch = searchQuery === '' ||
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.titleVi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = !selectedTopic || video.topics?.includes(selectedTopic);
    return matchesSearch && matchesTopic;
  }), [videos, searchQuery, selectedTopic]);

  return (
    <>
      <style>{`
        .music-card { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease; }
        .music-card:hover { transform: translateY(-6px) scale(1.02); }
        .music-card:hover .play-overlay { opacity: 1 !important; }
        .note-float { animation: noteFloat 3s ease-in-out infinite; }
        @keyframes noteFloat { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-12px) rotate(10deg)} }
        .mascot-bounce { animation: mbounce 2.5s ease-in-out infinite; }
        @keyframes mbounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.4)} }
      `}</style>
      <Header />
      <main className="music-page min-h-screen pb-20" style={{ background: 'linear-gradient(160deg, #fce7f3 0%, #f3e8ff 45%, #dbeafe 100%)' }}>
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute top-0 left-0 w-full h-3" style={{ background: 'linear-gradient(90deg, #f97316, #fbbf24, #4ade80, #60a5fa, #a78bfa, #f472b6)' }} />
          {/* SVG music note decorations */}
          <svg className="note-float absolute top-28 left-[12%] opacity-40" width="32" height="40" viewBox="0 0 32 40" fill="none">
            <rect x="20" y="0" width="10" height="2" rx="1" fill="#a855f7"/>
            <rect x="28" y="0" width="2" height="20" rx="1" fill="#a855f7"/>
            <ellipse cx="14" cy="22" rx="8" ry="6" fill="#a855f7" transform="rotate(-15 14 22)"/>
          </svg>
          <svg className="note-float absolute top-16 right-[14%] opacity-35" width="28" height="36" viewBox="0 0 32 40" fill="none" style={{ animationDelay: '.7s' }}>
            <rect x="16" y="0" width="8" height="2" rx="1" fill="#ec4899"/>
            <rect x="22" y="0" width="2" height="16" rx="1" fill="#ec4899"/>
            <rect x="24" y="0" width="6" height="2" rx="1" fill="#ec4899"/>
            <rect x="28" y="0" width="2" height="16" rx="1" fill="#ec4899"/>
            <ellipse cx="12" cy="18" rx="7" ry="5" fill="#ec4899" transform="rotate(-15 12 18)"/>
            <ellipse cx="24" cy="18" rx="7" ry="5" fill="#ec4899" transform="rotate(-15 24 18)"/>
          </svg>
          <svg className="note-float absolute top-52 right-[10%] opacity-30" width="24" height="32" viewBox="0 0 32 40" fill="none" style={{ animationDelay: '1.4s' }}>
            <rect x="20" y="0" width="10" height="2" rx="1" fill="#60a5fa"/>
            <rect x="28" y="0" width="2" height="18" rx="1" fill="#60a5fa"/>
            <ellipse cx="14" cy="20" rx="8" ry="6" fill="#60a5fa" transform="rotate(-15 14 20)"/>
          </svg>
          {/* SVG star decorations */}
          <svg className="note-float absolute bottom-1/3 left-[8%] opacity-30" width="22" height="22" viewBox="0 0 24 24" style={{ animationDelay: '2s' }}>
            <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="#f472b6"/>
          </svg>
          <svg className="note-float absolute top-40 left-[6%] opacity-25" width="18" height="18" viewBox="0 0 24 24" style={{ animationDelay: '2.5s' }}>
            <polygon points="12,2 14.9,8.6 22,9.3 17,14.1 18.5,21 12,17.6 5.5,21 7,14.1 2,9.3 9.1,8.6" fill="#fbbf24"/>
          </svg>
        </div>
        <div className="relative" style={{ zIndex: 1 }}>
          {/* Hero */}
          <section className="px-4 pt-10 pb-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 font-bold text-sm"
                style={{ background: 'white', border: '3px solid #f472b6', boxShadow: '0 4px 16px rgba(244,114,182,0.3)', color: '#be185d' }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22c55e', animation: 'pulseDot 1.5s ease-in-out infinite' }} />
                Nhạc tiếng Anh siêu vui
              </div>

              {/* SVG Microphone illustration - centered */}
              <div className="flex justify-center mb-4 mascot-bounce">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="38" fill="#fce7f3" stroke="#f472b6" strokeWidth="2"/>
                  {/* mic body */}
                  <rect x="30" y="15" width="20" height="30" rx="10" fill="#ec4899"/>
                  <rect x="34" y="19" width="12" height="10" rx="4" fill="#fda4af" opacity="0.6"/>
                  {/* mic stand */}
                  <path d="M20 44 Q20 58 40 58 Q60 58 60 44" stroke="#a855f7" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  <rect x="38" y="57" width="4" height="10" rx="2" fill="#a855f7"/>
                  <rect x="30" y="65" width="20" height="3" rx="1.5" fill="#a855f7"/>
                  {/* sound waves */}
                  <path d="M14 35 Q10 40 14 45" stroke="#f472b6" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
                  <path d="M9 30 Q3 40 9 50" stroke="#f472b6" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
                  <path d="M66 35 Q70 40 66 45" stroke="#f472b6" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
                  <path d="M71 30 Q77 40 71 50" stroke="#f472b6" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4"/>
                </svg>
              </div>

              <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-3"
                style={{ background: 'linear-gradient(135deg, #f97316, #ec4899, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.02em' }}>
                Hát &amp; Học Cùng Nhau! 🎶
              </h1>
              <p className="text-base font-bold mb-5" style={{ color: '#0369a1' }}>Hát theo giai điệu vui nhộn, học tiếng Anh tự nhiên! 🌈</p>

              <div className="relative max-w-sm mx-auto">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="#a855f7" strokeWidth="2.5"/>
                  <path d="M16.5 16.5 L21 21" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <input type="text" placeholder="Tìm bài hát yêu thích..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-5 py-3.5 rounded-2xl font-bold text-gray-700 placeholder-gray-400 focus:outline-none"
                  style={{ background: 'white', border: '3px solid #d8b4fe', boxShadow: '0 4px 16px rgba(216,180,254,0.3)' }} />
              </div>
            </div>
          </section>

          {/* Topic Pills */}
          {topics.length > 0 && (
            <section className="px-4 pb-5">
              <div className="max-w-5xl mx-auto flex flex-wrap gap-2 justify-center">
                {[{ id: null, label: `🎵 Tất cả (${videos.length})` }, ...topics.map(t => ({ id: t, label: t }))].map((item) => (
                  <button key={String(item.id)} onClick={() => setSelectedTopic(item.id)}
                    className="px-5 py-2.5 rounded-2xl font-black text-sm transition-transform hover:scale-105"
                    style={selectedTopic === item.id ? {
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white',
                      boxShadow: '0 4px 14px rgba(168,85,247,0.4)', border: '2.5px solid transparent',
                    } : {
                      background: 'white', color: '#7c3aed', border: '2.5px solid #d8b4fe',
                    }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Grid */}
          <section className="px-4 pb-12">
            <div className="max-w-5xl mx-auto">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="rounded-3xl overflow-hidden" style={{ background: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                      <div className="aspect-video animate-pulse" style={{ background: 'linear-gradient(135deg, #f3e8ff, #fce7f3)' }} />
                      <div className="p-3 space-y-2">
                        <div className="h-4 rounded-full animate-pulse" style={{ background: '#f3e8ff', width: '75%' }} />
                        <div className="h-3 rounded-full animate-pulse" style={{ background: '#f3e8ff', width: '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredVideos.length > 0 ? (
                <>
                  <p className="text-sm font-black mb-4 text-center" style={{ color: '#7c3aed' }}>🎼 {filteredVideos.length} bài hát đang chờ bạn!</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredVideos.map((video, index) => <MusicCard key={video.id} video={video} colorIndex={index} />)}
                  </div>
                </>
              ) : videos.length === 0 ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'white' }}>
                  <div className="text-8xl mb-6 mascot-bounce inline-block">🎤</div>
                  <h3 className="text-2xl font-black mb-2" style={{ color: '#491956' }}>Chưa có bài hát nào</h3>
                  <p className="font-semibold" style={{ color: '#7b4886' }}>Hãy quay lại sau nhé!</p>
                </div>
              ) : (
                <div className="text-center py-16 rounded-3xl" style={{ background: 'white' }}>
                  <div className="text-6xl mb-4">🎵</div>
                  <h3 className="text-xl font-black mb-2" style={{ color: '#491956' }}>Không tìm thấy bài hát</h3>
                  <button onClick={() => { setSearchQuery(''); setSelectedTopic(null); }}
                    className="px-6 py-2.5 rounded-2xl font-black text-white mt-4"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 4px 14px rgba(168,85,247,0.4)' }}>
                    Xem tất cả 🌈
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Footer Banner */}
          <section className="max-w-5xl mx-auto px-4 mb-4">
            <div className="rounded-3xl p-6 text-center"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)', boxShadow: '0 8px 32px rgba(168,85,247,0.4)' }}>
              <p className="text-2xl font-black text-white mb-1">🎵 Hát mỗi ngày, giỏi tiếng Anh ngay!</p>
              <p className="text-white/90 font-bold text-sm">Âm nhạc giúp bạn nhớ từ vựng siêu nhanh! 🚀✨</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function MusicCard({ video, colorIndex }: { video: Video; colorIndex: number }) {
  const [imgError, setImgError] = useState(false);
  const gradient = GRADIENTS[colorIndex % GRADIENTS.length];
  const shadow = SHADOWS[colorIndex % SHADOWS.length];
  const emoji = EMOJIS[colorIndex % EMOJIS.length];
  const isNew = Date.now() - new Date(video.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Link href={`/videos/${video.id}`}>
      <div className="music-card rounded-3xl overflow-hidden"
        style={{ background: 'white', boxShadow: `0 6px 24px ${shadow}, 0 2px 8px rgba(0,0,0,0.06)`, border: '2.5px solid rgba(216,180,254,0.4)' }}>
        <div className="relative aspect-video overflow-hidden" style={{ borderRadius: '20px 20px 0 0' }}>
          {video.thumbnailUrl && !imgError ? (
            <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" onError={() => setImgError(true)} loading="lazy" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <span className="text-5xl">{emoji}</span>
            </div>
          )}
          <div className="play-overlay absolute inset-0 flex items-center justify-center opacity-0"
            style={{ background: 'rgba(0,0,0,0.25)' }}>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl">
              <span className="text-xl ml-0.5">▶️</span>
            </div>
          </div>
          {video.duration > 0 && (
            <div className="absolute bottom-2 right-2 text-white text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(0,0,0,0.65)' }}>
              {formatDuration(video.duration)}
            </div>
          )}
          {isNew && (
            <div className="absolute top-2 left-2 text-white text-[11px] font-black px-2.5 py-1 rounded-full"
              style={{ background: '#ec4899', boxShadow: '0 2px 10px rgba(236,72,153,0.6)' }}>✨ MỚI</div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-black text-sm leading-tight mb-1 line-clamp-2" style={{ color: '#1e1b4b' }}>{video.title}</h3>
          <p className="text-xs font-semibold line-clamp-1 mb-2" style={{ color: '#7b4886' }}>{video.titleVi}</p>
          <div className="flex items-center justify-between">
            {video.topics?.[0] ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f3e8ff', color: '#7c3aed' }}>{video.topics[0]}</span>
            ) : <span />}
            <span className="text-xs" style={{ color: '#f59e0b' }}>⭐⭐⭐</span>
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="w-full text-center text-sm font-black py-2 rounded-2xl text-white"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 3px 10px rgba(168,85,247,0.35)' }}>
            ▶ Nghe ngay!
          </div>
        </div>
      </div>
    </Link>
  );
}
