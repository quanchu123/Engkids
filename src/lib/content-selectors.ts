import { Story, Video } from '@/types';
import { getStageIndex, normalizeStageId, stageForStoryLevel, type CurriculumStageId } from './curriculum';

function resolveStoryStage(story: Story): CurriculumStageId {
  return normalizeStageId(story.curriculum_stage_id) || stageForStoryLevel(story.level);
}

function resolveVideoStage(video: Video): CurriculumStageId {
  const curriculumStage = normalizeStageId(video.curriculum_stage_id);
  if (curriculumStage) return curriculumStage;
  return stageForStoryLevel(video.level);
}

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
  const selectedStage = normalizeStageId(level) || (level === 'all' ? undefined : stageForStoryLevel(level));
  const selectedIndex = selectedStage ? getStageIndex(selectedStage) : -1;

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

    if (selectedStage) {
      const storyStage = resolveStoryStage(story);
      if (getStageIndex(storyStage) > selectedIndex) {
        return false;
      }
    } else if (level !== 'all' && story.level !== level) {
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
  const selectedStage = normalizeStageId(filters.level || undefined) || (filters.level ? stageForStoryLevel(filters.level) : undefined);
  const selectedIndex = selectedStage ? getStageIndex(selectedStage) : -1;

  return videos.filter((video) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        video.title.toLowerCase().includes(searchLower) ||
        video.titleVi.toLowerCase().includes(searchLower) ||
        video.description?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filters.level) {
      if (selectedStage) {
        const videoStage = resolveVideoStage(video);
        if (getStageIndex(videoStage) > selectedIndex) return false;
      } else if (video.level !== filters.level) return false;
    }
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

// Group videos by their feature label. Videos without a feature fall under the
// provided default label (e.g. "Tổng Hợp"). Returns an ordered list of groups,
// with the default group placed last.
export function groupVideosByFeature(
  videos: Video[],
  defaultLabel: string,
): Array<{ feature: string; videos: Video[] }> {
  const groups = new Map<string, Video[]>();

  for (const video of videos) {
    const key = video.feature?.trim() || defaultLabel;
    const existing = groups.get(key);
    if (existing) existing.push(video);
    else groups.set(key, [video]);
  }

  const entries = Array.from(groups.entries())
    .map(([feature, items]) => ({ feature, videos: items }));

  // Named features first (alphabetical), default group last.
  entries.sort((a, b) => {
    if (a.feature === defaultLabel) return 1;
    if (b.feature === defaultLabel) return -1;
    return a.feature.localeCompare(b.feature);
  });

  return entries;
}

