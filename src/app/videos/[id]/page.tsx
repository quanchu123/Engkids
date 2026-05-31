import { notFound } from 'next/navigation';
import VideoDetailPageClient from '@/components/video/VideoDetailPageClient';
import { getAllVideos, getVideoById } from '@/services/video';

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

  return <VideoDetailPageClient video={video} allVideos={allVideos} />;
}
