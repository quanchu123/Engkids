'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Video } from '@/types';
import VideoLearningPlayer from '@/components/video/VideoLearningPlayer';
import VideoRecommendations from '@/components/video/VideoRecommendations';
import Link from 'next/link';

// Topic styling
const TOPIC_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  'Animals': { bg: 'bg-orange-100', text: 'text-orange-700', emoji: '🐾' },
  'Food': { bg: 'bg-pink-100', text: 'text-pink-700', emoji: '🍕' },
  'Nature': { bg: 'bg-green-100', text: 'text-green-700', emoji: '🌿' },
  'Family': { bg: 'bg-pink-100', text: 'text-pink-700', emoji: '👨‍👩‍👧' },
  'School': { bg: 'bg-blue-100', text: 'text-blue-700', emoji: '📚' },
  'Adventure': { bg: 'bg-purple-100', text: 'text-purple-700', emoji: '🚀' },
  'Friendship': { bg: 'bg-pink-100', text: 'text-pink-700', emoji: '💕' },
  'Science': { bg: 'bg-blue-100', text: 'text-blue-700', emoji: '🔬' },
  'Daily Life': { bg: 'bg-orange-100', text: 'text-orange-700', emoji: '☀️' },
  'History': { bg: 'bg-yellow-100', text: 'text-yellow-700', emoji: '🏛️' },
};

const LEVEL_EMOJI: Record<string, string> = {
  'Beginner': '🌱',
  'Elementary': '🌿',
  'Intermediate': '🌳',
};

const AGE_EMOJI: Record<string, string> = {
  '3-5': '👶',
  '6-8': '🧒',
  '9-12': '🧑',
};

export default function VideoPage() {
  const params = useParams();
  const videoId = params.id as string;
  
  const [video, setVideo] = useState<Video | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideo();
    loadAllVideos();
  }, [videoId]);

  const loadVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      const data = await response.json();
      setVideo(data.video);
    } catch (error) {
      console.error('Failed to load video:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();
      setAllVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-kid-purple border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl shadow-kid">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Không tìm thấy video</h2>
          <p className="text-gray-600 mb-4">Video này không tồn tại hoặc đã bị xóa.</p>
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-kid-purple text-white rounded-xl font-bold hover:bg-kid-purple/90 transition-colors"
          >
            <span>📺</span>
            <span>Xem video khác</span>
          </Link>
        </div>
      </div>
    );
  }

  if (video.status !== 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl shadow-kid max-w-md mx-4">
          <div className="text-6xl mb-4 animate-bounce-slow">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Video đang được xử lý</h2>
          <p className="text-gray-600 mb-4">Video này đang được chuẩn bị. Quay lại sau nhé!</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            video.status === 'processing' ? 'bg-blue-100 text-blue-700' :
            video.status === 'error' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            <span className="animate-pulse">●</span>
            <span>
              {video.status === 'processing' ? 'Đang xử lý' :
               video.status === 'error' ? 'Có lỗi xảy ra' :
               video.status === 'uploading' ? 'Đang tải lên' : video.status}
            </span>
          </div>
          <div className="mt-6">
            <Link
              href="/videos"
              className="text-kid-purple font-medium hover:underline"
            >
              ← Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 py-4 pb-12">
      <div className="max-w-7xl mx-auto px-3 md:px-6">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 text-kid-purple hover:text-kid-purple/80 font-bold text-sm mb-3 transition-colors"
          >
            <span>←</span>
            <span>Quay lại</span>
          </Link>
          
          {/* Title Card */}
          <div className="bg-white rounded-2xl shadow-kid p-4 md:p-6 mb-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{video.title}</h1>
            <p className="text-base md:text-lg text-gray-600 mb-4">{video.titleVi}</p>
            
            {/* Meta Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Level Badge */}
              <span className={`
                inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold
                ${video.level === 'Beginner' ? 'bg-green-100 text-green-700' :
                  video.level === 'Elementary' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'}
              `}>
                <span>{LEVEL_EMOJI[video.level] || '📚'}</span>
                <span>
                  {video.level === 'Beginner' ? 'Mới bắt đầu' :
                   video.level === 'Elementary' ? 'Cơ bản' : 'Trung cấp'}
                </span>
              </span>
              
              {/* Age Badge */}
              {video.ageGroup && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-bold">
                  <span>{AGE_EMOJI[video.ageGroup] || '🧒'}</span>
                  <span>{video.ageGroup} tuổi</span>
                </span>
              )}

              {/* Duration */}
              {video.duration > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  <span>⏱️</span>
                  <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                </span>
              )}

              {/* Subtitles count */}
              {video.subtitles.length > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  <span>💬</span>
                  <span>{video.subtitles.length} phụ đề</span>
                </span>
              )}
            </div>

            {/* Topic Tags */}
            {video.topics && video.topics.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {video.topics.map(topic => {
                    const style = TOPIC_COLORS[topic] || { bg: 'bg-gray-100', text: 'text-gray-700', emoji: '🏷️' };
                    return (
                      <Link
                        key={topic}
                        href={`/videos?topic=${encodeURIComponent(topic)}`}
                        className={`
                          inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium
                          ${style.bg} ${style.text} hover:opacity-80 transition-opacity
                        `}
                      >
                        <span>{style.emoji}</span>
                        <span>{topic}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {video.description && (
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">
                {video.description}
              </p>
            )}
          </div>
        </div>

        {/* Learning Tip */}
        <div className="mb-4 bg-gradient-to-r from-kid-purple to-kid-pink text-white p-4 rounded-2xl shadow-kid">
          <div className="flex items-center gap-3">
            <div className="text-3xl animate-float">💡</div>
            <div>
              <div className="font-bold text-base mb-0.5">Mẹo học hay!</div>
              <div className="text-sm opacity-90">
                Bấm vào từ tiếng Anh trong phụ đề để xem nghĩa và nghe phát âm!
              </div>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="mb-8">
          <VideoLearningPlayer video={video} />
        </div>

        {/* Recommendations */}
        {allVideos.length > 1 && (
          <div className="mt-8">
            <VideoRecommendations
              currentVideo={video}
              allVideos={allVideos}
              maxVideos={6}
            />
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="mt-8 text-center">
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-kid-purple rounded-2xl font-bold shadow-kid hover:shadow-kid-hover transition-all"
          >
            <span>📺</span>
            <span>Xem thêm video khác</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
