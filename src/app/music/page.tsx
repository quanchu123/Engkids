import MusicPageClient from '@/components/pages/MusicPageClient';
import { getAllVideos } from '@/services/video';

export default async function MusicPage() {
  const videos = await getAllVideos('music').catch(() => []);
  return <MusicPageClient videos={videos} />;
}
