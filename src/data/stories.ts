import { Story } from '@/types';
import { storyApi } from '@/services/api';

let cachedStories: Story[] = [];
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function setStoriesCache(stories: Story[]): Story[] {
  cachedStories = stories;
  lastCacheTime = Date.now();
  return stories;
}

function isCacheFresh(): boolean {
  return cachedStories.length > 0 && (Date.now() - lastCacheTime) < CACHE_TTL;
}

export async function getAllStories(): Promise<Story[]> {
  if (isCacheFresh()) {
    return cachedStories;
  }

  const { stories } = await storyApi.list();
  return setStoriesCache(stories);
}

export function getAllStoriesSync(): Story[] {
  return isCacheFresh() ? cachedStories : [];
}

export function getStoryById(id: string): Story | undefined {
  return cachedStories.find((story) => story.id === id);
}

export async function getStoryByIdAsync(id: string): Promise<Story | undefined> {
  const cachedStory = getStoryById(id);
  if (cachedStory) {
    return cachedStory;
  }

  const { story } = await storyApi.get(id);
  if (!story) {
    return undefined;
  }

  const withoutCurrent = cachedStories.filter((item) => item.id !== story.id);
  setStoriesCache([...withoutCurrent, story]);
  return story;
}

export function clearStoriesCache(): void {
  cachedStories = [];
  lastCacheTime = 0;
}

export async function addStory(story: Story): Promise<void> {
  const created = await storyApi.create(story);
  setStoriesCache([created.story, ...cachedStories.filter((item) => item.id !== created.story.id)]);
}

export async function updateStory(id: string, updatedStory: Story): Promise<void> {
  const updated = await storyApi.update(id, updatedStory);
  setStoriesCache(cachedStories.map((story) => (story.id === id ? updated.story : story)));
}

export async function deleteStory(id: string): Promise<void> {
  await storyApi.delete(id);
  setStoriesCache(cachedStories.filter((story) => story.id !== id));
}

export function getStoriesByLevel(level: Story['level']): Story[] {
  return getAllStoriesSync().filter((story) => story.level === level);
}

export function getStoriesByTopic(topic: string): Story[] {
  return getAllStoriesSync().filter((story) =>
    story.topics.some((item) => item.toLowerCase() === topic.toLowerCase()),
  );
}

export function getAllTopics(): string[] {
  const topics = new Set<string>();
  getAllStoriesSync().forEach((story) => {
    story.topics.forEach((topic) => topics.add(topic));
  });
  return Array.from(topics).sort();
}

export function searchStories(query: string): Story[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllStoriesSync();

  return getAllStoriesSync().filter((story) =>
    story.title_en.toLowerCase().includes(q) ||
    story.title_vi.toLowerCase().includes(q) ||
    story.topics.some((topic) => topic.toLowerCase().includes(q)),
  );
}

export function getStoryCount(): number {
  return getAllStoriesSync().length;
}

export function hasStories(): boolean {
  return getStoryCount() > 0;
}
