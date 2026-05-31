import StoriesPageClient from '@/components/pages/StoriesPageClient';
import { listStories } from '@/services/story';

export default async function StoriesPage() {
  const stories = await listStories().catch(() => []);
  return <StoriesPageClient stories={stories} />;
}
