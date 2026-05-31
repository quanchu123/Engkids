import { Story, Video } from '@/types';

export function getStoryTopics(stories: Story[]): string[] {
  const topics = new Set<string>();
  stories.forEach((story) => {
    story.topics.forEach((topic) => topics.add(topic));
  });
  return Array.from(topics).sort();
}

export function filterStories(
  stories: Story[],
  searchQuery: string,
  level: string,
  topic: string,
): Story[] {
  const normalizedQuery = searchQuery.toLowerCase().trim();

  return stories.filter((story) => {
    if (normalizedQuery) {
      const matchesSearch =
        story.title_en.toLowerCase().includes(normalizedQuery) ||
        story.title_vi.toLowerCase().includes(normalizedQuery) ||
        story.topics.some((item) => item.toLowerCase().includes(normalizedQuery));

      if (!matchesSearch) {
        return false;
      }
    }

    if (level !== 'all' && story.level !== level) {
      return false;
    }

    if (topic !== 'all' && !story.topics.some((item) => item.toLowerCase() === topic.toLowerCase())) {
      return false;
    }

    return true;
  });
}

export function filterVideos(
  videos: Video[],
  filters: {
    search?: string;
    level?: string | null;
    topic?: string | null;
    ageGroup?: string | null;
  },
): Video[] {
  return videos.filter((video) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        video.title.toLowerCase().includes(searchLower) ||
        video.titleVi.toLowerCase().includes(searchLower) ||
        video.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.level && video.level !== filters.level) return false;
    if (filters.topic && !video.topics?.includes(filters.topic)) return false;
    if (filters.ageGroup && video.ageGroup !== filters.ageGroup) return false;

    return true;
  });
}

export function groupVideosByLevel(videos: Video[]) {
  return {
    beginner: videos.filter((video) => video.level === 'Beginner'),
    elementary: videos.filter((video) => video.level === 'Elementary'),
    intermediate: videos.filter((video) => video.level === 'Intermediate'),
  };
}
