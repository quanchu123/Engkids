'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/layout/Header';
import VideoCard from '@/components/video/VideoCard';
import VideoFilters, { VideoFiltersState } from '@/components/video/VideoFilters';
import CategorySection from '@/components/video/CategorySection';
import { TOPICS } from '@/config/constants';
import { filterVideos, groupVideosByLevel } from '@/lib/content-selectors';
import { Video } from '@/types';

interface VideosPageClientProps {
  videos: Video[];
}

const TOPIC_COLORS: Record<string, 'pink' | 'purple' | 'blue' | 'green' | 'orange' | 'yellow'> = {
  Animals: 'orange',
  Food: 'pink',
  Nature: 'green',
  Family: 'pink',
  School: 'blue',
  Adventure: 'purple',
  Friendship: 'pink',
  Science: 'blue',
  'Daily Life': 'orange',
  History: 'yellow',
};

export default function VideosPageClient({ videos }: VideosPageClientProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<VideoFiltersState>({
    search: '',
    level: null,
    topic: null,
    ageGroup: null,
  });

  const filteredVideos = useMemo(() => filterVideos(videos, filters), [videos, filters]);
  const groupedByLevel = useMemo(() => groupVideosByLevel(filteredVideos), [filteredVideos]);
  const videosByTopic = useMemo(() => {
    const groups: Record<string, Video[]> = {};
    TOPICS.forEach((topic) => {
      const topicVideos = filteredVideos.filter((video) => video.topics?.includes(topic));
      if (topicVideos.length > 0) {
        groups[topic] = topicVideos;
      }
    });
    return groups;
  }, [filteredVideos]);

  const featuredVideo = videos[0];
  const hasFilters = Boolean(filters.search || filters.level || filters.topic || filters.ageGroup);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 pb-12 pt-2">
        <section className="relative mb-6 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-kid-purple via-kid-pink to-kid-orange p-5 shadow-lg">
              <div className="absolute top-2 right-4 text-5xl opacity-30 animate-pulse">🎬</div>
              <div className="absolute bottom-2 left-3 text-4xl opacity-25">⭐</div>
              <div className="absolute top-4 left-1/4 text-3xl opacity-20">🎥</div>
              <div className="absolute bottom-3 right-1/4 text-2xl opacity-20">📺</div>

              <div className="relative z-10 max-w-2xl">
                <h1 className="mb-3 text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
                  🎬 Học tiếng Anh qua Video
                </h1>

                <div className="relative max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5" />
                    <path d="M16.5 16.5 L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                <input
                  type="text"
                  data-testid="videos-search"
                  placeholder="Tìm video..."
                  value={filters.search}
                  onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                    className="w-full rounded-xl py-2 pl-9 pr-3 text-sm font-semibold text-gray-700 placeholder-gray-500 focus:outline-none"
                />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setShowFilters((current) => !current)}
              className={`rounded-2xl px-5 py-3 font-bold transition-colors ${showFilters ? 'bg-kid-purple text-white' : 'bg-white text-slate-700 shadow'}`}
            >
              Lọc video
            </button>
          </div>

          {showFilters && (
            <div className="soft-panel mb-8 rounded-[1.75rem] p-4">
              <VideoFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          )}

          {filteredVideos.length === 0 ? (
            <div className="soft-panel rounded-3xl p-10 text-center shadow-lg">
              {videos.length === 0 ? (
                <>
                  <h2 className="text-2xl font-black text-slate-900">Chưa có video nào</h2>
                  <p className="mt-2 text-slate-600">
                    Video sẽ xuất hiện ở đây sau khi được tải lên trong trang quản trị.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black text-slate-900">Không tìm thấy video</h2>
                  <p className="mt-2 text-slate-600">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                </>
              )}
            </div>
          ) : hasFilters ? (
            <section>
              <h2 className="mb-4 text-2xl font-black text-slate-900">Kết quả tìm kiếm</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredVideos.map((video) => (
                  <VideoCard key={video.id} video={video} size="medium" />
                ))}
              </div>
            </section>
          ) : (
            <>
              {featuredVideo && (
                <section className="soft-feature mb-8 overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl">
                  <div className="relative p-8 text-white">
                    <p className="mb-3 inline-flex rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                      Featured
                    </p>
                    <h2 className="text-3xl font-black">{featuredVideo.title}</h2>
                    <p className="mt-2 text-white/80">{featuredVideo.titleVi}</p>
                  </div>
                </section>
              )}

              {groupedByLevel.beginner.length > 0 && (
                <CategorySection title="Mới bắt đầu" videos={groupedByLevel.beginner} color="green" />
              )}
              {groupedByLevel.elementary.length > 0 && (
                <CategorySection title="Cơ bản" videos={groupedByLevel.elementary} color="blue" />
              )}
              {groupedByLevel.intermediate.length > 0 && (
                <CategorySection title="Trung cấp" videos={groupedByLevel.intermediate} color="purple" />
              )}

              {Object.entries(videosByTopic).slice(0, 4).map(([topic, topicVideos]) => (
                <CategorySection
                  key={topic}
                  title={topic}
                  videos={topicVideos}
                  color={TOPIC_COLORS[topic] || 'purple'}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
