import { notFound } from 'next/navigation';
import StoryReaderClient from '@/components/story/StoryReaderClient';
import { getStory } from '@/services/story';

export default async function StoryReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStory(id).catch(() => null);

  if (!story) {
    notFound();
  }

  return <StoryReaderClient story={story} />;
}
