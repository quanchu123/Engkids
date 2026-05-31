import VideosPageClient from '@/components/pages/VideosPageClient';
import { getOphimAnimeCatalog } from '@/services/ophim';
import { getAllVideos } from '@/services/video';

export default async function VideosPage() {
  const [videos, ophimVideos] = await Promise.all([
    getAllVideos('video').catch(() => []),
    getOphimAnimeCatalog(2).catch(() => []),
  ]);

  // Prioritize Ophim anime content, fallback to database videos
  const displayVideos = ophimVideos.length > 0 ? ophimVideos : videos;

  return <VideosPageClient videos={displayVideos} />;
}
