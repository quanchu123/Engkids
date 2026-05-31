import { notFound } from 'next/navigation';
import VideoDetailPageClient from '@/components/video/VideoDetailPageClient';
import { getOphimAnimeById, getOphimAnimeCatalog, isOphimVideoId } from '@/services/ophim';
import { getAllVideos, getVideoById } from '@/services/video';

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isOphimItem = isOphimVideoId(id);

  const [video, allVideos] = await Promise.all([
    isOphimItem ? getOphimAnimeById(id).catch(() => null) : getVideoById(id).catch(() => null),
    isOphimItem ? getOphimAnimeCatalog(2).catch(() => []) : getAllVideos().catch(() => []),
  ]);

  if (!video) {
    notFound();
  }

  return <VideoDetailPageClient video={video} allVideos={allVideos} />;
}
