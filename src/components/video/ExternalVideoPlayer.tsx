'use client';

import { Video } from '@/types';
import VideoQuizPanel from '@/components/video/VideoQuizPanel';
import { useAppStore } from '@/store/useAppStore';
import { useCallback } from 'react';

interface ExternalVideoPlayerProps {
  video: Video;
}

export default function ExternalVideoPlayer({ video }: ExternalVideoPlayerProps) {
  const hasYoutubeTrailer = video.sourceType === 'youtube' && Boolean(video.youtubeVideoId);
  const isOphimEmbed = video.externalUrl?.includes('ophim69.com');
  const externalLinks = video.externalLinks || [];
  const hasQuiz = Boolean(video.quiz && video.quiz.length > 0);

  const { applyGameResult } = useAppStore();

  const handleQuizComplete = useCallback(
    (correctCount: number, totalCount: number) => {
      if (totalCount === 0) return;
      applyGameResult({
        gameType: 'multiple_choice',
        storyId: `video:${video.id}`,
        score: correctCount,
        totalQuestions: totalCount,
        rewards: { stars: correctCount },
      });
    },
    [applyGameResult, video.id],
  );

  const playerBlock = (
    <>
      {hasYoutubeTrailer ? (
        <div className="toy-panel overflow-hidden rounded-[2rem] bg-slate-950 p-3">
          <div className="aspect-video overflow-hidden rounded-[1.5rem]">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      ) : isOphimEmbed ? (
        <div className="toy-panel overflow-hidden rounded-[2rem] bg-slate-950 p-3">
          <div className="aspect-video overflow-hidden rounded-[1.5rem]">
            <iframe
              src={video.externalUrl}
              title={video.title}
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
          <div className="mt-3 px-2 pb-2">
            <p className="text-xs text-slate-400">
              ⚠️ Video được phát từ Ophim69. Nếu không phát được, hãy mở trực tiếp trên trang chủ.
            </p>
          </div>
        </div>
      ) : (
        <div className="toy-panel rounded-[2rem] p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-black text-white">
            LINK
          </div>
          <h3 className="text-xl font-black text-slate-900">Nguồn phát từ Ophim69</h3>
          <p className="mt-2 text-sm text-slate-600">
            Chọn tập từ danh sách bên dưới để xem. Video được phát trực tiếp từ nguồn.
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* When the video has quiz questions, show video on the left and quiz on the right. */}
      {hasQuiz ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">{playerBlock}</div>
          <div className="lg:col-span-1">
            <VideoQuizPanel questions={video.quiz!} onComplete={handleQuizComplete} />
          </div>
        </div>
      ) : (
        playerBlock
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="soft-panel rounded-[2rem] p-5">
          <h3 className="text-lg font-black text-slate-900">Nguồn video</h3>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu anime lấy từ Ophim69. Video được phát từ nền tảng gốc.
          </p>

          <div className="mt-4 grid gap-3">
            {externalLinks.length > 0 ? (
              externalLinks.map((link) => (
                <a
                  key={`${link.site}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="toy-surface flex items-center justify-between rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <div className="font-black text-slate-900">{link.title}</div>
                    <div className="truncate text-sm text-slate-500">{link.site}</div>
                  </div>
                  <span className="kid-chip px-3 py-2 text-xs font-black text-violet-700">Mở link</span>
                </a>
              ))
            ) : video.externalUrl ? (
              <a
                href={video.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="toy-surface flex items-center justify-between rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="font-black text-slate-900">{video.sourceLabel || 'External source'}</div>
                  <div className="text-sm text-slate-500">Mở trang nguồn</div>
                </div>
                <span className="kid-chip px-3 py-2 text-xs font-black text-violet-700">Mở link</span>
              </a>
            ) : (
              <div className="toy-surface rounded-2xl p-4 text-sm text-slate-500">
                Anime này hiện chưa có link phát từ Ophim69.
              </div>
            )}
          </div>
        </div>

        <div className="soft-panel rounded-[2rem] p-5">
          <h3 className="text-lg font-black text-slate-900">Ghi chú</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <p>Player này nhúng video từ Ophim69 qua iframe hoặc mở link tới nền tảng gốc.</p>
            <p>Phần subtitle song ngữ riêng vẫn có thể được thêm sau bằng cách lưu cue trong database của app.</p>
            <p>Nếu cần trải nghiệm học tập sâu hơn, bước kế tiếp nên là map subtitle riêng cho từng anime.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
