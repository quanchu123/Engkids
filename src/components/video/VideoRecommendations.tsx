'use client';

import { useMemo } from 'react';
import { Video } from '@/types';
import VideoCard from './VideoCard';

interface VideoRecommendationsProps {
  currentVideo: Video;
  allVideos: Video[];
  maxVideos?: number;
}

export default function VideoRecommendations({
  currentVideo,
  allVideos,
  maxVideos = 6,
}: VideoRecommendationsProps) {
  const recommendations = useMemo(() => {
    const scored = allVideos
      .filter((video) => video.id !== currentVideo.id && video.status === 'ready')
      .map((video) => {
        let score = 0;

        if (video.level === currentVideo.level) score += 3;
        if (currentVideo.ageGroup && video.ageGroup === currentVideo.ageGroup) score += 2;

        if (currentVideo.topics && video.topics) {
          score += video.topics.filter((topic) => currentVideo.topics.includes(topic)).length;
        }

        const daysDiff = Math.floor((Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) score += 1;

        return { video, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxVideos)
      .map((item) => item.video);

    if (scored.length < maxVideos) {
      const remaining = allVideos
        .filter((video) => video.id !== currentVideo.id && video.status === 'ready' && !scored.find((item) => item.id === video.id))
        .slice(0, maxVideos - scored.length);
      return [...scored, ...remaining];
    }

    return scored;
  }, [allVideos, currentVideo, maxVideos]);

  if (recommendations.length === 0) return null;

  return (
    <section className="soft-panel rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900">Video liên quan</h3>
          <p className="text-sm text-slate-500">Chọn thêm video cùng level hoặc chủ đề để luyện tiếp.</p>
        </div>
        <span className="kid-chip px-3 py-1 text-xs font-black text-violet-700">{recommendations.length} video</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {recommendations.map((video) => (
          <VideoCard key={video.id} video={video} size="small" showTopics={false} showAge={false} />
        ))}
      </div>
    </section>
  );
}
