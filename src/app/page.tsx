import HomePageClient from '@/components/pages/HomePageClient';
import { listStorySummaries } from '@/services/story';
import { getAllVideos } from '@/services/video';

// Always render from the live database (no static caching), so newly added or
// removed videos/stories show up immediately.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function HomePage() {
  const [stories, allVideos] = await Promise.all([
    listStorySummaries().catch(() => []),
    getAllVideos().catch(() => []),
  ]);

  return (
    <HomePageClient
      stories={stories}
      videos={allVideos.filter((video) => video.category === 'video')}
      musicVideos={allVideos.filter((video) => video.category === 'music')}
    />
  );
}
