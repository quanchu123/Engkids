import StoriesPageClient from '@/components/pages/StoriesPageClient';
import { listStories } from '@/services/story';

// Always render from the live database so newly published stories appear.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StoriesPage() {
  const stories = await listStories().catch(() => []);
  return <StoriesPageClient stories={stories} />;
}
