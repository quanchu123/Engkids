import VideosPageClient from '@/components/pages/VideosPageClient';
import { getAllVideos } from '@/services/video';

// Always read the live database so the catalog reflects current videos.
export const dynamic = 'force-dynamic';

export default async function VideosPage() {
  const videos = await getAllVideos('video').catch(() => []);
  return <VideosPageClient videos={videos} />;
}
