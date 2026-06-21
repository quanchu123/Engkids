'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, SlidersHorizontal, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import VideoCard from '@/components/video/VideoCard';
import VideoFilters, { VideoFiltersState } from '@/components/video/VideoFilters';
import CategorySection from '@/components/video/CategorySection';
import { DEFAULT_FEATURE } from '@/config/constants';
import { filterVideos, groupVideosByFeature } from '@/lib/content-selectors';
import { Video } from '@/types';
import { onContentChange } from '@/lib/content-sync';
import { DecorIcon } from '@/components/common/DecorIcon';
import { getStageById, type CurriculumStageId } from '@/lib/curriculum';

// Rotating palette for feature sections.
const FEATURE_COLORS: Array<'pink' | 'purple' | 'blue' | 'green' | 'orange' | 'yellow'> = [
  'purple', 'blue', 'green', 'orange', 'pink', 'yellow',
];

export default function VideosPageClient() {
  const [liveVideos, setLiveVideos] = useState<Video[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [learnerStageId, setLearnerStageId] = useState<CurriculumStageId | null>(null);
  const [filters, setFilters] = useState<VideoFiltersState>({
    search: '',
    level: null,
    topic: null,
    ageGroup: null,
  });

  useEffect(() => {
    let cancelled = false;
    const loadVideos = () => fetch(`/api/videos?category=video&_=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { videos?: Video[] } | null) => {
        if (!cancelled && Array.isArray(data?.videos)) {
          setLiveVideos(data.videos);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveVideos([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    const handleFocus = () => {
      loadVideos();
    };
    loadVideos();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // Refresh when an admin tab broadcasts a content change.
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

  useEffect(() => {
    let active = true;
    fetch('/api/learner/level', { credentials: 'include', cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const stageId = data?.learnerState?.currentStageId as CurriculumStageId | undefined;
        if (active && stageId) {
          setLearnerStageId(stageId);
          setFilters((current) => ({ ...current, level: stageId }));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const filteredVideos = useMemo(() => filterVideos(liveVideos, filters), [liveVideos, filters]);

  // Feature ("chủ đề") filter bar: list of all features present in the catalog.
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const featureList = useMemo(() => {
    const set = new Set<string>();
    liveVideos.forEach((v) => set.add(v.feature?.trim() || DEFAULT_FEATURE));
    // Default feature last, the rest alphabetical.
    return Array.from(set).sort((a, b) => {
      if (a === DEFAULT_FEATURE) return 1;
      if (b === DEFAULT_FEATURE) return -1;
      return a.localeCompare(b);
    });
  }, [liveVideos]);

  const visibleVideos = useMemo(() => {
    if (!selectedFeature) return filteredVideos;
    return filteredVideos.filter(
      (v) => (v.feature?.trim() || DEFAULT_FEATURE) === selectedFeature,
    );
  }, [filteredVideos, selectedFeature]);

  const featureGroups = useMemo(
    () => groupVideosByFeature(visibleVideos, DEFAULT_FEATURE),
    [visibleVideos],
  );

  const hasFilters = Boolean(filters.search || filters.level || filters.topic || filters.ageGroup);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 pb-12 pt-6">
        <section className="relative mb-6 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kid-purple via-kid-pink to-kid-orange p-5 shadow-lg">
              <DecorIcon name="video" className="absolute top-4 right-5 hidden h-14 w-14 rounded-2xl bg-white/15 text-white opacity-50 sm:flex" iconClassName="h-8 w-8" imageClassName="h-11 w-11 object-contain" />
              <DecorIcon name="sparkles" className="absolute bottom-4 left-4 hidden h-11 w-11 rounded-2xl bg-white/15 text-white opacity-45 sm:flex" iconClassName="h-6 w-6" imageClassName="h-9 w-9 object-contain" />
              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black text-white backdrop-blur-sm">
                  <Clapperboard size={14} aria-hidden="true" />
                  Kho video
                </div>
                <h1 className="mb-3 text-3xl font-black text-white drop-shadow-lg md:text-4xl">
                  Học tiếng Anh qua Video
                </h1>

                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                <input
                  type="text"
                  data-testid="videos-search"
                  placeholder="Tìm video..."
                  value={filters.search}
                  onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))}
                    className="min-h-[46px] w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-700 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
                />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {learnerStageId && (
                <button
                  onClick={() => setFilters((current) => ({ ...current, level: learnerStageId }))}
                  className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 font-black transition-colors ${filters.level === learnerStageId ? 'bg-kid-purple text-white' : 'bg-white text-violet-700 shadow'}`}
                >
                  Level của bé: {getStageById(learnerStageId).cefr}
                </button>
              )}
              <button
                onClick={() => setFilters((current) => ({ ...current, level: null }))}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 font-black transition-colors ${filters.level === null ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 shadow'}`}
              >
                Xem tất cả
              </button>
              <button
                onClick={() => setShowFilters((current) => !current)}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 font-black transition-colors ${showFilters ? 'bg-kid-purple text-white' : 'bg-white text-slate-700 shadow'}`}
              >
                <SlidersHorizontal size={17} aria-hidden="true" />
                Lọc video
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="soft-panel mb-8 rounded-[20px] p-4">
              <VideoFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          )}

          {/* Feature ("chủ đề") tabs */}
          {liveVideos.length > 0 && featureList.length > 1 && (
            <div className="soft-panel mb-6 flex flex-wrap gap-2 rounded-[20px] p-4">
              <button
                onClick={() => setSelectedFeature(null)}
                className={`min-h-[40px] rounded-xl px-4 text-sm font-bold transition-colors ${
                  selectedFeature === null ? 'bg-kid-purple text-white' : 'bg-white text-violet-700 shadow'
                }`}
              >
                Tất cả ({liveVideos.length})
              </button>
              {featureList.map((f) => {
                const count = liveVideos.filter((v) => (v.feature?.trim() || DEFAULT_FEATURE) === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setSelectedFeature(f)}
                    className={`min-h-[40px] rounded-xl px-4 text-sm font-bold transition-colors ${
                      selectedFeature === f ? 'bg-kid-purple text-white' : 'bg-white text-violet-700 shadow'
                    }`}
                  >
                    {f} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {visibleVideos.length === 0 ? (
            <div className="soft-panel rounded-3xl p-10 text-center shadow-lg">
              {!loaded ? (
                <>
                  <h2 className="text-2xl font-black text-slate-900">Đang tải video...</h2>
                  <p className="mt-2 text-slate-600">Danh sách đang được lấy trực tiếp từ máy chủ.</p>
                </>
              ) : liveVideos.length === 0 ? (
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
                {visibleVideos.map((video) => (
                  <VideoCard key={video.id} video={video} size="medium" />
                ))}
              </div>
            </section>
          ) : (
            <>
              {/* Group by feature (chủ đề). Videos without a feature appear under "Tổng Hợp". */}
              {featureGroups.map((group, index) => (
                <CategorySection
                  key={group.feature}
                  title={group.feature}
                  videos={group.videos}
                  color={FEATURE_COLORS[index % FEATURE_COLORS.length]}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
