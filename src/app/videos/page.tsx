'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Video } from '@/types';
import Header from '@/components/layout/Header';
import VideoCard from '@/components/video/VideoCard';
import VideoFilters, { VideoFiltersState } from '@/components/video/VideoFilters';
import CategorySection from '@/components/video/CategorySection';
import { ROUTES, TOPICS } from '@/config/constants';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Topic emoji mapping
const TOPIC_EMOJI: Record<string, string> = {
  'Animals': '🐾',
  'Food': '🍕',
  'Nature': '🌿',
  'Family': '👨‍👩‍👧',
  'School': '📚',
  'Adventure': '🚀',
  'Friendship': '💕',
  'Science': '🔬',
  'Daily Life': '☀️',
  'History': '🏛️',
};

const TOPIC_COLORS: Record<string, 'pink' | 'purple' | 'blue' | 'green' | 'orange' | 'yellow'> = {
  'Animals': 'orange',
  'Food': 'pink',
  'Nature': 'green',
  'Family': 'pink',
  'School': 'blue',
  'Adventure': 'purple',
  'Friendship': 'pink',
  'Science': 'blue',
  'Daily Life': 'orange',
  'History': 'yellow',
};

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<VideoFiltersState>({
    search: '',
    level: null,
    topic: null,
    ageGroup: null,
  });

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos?category=video');
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter videos based on current filters
  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          video.title.toLowerCase().includes(searchLower) ||
          video.titleVi.toLowerCase().includes(searchLower) ||
          video.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Level filter
      if (filters.level && video.level !== filters.level) {
        return false;
      }

      // Topic filter
      if (filters.topic && !video.topics?.includes(filters.topic)) {
        return false;
      }

      // Age filter
      if (filters.ageGroup && video.ageGroup !== filters.ageGroup) {
        return false;
      }

      return true;
    });
  }, [videos, filters]);

  // Group videos by level
  const beginnerVideos = useMemo(() => 
    filteredVideos.filter(v => v.level === 'Beginner'), 
    [filteredVideos]
  );
  const elementaryVideos = useMemo(() => 
    filteredVideos.filter(v => v.level === 'Elementary'), 
    [filteredVideos]
  );
  const intermediateVideos = useMemo(() => 
    filteredVideos.filter(v => v.level === 'Intermediate'), 
    [filteredVideos]
  );

  // Group videos by topic
  const videosByTopic = useMemo(() => {
    const groups: Record<string, Video[]> = {};
    TOPICS.forEach(topic => {
      const topicVideos = videos.filter(v => v.topics?.includes(topic));
      if (topicVideos.length > 0) {
        groups[topic] = topicVideos;
      }
    });
    return groups;
  }, [videos]);

  // Featured video (most recent)
  const featuredVideo = videos[0];

  // Check if any filter is active
  const hasFilters = filters.search || filters.level || filters.topic || filters.ageGroup;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 pt-2 pb-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden mb-6">
          <div className="max-w-7xl mx-auto px-4">
            {/* Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-kid-purple via-kid-pink to-kid-orange p-5 shadow-lg">
              {/* Decorative Elements */}
              <div className="absolute top-2 right-4 text-5xl opacity-30 animate-pulse">🎬</div>
              <div className="absolute bottom-2 left-3 text-4xl opacity-25">⭐</div>
              <div className="absolute top-4 left-1/4 text-3xl opacity-20">🎥</div>
              <div className="absolute bottom-3 right-1/4 text-2xl opacity-20">📺</div>
              
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
                  🎬 Học tiếng Anh qua Video
                </h1>
                
                {/* Search bar */}
                <div className="relative max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2.5"/>
                    <path d="M16.5 16.5 L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Tìm video..." 
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl font-semibold text-sm text-gray-700 placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 md:px-1">
          {/* Filter Toggle */}
          <div className="flex items-center justify-between mb-6 -mt-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-6 py-1  rounded-2xl font-bold transition-all duration-200
                ${showFilters 
                  ? 'bg-kid-purple text-white shadow-lg' 
                  : 'bg-white text-gray-700 shadow-kid hover:shadow-kid-hover'
                }
              `}
            >
              <span>🎯</span>
              <span>Lọc video</span>
              {hasFilters && (
                <span className="ml-1 px-2 py-0.5 bg-kid-yellow text-gray-800 rounded-full text-xs">
                  {[filters.level, filters.topic, filters.ageGroup].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Quick Level Pills */}
            <div className="hidden md:flex gap-2">
              {[
                { level: null, label: 'Tất cả', emoji: '📺' },
                { level: 'Beginner', label: 'Mới bắt đầu', emoji: '🌱' },
                { level: 'Elementary', label: 'Cơ bản', emoji: '🌿' },
                { level: 'Intermediate', label: 'Trung cấp', emoji: '🌳' },
              ].map(item => (
                <button
                  key={item.level || 'all'}
                  onClick={() => setFilters(f => ({ ...f, level: item.level }))}
                  className={`
                    px-4 py-2 rounded-xl font-medium transition-all duration-200
                    ${filters.level === item.level
                      ? 'bg-gradient-to-r from-kid-green to-kid-blue text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                    }
                  `}
                >
                  <span className="mr-1">{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-8 animate-fade-in">
              <VideoFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <LoadingSpinner message="Đang tải video..." />
          )}

          {/* Empty State */}
          {!loading && filteredVideos.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📹</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                {hasFilters ? 'Không tìm thấy video' : 'Chưa có video'}
              </h3>
              <p className="text-gray-500 mb-4">
                {hasFilters 
                  ? 'Thử thay đổi bộ lọc để tìm video khác nhé!' 
                  : 'Quay lại sau để xem video mới nhé!'
                }
              </p>
              {hasFilters && (
                <button
                  onClick={() => setFilters({ search: '', level: null, topic: null, ageGroup: null })}
                  className="px-6 py-3 bg-kid-purple text-white rounded-xl font-bold hover:bg-kid-purple/90 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}

          {/* Content - When filters active, show grid */}
          {!loading && hasFilters && filteredVideos.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔍</span>
                <h2 className="text-xl font-bold text-gray-800">
                  Kết quả tìm kiếm ({filteredVideos.length} video)
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {filteredVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <VideoCard video={video} size="medium" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Content - When no filters, show categorized sections */}
          {!loading && !hasFilters && videos.length > 0 && (
            <>
              {/* Featured Video */}
              {featuredVideo && (
                <section className="mb-8 -mt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl animate-pulse">⭐</span>
                    <h2 className="text-xl font-bold text-gray-800">Video mới nhất</h2>
                  </div>
                  <Link href={ROUTES.VIDEO_DETAIL(featuredVideo.id)}>
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-kid-lg group cursor-pointer">
                      {/* Thumbnail Background */}
                      {featuredVideo.thumbnailUrl && (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:opacity-70 transition-opacity"
                          style={{ backgroundImage: `url(${featuredVideo.thumbnailUrl})` }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      
                      {/* Content */}
                      <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-end md:items-center justify-between min-h-[200px] md:min-h-[280px]">
                        <div className="max-w-xl">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-kid-yellow text-gray-900 text-sm font-bold rounded-full mb-3">
                            <span>✨</span> MỚI NHẤT
                          </div>
                          <h3 className="text-2xl md:text-4xl font-bold text-white mb-2 group-hover:text-kid-yellow transition-colors">
                            {featuredVideo.title}
                          </h3>
                          <p className="text-lg text-white/80 mb-4">
                            {featuredVideo.titleVi}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                              🌱 {featuredVideo.level}
                            </span>
                            {featuredVideo.duration > 0 && (
                              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full">
                                ⏱️ {Math.floor(featuredVideo.duration / 60)} phút
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Play Button */}
                        <div className="mt-4 md:mt-0">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <span className="text-3xl md:text-4xl ml-1">▶️</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </section>
              )}

              {/* By Level Sections */}
              {beginnerVideos.length > 0 && (
                <CategorySection
                  title="Mới bắt đầu"
                  emoji="🌱"
                  videos={beginnerVideos}
                  color="green"
                />
              )}

              {elementaryVideos.length > 0 && (
                <CategorySection
                  title="Cơ bản"
                  emoji="🌿"
                  videos={elementaryVideos}
                  color="blue"
                />
              )}

              {intermediateVideos.length > 0 && (
                <CategorySection
                  title="Trung cấp"
                  emoji="🌳"
                  videos={intermediateVideos}
                  color="purple"
                />
              )}

              {/* By Topic Sections */}
              {Object.entries(videosByTopic).slice(0, 4).map(([topic, topicVideos]) => (
                <CategorySection
                  key={topic}
                  title={topic}
                  emoji={TOPIC_EMOJI[topic] || '📌'}
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