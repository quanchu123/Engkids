'use client';

import Link from 'next/link';
import { Video } from '@/types';
import LocalVideoPlayer from '@/components/video/LocalVideoPlayer';
import VideoRecommendations from '@/components/video/VideoRecommendations';

const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  Animals: { bg: 'bg-orange-100', text: 'text-orange-700' },
  Food: { bg: 'bg-pink-100', text: 'text-pink-700' },
  Nature: { bg: 'bg-green-100', text: 'text-green-700' },
  Family: { bg: 'bg-pink-100', text: 'text-pink-700' },
  School: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Adventure: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Friendship: { bg: 'bg-pink-100', text: 'text-pink-700' },
  Science: { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Daily Life': { bg: 'bg-orange-100', text: 'text-orange-700' },
  History: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

interface VideoDetailPageClientProps {
  video: Video;
  allVideos: Video[];
}

export default function VideoDetailPageClient({ video, allVideos }: VideoDetailPageClientProps) {
  const listHref = video.category === 'music' ? '/music' : '/videos';
  const listLabel = video.category === 'music' ? 'Quay lại kho nhạc' : 'Quay lại video';
  const playable = Boolean(video.videoUrl || video.objectKey);

  if (video.status !== 'ready') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 px-4">
        <div className="toy-panel max-w-md p-8 text-center" data-testid="video-processing-state">
          <h2 className="text-2xl font-black text-slate-900">Nội dung đang được chuẩn bị</h2>
          <p className="mt-2 text-slate-600">Hãy quay lại sau nhé.</p>
          <Link href={listHref} className="mt-5 inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
            {listLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-pink-50 to-blue-50 py-4 pb-12" data-testid="video-detail-page">
      <div className="mx-auto max-w-7xl px-4">
        <Link href={listHref} className="kid-chip mb-4 inline-flex px-4 py-2 text-sm font-bold text-violet-600">
          {listLabel}
        </Link>

        <div className="soft-feature mb-6 rounded-[2rem] p-6 text-white">
          <h1 className="text-2xl font-black text-white">{video.title}</h1>
          <p className="mt-1 text-lg text-white/85">{video.titleVi}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="kid-chip px-3 py-1 text-sm font-bold text-emerald-700">{video.level}</span>
            {video.premium_only && (
              <span className="kid-chip px-3 py-1 text-sm font-bold text-amber-700">Premium</span>
            )}
            {video.ageGroup && (
              <span className="kid-chip px-3 py-1 text-sm font-bold text-amber-700">{video.ageGroup} tuổi</span>
            )}
            {video.duration > 0 && (
              <span className="kid-chip px-3 py-1 text-sm font-bold text-slate-700">
                {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          {video.topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {video.topics.map((topic) => {
                const style = TOPIC_COLORS[topic] || { bg: 'bg-slate-100', text: 'text-slate-700' };
                return (
                  <Link
                    key={topic}
                    href={`${listHref}?topic=${encodeURIComponent(topic)}`}
                    className={`kid-chip px-3 py-1 text-sm font-medium ${style.bg} ${style.text}`}
                  >
                    {topic}
                  </Link>
                );
              })}
            </div>
          )}

          {video.description && !/object_key|placeholder|upload sau/i.test(video.description) && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/88">{video.description}</p>
          )}
        </div>

        {playable ? (
          <>
            <div className="soft-panel mb-8 rounded-[2rem] p-4 text-slate-700">
              <div className="font-black text-violet-700">Mẹo học hay</div>
              <p className="text-sm text-slate-600">
                Bấm vào từ trong phụ đề để xem nghĩa và lưu vào kho từ vựng.
              </p>
            </div>
            <LocalVideoPlayer video={video} />
          </>
        ) : (
          <div
            className="soft-panel relative mb-8 overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-0 shadow-sm"
            data-testid="video-coming-soon"
          >
            <div className="relative aspect-video w-full bg-slate-100">
              {video.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">🎵</div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 px-6 text-center">
                <p className="text-2xl font-black text-white drop-shadow">Sắp ra mắt</p>
                <p className="mt-2 max-w-md text-sm font-semibold text-white/90">
                  Nội dung đang được chuẩn bị. Quay lại sau để xem nhé!
                </p>
              </div>
            </div>
          </div>
        )}

        {allVideos.length > 1 && (
          <div className="mt-8">
            <VideoRecommendations currentVideo={video} allVideos={allVideos} maxVideos={6} />
          </div>
        )}
      </div>
    </div>
  );
}
