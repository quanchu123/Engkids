import { notFound } from 'next/navigation';
import StoryVocabClient from '@/components/story/StoryVocabClient';
import { getStory } from '@/services/story';

export default async function StoryVocabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await getStory(id).catch(() => null);

  if (!story) {
    notFound();
  }

  return <StoryVocabClient story={story} />;
}
