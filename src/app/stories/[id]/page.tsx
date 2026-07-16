import { notFound } from 'next/navigation';
import StoryReaderClient from '@/components/story/StoryReaderClient';
import PremiumStoryLock from '@/components/story/PremiumStoryLock';
import { getStory } from '@/services/story';
import { canAccessPremiumStories } from '@/lib/server/story-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  if (story.premium_only) {
    const allowed = await canAccessPremiumStories();
    if (!allowed) {
      return (
        <PremiumStoryLock
          titleEn={story.title_en}
          titleVi={story.title_vi}
          coverImage={story.cover_image}
        />
      );
    }
  }

  return <StoryReaderClient story={story} />;
}
