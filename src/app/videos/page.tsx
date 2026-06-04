import VideosPageClient from '@/components/pages/VideosPageClient';

// Always read the live database so the catalog reflects current videos.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VideosPage() {
  return <VideosPageClient />;
}
