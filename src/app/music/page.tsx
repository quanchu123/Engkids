'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Video } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';

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
      <main className="music-page min-h-screen pb-20 pt-2" style={{ background: 'linear-gradient(160deg, #fce7f3 0%, #f3e8ff 45%, #dbeafe 100%)' }}>
        
        {/* ── Header Banner ── */}
        <section className="relative overflow-hidden mb-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 p-5 shadow-lg">
              {/* Decorative elements */}
              <div className="absolute top-2 right-4 text-5xl opacity-30 animate-pulse">🎵</div>
              <div className="absolute bottom-2 left-3 text-4xl opacity-25">🎶</div>
              <div className="absolute top-4 left-1/4 text-3xl opacity-20">🎸</div>
              <div className="absolute bottom-3 right-1/4 text-2xl opacity-20">🎹</div>
              
              <div className="relative z-10 max-w-2xl">
                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
                  🎵 Hát & Học Cùng Nhau!
                </h1>
                
                {/* Search bar */}
                <div className="relative max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5"/>
                    <path d="M16.5 16.5 L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Tìm bài hát..." 
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
          {/* Topic Pills */}
          {topics.length > 0 && (
            <section className="pb-3">
              <div className="max-w-7xl mx-auto flex flex-wrap gap-2 justify-center">
                {[{ id: null, label: `🎵 Tất cả (${videos.length})` }, ...topics.map(t => ({ id: t, label: t }))].map((item) => (
                  <button key={String(item.id)} onClick={() => setSelectedTopic(item.id)}
                    className="px-4 py-1.5 rounded-xl font-bold text-xs transition-transform hover:scale-105"
                    style={selectedTopic === item.id ? {
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white',
                    } : {
                      background: 'white', color: '#7c3aed', border: '2px solid #d8b4fe',
                    }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Grid */}
          <section className="pb-6">
            <div className="max-w-7xl mx-auto">
              {loading ? (
                <LoadingSpinner message="Đang tải bài hát..." />
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
          <section className="max-w-7xl mx-auto px-4 mb-4">
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
