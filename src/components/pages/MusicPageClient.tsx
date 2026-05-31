'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Video } from '@/types';

interface MusicPageClientProps {
  videos: Video[];
}

export default function MusicPageClient({ videos }: MusicPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const topics = useMemo(() => Array.from(new Set(videos.flatMap((video) => video.topics || []))), [videos]);
  const filteredVideos = useMemo(
    () =>
      videos.filter((video) => {
        const matchesSearch =
          !searchQuery ||
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.titleVi.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTopic = !selectedTopic || video.topics?.includes(selectedTopic);
        return matchesSearch && matchesTopic;
      }),
    [videos, searchQuery, selectedTopic],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-violet-50 to-sky-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <section className="relative mb-6 overflow-hidden">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 p-5 shadow-lg">
            <div className="absolute top-2 right-4 text-5xl opacity-30 animate-pulse">🎵</div>
            <div className="absolute bottom-2 left-3 text-4xl opacity-25">🎶</div>
            <div className="absolute top-4 left-1/4 text-3xl opacity-20">🎸</div>
            <div className="absolute bottom-3 right-1/4 text-2xl opacity-20">🎹</div>

            <div className="relative z-10 max-w-2xl">
              <h1 className="mb-3 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
                🎵 Hát & Học Cùng Nhau!
              </h1>

              <div className="relative max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5" />
                  <path d="M16.5 16.5 L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            <input
              type="text"
              data-testid="music-search"
              placeholder="Tìm bài hát..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl py-2 pl-9 pr-3 text-sm font-semibold text-gray-700 placeholder-gray-500 focus:outline-none"
            />
              </div>
            </div>
          </div>
        </section>

        {topics.length > 0 && (
          <section className="soft-panel mb-6 flex flex-wrap gap-2 rounded-[1.75rem] p-4">
            <button
              onClick={() => setSelectedTopic(null)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold ${selectedTopic === null ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 shadow'}`}
            >
              Tất cả ({videos.length})
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(topic)}
                className={`rounded-2xl px-4 py-2 text-sm font-bold ${selectedTopic === topic ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 shadow'}`}
              >
                {topic}
              </button>
            ))}
          </section>
        )}

        {filteredVideos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredVideos.map((video) => (
              <Link key={video.id} href={`/videos/${video.id}`} className="playful-card overflow-hidden rounded-3xl bg-white shadow-lg transition-transform hover:-translate-y-1">
                <div className="relative aspect-video bg-slate-100">
                  {video.thumbnailUrl ? (
                    <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg font-black uppercase tracking-[0.3em] text-violet-400">
                      Music
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-black text-slate-900">{video.title}</h3>
                  <p className="text-sm text-slate-500">{video.titleVi}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="soft-panel rounded-3xl p-10 text-center shadow-lg">
            <h2 className="text-2xl font-black text-slate-900">Không tìm thấy bài hát</h2>
            <p className="mt-2 text-slate-600">Thử đổi chủ đề hoặc từ khóa tìm kiếm.</p>
          </div>
        )}
      </main>
    </div>
  );
}
