import MusicPageClient from '@/components/pages/MusicPageClient';
import { getAllVideos } from '@/services/video';

// Always read the live database so the music list reflects current videos.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MusicPage() {
  const videos = await getAllVideos('music').catch(() => []);
  return <MusicPageClient videos={videos} />;
}
