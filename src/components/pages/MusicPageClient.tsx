'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Music, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Video } from '@/types';
import { DEFAULT_FEATURE } from '@/config/constants';
import { groupVideosByFeature } from '@/lib/content-selectors';
import { onContentChange } from '@/lib/content-sync';
import { VideoFallbackArtwork } from '@/components/common/FallbackArtwork';
import { DecorIcon } from '@/components/common/DecorIcon';

interface MusicPageClientProps {
  videos: Video[];
}

export default function MusicPageClient({ videos }: MusicPageClientProps) {
  const [liveVideos, setLiveVideos] = useState(videos);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadVideos = () => fetch(`/api/videos?category=music&_=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { videos?: Video[] } | null) => {
        if (!cancelled && Array.isArray(data?.videos)) {
          setLiveVideos(data.videos);
        }
      })
      .catch(() => {});
    const handleFocus = () => {
      loadVideos();
    };
    loadVideos();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const unsubscribe = onContentChange((kind) => {
      if (kind === 'videos' || kind === 'all') loadVideos();
    });

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      unsubscribe();
    };
  }, []);

  // All feature labels present (default "Tổng Hợp" last).
  const features = useMemo(() => {
    const set = new Set<string>();
    liveVideos.forEach((v) => set.add(v.feature?.trim() || DEFAULT_FEATURE));
    return Array.from(set).sort((a, b) => {
      if (a === DEFAULT_FEATURE) return 1;
      if (b === DEFAULT_FEATURE) return -1;
      return a.localeCompare(b);
    });
  }, [liveVideos]);

  const filteredVideos = useMemo(
    () =>
      liveVideos.filter((video) => {
        const matchesSearch =
          !searchQuery ||
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.titleVi.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFeature =
          !selectedFeature || (video.feature?.trim() || DEFAULT_FEATURE) === selectedFeature;
        return matchesSearch && matchesFeature;
      }),
    [liveVideos, searchQuery, selectedFeature],
  );

  const featureGroups = useMemo(
    () => groupVideosByFeature(filteredVideos, DEFAULT_FEATURE),
    [filteredVideos],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-violet-50 to-sky-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 p-5 shadow-lg">
          <DecorIcon name="music" className="absolute top-4 right-5 hidden h-14 w-14 rounded-2xl bg-white/15 text-white opacity-50 sm:flex" iconClassName="h-8 w-8" imageClassName="h-11 w-11 object-contain" />
          <DecorIcon name="mic" className="absolute bottom-4 left-4 hidden h-11 w-11 rounded-2xl bg-white/15 text-white opacity-45 sm:flex" iconClassName="h-6 w-6" imageClassName="h-9 w-9 object-contain" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
              <Music size={14} aria-hidden="true" />
              Kho bài hát
            </div>
            <h1 className="mb-3 text-3xl font-black text-white drop-shadow-lg md:text-4xl">
                Hát & Học Cùng Nhau
              </h1>

            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
              <input
                type="text"
                data-testid="music-search"
                placeholder="Tìm bài hát..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-[46px] w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-700 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </div>
          </div>
        </section>

        {features.length > 1 && (
          <section className="soft-panel mb-6 flex flex-wrap gap-2 rounded-[20px] p-4">
            <button
              onClick={() => setSelectedFeature(null)}
              className={`min-h-[40px] rounded-xl px-4 text-sm font-bold ${selectedFeature === null ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 shadow'}`}
            >
              Tất cả ({liveVideos.length})
            </button>
            {features.map((f) => {
              const count = liveVideos.filter((v) => (v.feature?.trim() || DEFAULT_FEATURE) === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFeature(f)}
                  className={`min-h-[40px] rounded-xl px-4 text-sm font-bold ${selectedFeature === f ? 'bg-violet-600 text-white' : 'bg-white text-violet-700 shadow'}`}
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
                    <Link key={video.id} href={`/videos/${video.id}`} className="playful-card group overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                      <div className="relative aspect-video overflow-hidden bg-slate-100">
                        {video.thumbnailUrl ? (
                          <Image src={video.thumbnailUrl} alt={video.title} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 768px) 100vw, 25vw" />
                        ) : (
                          <VideoFallbackArtwork video={video} />
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
            {liveVideos.length === 0 ? (
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
