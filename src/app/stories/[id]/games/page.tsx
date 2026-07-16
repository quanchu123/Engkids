import { notFound } from 'next/navigation';
import StoryGamesClient from '@/components/story/StoryGamesClient';
import PremiumStoryLock from '@/components/story/PremiumStoryLock';
import { getStory } from '@/services/story';
import { canAccessPremiumStories } from '@/lib/server/story-access';

export const dynamic = 'force-dynamic';

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

  if (story.premium_only && !(await canAccessPremiumStories())) {
    return (
      <PremiumStoryLock
        titleEn={story.title_en}
        titleVi={story.title_vi}
        coverImage={story.cover_image}
      />
    );
  }

  return <StoryGamesClient story={story} />;
}
