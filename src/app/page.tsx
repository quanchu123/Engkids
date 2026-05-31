import HomePageClient from '@/components/pages/HomePageClient';
import { listStories } from '@/services/story';
import { getAllVideos } from '@/services/video';

export default async function HomePage() {
  const [stories, allVideos] = await Promise.all([
    listStories().catch(() => []),
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
