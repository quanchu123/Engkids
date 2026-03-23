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
  // Calculate recommendations based on matching criteria
  const recommendations = useMemo(() => {
    const scored = allVideos
      .filter(v => v.id !== currentVideo.id && v.status === 'ready')
      .map(video => {
        let score = 0;

        // Same level = +3 points
        if (video.level === currentVideo.level) {
          score += 3;
        }

        // Same age group = +2 points
        if (currentVideo.ageGroup && video.ageGroup === currentVideo.ageGroup) {
          score += 2;
        }

        // Matching topics = +1 point each
        if (currentVideo.topics && video.topics) {
          const matchingTopics = video.topics.filter(t => 
            currentVideo.topics.includes(t)
          );
          score += matchingTopics.length;
        }

        // Newer videos get slight bonus
        const daysDiff = Math.floor(
          (new Date().getTime() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 7) score += 1;

        return { video, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxVideos)
      .map(item => item.video);

    // If not enough recommendations, add random videos
    if (scored.length < maxVideos) {
      const remaining = allVideos
        .filter(v => 
          v.id !== currentVideo.id && 
          v.status === 'ready' &&
          !scored.find(s => s.id === v.id)
        )
        .slice(0, maxVideos - scored.length);
      return [...scored, ...remaining];
    }

    return scored;
  }, [currentVideo, allVideos, maxVideos]);

  if (recommendations.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">✨</span>
        <h3 className="text-xl font-bold text-gray-800">Video liên quan</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {recommendations.map((video, index) => (
          <div
            key={video.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <VideoCard
              video={video}
              size="small"
              showTopics={false}
              showAge={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
