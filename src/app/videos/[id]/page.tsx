import { notFound } from 'next/navigation';
import VideoDetailPageClient from '@/components/video/VideoDetailPageClient';
import PremiumStoryLock from '@/components/story/PremiumStoryLock';
import { getAllVideos, getVideoById } from '@/services/video';
import { canAccessPremiumContent } from '@/lib/server/story-access';

// Always read the live database so a deleted video no longer resolves.
export const dynamic = 'force-dynamic';

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [video, allVideos] = await Promise.all([
    getVideoById(id).catch(() => null),
    getAllVideos().catch(() => []),
  ]);

  if (!video) {
    notFound();
  }

  if (video.premium_only && !(await canAccessPremiumContent())) {
    const isMusic = video.category === 'music';
    return (
      <PremiumStoryLock
        titleEn={video.title}
        titleVi={video.titleVi || video.title}
        coverImage={video.thumbnailUrl}
        backHref={isMusic ? '/music' : '/videos'}
        backLabel={isMusic ? 'Quay lại kho nhạc' : 'Quay lại video'}
      />
    );
  }

  // Do not pass internal catalog cards that stripped playable fields for premium viewers.
  const catalog = allVideos.filter((item) => item.id !== video.id);
  return <VideoDetailPageClient video={video} allVideos={[video, ...catalog]} />;
}
