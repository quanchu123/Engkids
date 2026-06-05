'use client';

/* eslint-disable @next/next/no-img-element */

import { memo, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { ROUTES } from '@/config/constants';
import { VideoFallbackArtwork } from '@/components/common/FallbackArtwork';
import { Video } from '@/types';

const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  Animals: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Food: { bg: 'bg-red-100', text: 'text-red-700' },
  Nature: { bg: 'bg-green-100', text: 'text-green-700' },
  Family: { bg: 'bg-pink-100', text: 'text-pink-700' },
  School: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Adventure: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Friendship: { bg: 'bg-rose-100', text: 'text-rose-700' },
  Science: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  'Daily Life': { bg: 'bg-orange-100', text: 'text-orange-700' },
  History: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

const LEVEL_CONFIG = {
  Beginner: { bg: 'bg-green-400', label: 'Mới bắt đầu' },
  Elementary: { bg: 'bg-blue-400', label: 'Cơ bản' },
  Intermediate: { bg: 'bg-purple-400', label: 'Trung cấp' },
};

const AGE_CONFIG: Record<string, { label: string }> = {
  '3-5': { label: '3-5 tuổi' },
  '6-8': { label: '6-8 tuổi' },
  '9-12': { label: '9-12 tuổi' },
};

interface VideoCardProps {
  video: Video;
  size?: 'small' | 'medium' | 'large';
  showTopics?: boolean;
  showAge?: boolean;
  progress?: number;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function isNewVideo(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

export default memo(function VideoCard({
  video,
  size = 'medium',
  showTopics = true,
  showAge = true,
  progress,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const levelConfig = LEVEL_CONFIG[video.level] || LEVEL_CONFIG.Beginner;
  const ageConfig = video.ageGroup ? AGE_CONFIG[video.ageGroup] : null;

  const sizeClasses = {
    small: 'w-40',
    medium: 'w-56',
    large: 'w-72',
  };

  return (
    <Link href={ROUTES.VIDEO_DETAIL(video.id)} aria-label={video.titleVi || video.title}>
      <div
        className={`${sizeClasses[size]} group cursor-pointer transition-all duration-300`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`playful-card toy-panel relative aspect-video overflow-hidden rounded-[20px] ring-4 ring-transparent transition-all duration-300 ${
            isHovered ? '-translate-y-1 scale-105 ring-kid-yellow' : ''
          }`}
        >
          {video.thumbnailUrl && !imageError ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <VideoFallbackArtwork video={video} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/92 text-slate-900 shadow-lg transition-transform group-hover:scale-110">
              <Play size={22} fill="currentColor" aria-hidden="true" />
            </div>
          </div>

          {video.duration > 0 && (
            <div className="absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
              {formatDuration(video.duration)}
            </div>
          )}

          <div className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-bold text-white shadow-md ${levelConfig.bg}`}>
            <span className="hidden sm:inline">{levelConfig.label}</span>
          </div>

          {showAge && ageConfig && (
            <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-gray-700 shadow-md">
              <span className="hidden sm:inline">{ageConfig.label}</span>
            </div>
          )}

          {progress !== undefined && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div className="h-full bg-gradient-to-r from-kid-green to-kid-yellow transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          {isNewVideo(video.createdAt) && (
            <div className="absolute -right-1 -top-1 animate-pulse rounded-full bg-gradient-to-r from-red-500 to-pink-500 px-2 py-0.5 text-xs font-bold text-white shadow-lg">
              NEW
            </div>
          )}
        </div>

        <div className="mt-3 px-1">
          <h3 className="line-clamp-2 font-bold text-gray-800 transition-colors group-hover:text-kid-purple">
            {video.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-gray-500">{video.titleVi}</p>

          {showTopics && video.topics && video.topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {video.topics.slice(0, 2).map((topic) => {
                const topicConfig = TOPIC_COLORS[topic] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                return (
                  <span key={topic} className={`kid-chip px-2 py-0.5 text-xs font-medium ${topicConfig.bg} ${topicConfig.text}`}>
                    {topic}
                  </span>
                );
              })}
              {video.topics.length > 2 && (
                <span className="kid-chip bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  +{video.topics.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});
