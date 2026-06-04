'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Video } from '@/types';
import { DEFAULT_FEATURE } from '@/config/constants';
import { groupVideosByFeature } from '@/lib/content-selectors';

interface MusicPageClientProps {
  videos: Video[];
}

export default function MusicPageClient({ videos }: MusicPageClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  // All feature labels present (default "Tổng Hợp" last).
  const features = useMemo(() => {
    const set = new Set<string>();
    videos.forEach((v) => set.add(v.feature?.trim() || DEFAULT_FEATURE));
    return Array.from(set).sort((a, b) => {
      if (a === DEFAULT_FEATURE) return 1;
      if (b === DEFAULT_FEATURE) return -1;
      return a.localeCompare(b);
    });
  }, [videos]);

  const filteredVideos = useMemo(
    () =>
      videos.filter((video) => {
        const matchesSearch =
          !searchQuery ||
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.titleVi.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFeature =
          !selectedFeature || (video.feature?.trim() || DEFAULT_FEATURE) === selectedFeature;
        return matchesSearch && matchesFeature;
      }),
    [videos, searchQuery, selectedFeature],
  );

  const featureGroups = useMemo(
    () => groupVideosByFeature(filteredVideos, DEFAULT_FEATURE),
    [filteredVideos],
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

        {features.length > 1 && (
          <section className="soft-panel mb-6 flex flex-wrap gap-2 rounded-[1.75rem] p-4">
            <button
              onClick={() => setSelectedFeature(null)}
              className={`rounded-2xl px-4 py-2 text-sm font-bold ${selectedFeature === null ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 shadow'}`}
            >
              Tất cả ({videos.length})
            </button>
            {features.map((f) => {
              const count = videos.filter((v) => (v.feature?.trim() || DEFAULT_FEATURE) === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFeature(f)}
                  className={`rounded-2xl px-4 py-2 text-sm font-bold ${selectedFeature === f ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 shadow'}`}
                >
                  {f} ({count})
                </button>
              );
            })}
          </section>
        )}

        {filteredVideos.length > 0 ? (
          <div className="space-y-8">
            {featureGroups.map((group) => (
              <section key={group.feature}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-xl font-black text-slate-900 md:text-2xl">{group.feature}</h2>
                  <span className="kid-chip px-2 py-0.5 text-sm font-medium text-slate-500">
                    {group.videos.length} bài
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {group.videos.map((video) => (
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
              </section>
            ))}
          </div>
        ) : (
          <div className="soft-panel rounded-3xl p-10 text-center shadow-lg">
            {videos.length === 0 ? (
              <>
                <h2 className="text-2xl font-black text-slate-900">Chưa có bài hát nào</h2>
                <p className="mt-2 text-slate-600">Bài hát sẽ xuất hiện sau khi được tải lên trong trang quản trị.</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-slate-900">Không tìm thấy bài hát</h2>
                <p className="mt-2 text-slate-600">Thử đổi chủ đề hoặc từ khóa tìm kiếm.</p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
