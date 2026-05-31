import VideosPageClient from '@/components/pages/VideosPageClient';
import { getAllVideos } from '@/services/video';

export default async function VideosPage() {
  const videos = await getAllVideos('video').catch(() => []);
  return <VideosPageClient videos={videos} />;
}
