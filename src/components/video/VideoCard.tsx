'use client';

import { useState, memo } from 'react';
import Link from 'next/link';
import { Video } from '@/types';
import { ROUTES } from '@/config/constants';

// Topic colors for cute badges
const TOPIC_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  'Animals': { bg: 'bg-amber-100', text: 'text-amber-700', emoji: '🐾' },
  'Food': { bg: 'bg-red-100', text: 'text-red-700', emoji: '🍕' },
  'Nature': { bg: 'bg-green-100', text: 'text-green-700', emoji: '🌿' },
  'Family': { bg: 'bg-pink-100', text: 'text-pink-700', emoji: '👨‍👩‍👧' },
  'School': { bg: 'bg-blue-100', text: 'text-blue-700', emoji: '📚' },
  'Adventure': { bg: 'bg-purple-100', text: 'text-purple-700', emoji: '🚀' },
  'Friendship': { bg: 'bg-rose-100', text: 'text-rose-700', emoji: '💕' },
  'Science': { bg: 'bg-cyan-100', text: 'text-cyan-700', emoji: '🔬' },
  'Daily Life': { bg: 'bg-orange-100', text: 'text-orange-700', emoji: '☀️' },
  'History': { bg: 'bg-yellow-100', text: 'text-yellow-700', emoji: '🏛️' },
};

// Level config with emojis
const LEVEL_CONFIG = {
  'Beginner': { emoji: '🌱', bg: 'bg-green-400', label: 'Mới bắt đầu' },
  'Elementary': { emoji: '🌿', bg: 'bg-blue-400', label: 'Cơ bản' },
  'Intermediate': { emoji: '🌳', bg: 'bg-purple-400', label: 'Trung cấp' },
};

// Age group config
const AGE_CONFIG: Record<string, { emoji: string; label: string }> = {
  '3-5': { emoji: '👶', label: '3-5 tuổi' },
  '6-8': { emoji: '🧒', label: '6-8 tuổi' },
  '9-12': { emoji: '👦', label: '9-12 tuổi' },
};

interface VideoCardProps {
  video: Video;
  size?: 'small' | 'medium' | 'large';
  showTopics?: boolean;
  showAge?: boolean;
  progress?: number; // 0-100 for watched progress
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

  const levelConfig = LEVEL_CONFIG[video.level] || LEVEL_CONFIG['Beginner'];
  const ageConfig = video.ageGroup ? AGE_CONFIG[video.ageGroup] : null;

  // Size variants
  const sizeClasses = {
    small: 'w-40',
    medium: 'w-56',
    large: 'w-72',
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Default thumbnail with gradient
  const defaultThumbnail = (
    <div className="absolute inset-0 bg-gradient-to-br from-kid-pink via-kid-purple to-kid-blue flex items-center justify-center">
      <span className="text-6xl animate-bounce-slow">🎬</span>
    </div>
  );

  return (
    <Link href={ROUTES.VIDEO_DETAIL(video.id)} aria-label={video.titleVi || video.title}>
      <div
        className={`${sizeClasses[size]} group cursor-pointer transition-all duration-300`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail Container */}
        <div
          className={`
            relative aspect-video rounded-2xl overflow-hidden
            shadow-kid transition-all duration-300
            ${isHovered ? 'shadow-kid-hover scale-105 -translate-y-1' : ''}
            ring-4 ring-transparent
            ${isHovered ? 'ring-kid-yellow' : ''}
          `}
        >
          {/* Thumbnail Image - Using img tag to avoid Next.js proxy 403 errors with Bunny CDN */}
          {video.thumbnailUrl && !imageError ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            defaultThumbnail
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Play Button on Hover */}
          <div
            className={`
              absolute inset-0 flex items-center justify-center
              transition-all duration-300
              ${isHovered ? 'opacity-100' : 'opacity-0'}
            `}
          >
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
              <span className="text-2xl ml-1">▶️</span>
            </div>
          </div>

          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded-lg text-white text-xs font-medium">
            {formatDuration(video.duration)}
          </div>

          {/* Level Badge */}
          <div className={`absolute top-2 left-2 px-2 py-1 ${levelConfig.bg} rounded-full text-white text-xs font-bold flex items-center gap-1 shadow-md`}>
            <span>{levelConfig.emoji}</span>
            <span className="hidden sm:inline">{levelConfig.label}</span>
          </div>

          {/* Age Badge */}
          {showAge && ageConfig && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
              <span>{ageConfig.emoji}</span>
              <span className="hidden sm:inline text-gray-700">{ageConfig.label}</span>
            </div>
          )}

          {/* Progress Bar */}
          {progress !== undefined && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div
                className="h-full bg-gradient-to-r from-kid-green to-kid-yellow transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* NEW Badge for recent videos */}
          {isNewVideo(video.createdAt) && (
            <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white text-xs font-bold shadow-lg animate-pulse">
              NEW ✨
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="mt-3 px-1">
          {/* Title */}
          <h3 className="font-bold text-gray-800 line-clamp-2 group-hover:text-kid-purple transition-colors">
            {video.title}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
            {video.titleVi}
          </p>

          {/* Topic Tags */}
          {showTopics && video.topics && video.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.topics.slice(0, 2).map((topic) => {
                const topicConfig = TOPIC_COLORS[topic] || { bg: 'bg-gray-100', text: 'text-gray-600', emoji: '📌' };
                return (
                  <span
                    key={topic}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${topicConfig.bg} ${topicConfig.text} flex items-center gap-1`}
                  >
                    <span>{topicConfig.emoji}</span>
                    {topic}
                  </span>
                );
              })}
              {video.topics.length > 2 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
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

// Helper function to check if video is new (within 7 days)
function isNewVideo(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}
