import { notFound } from 'next/navigation';
import StoryGamesClient from '@/components/story/StoryGamesClient';
import { getStory } from '@/services/story';

export default async function StoryGamesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStory(id).catch(() => null);

  if (!story) {
    notFound();
  }

  return <StoryGamesClient story={story} />;
}
