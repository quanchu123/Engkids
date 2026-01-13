import { Story } from '@/types';
import { supabase } from '@/services/supabase';

// ===========================================
// STORY DATA SERVICE - SUPABASE BACKEND
// ===========================================
// Tất cả truyện được lưu trữ trong Supabase
// Có fallback về localStorage nếu không có Supabase

const STORAGE_KEY = 'comic-lingua.stories';
let cachedStories: Story[] = [];
let isSyncing = false;

// Get all stories from Supabase (or localStorage as fallback)
export async function getAllStories(): Promise<Story[]> {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*');
    
    if (error) throw error;
    
    cachedStories = data || [];
    return cachedStories;
  } catch (err) {
    console.warn('Supabase fetch failed, using localStorage:', err);
    // Fallback to localStorage
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Get all stories synchronously from cache (for server-side)
export function getAllStoriesSync(): Story[] {
  if (typeof window === 'undefined') {
    // Server side - try localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  return cachedStories;
}

// Save all stories to Supabase
async function saveAllStoriesToSupabase(stories: Story[]): Promise<void> {
  if (isSyncing) return;
  
  isSyncing = true;
  try {
    console.log('💾 Saving to Supabase...', stories.length, 'stories');
    
    // Delete all existing stories
    await supabase.from('stories').delete().neq('id', '');
    
    // Insert new stories
    if (stories.length > 0) {
      const { error } = await supabase
        .from('stories')
        .insert(stories);
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      console.log('✅ Saved to Supabase successfully!');
    }
    
    cachedStories = stories;
  } catch (err) {
    console.error('❌ Failed to save stories to Supabase:', err);
    console.log('💾 Fallback: saving to localStorage instead');
    // Fallback: save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
      console.log('✅ Saved to localStorage:', stories.length, 'stories');
    }
  } finally {
    isSyncing = false;
  }
}

// Save all stories (local + remote)
export async function saveAllStories(stories: Story[]): Promise<void> {
  // Always save to localStorage as backup
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }
  
  // Try to save to Supabase
  await saveAllStoriesToSupabase(stories);
}

// Get single story by ID
export function getStoryById(id: string): Story | undefined {
  return getAllStoriesSync().find(story => story.id === id);
}

// Clear cache to force fresh data fetch
export function clearStoriesCache(): void {
  cachedStories = [];
}

// Add new story
export async function addStory(story: Story): Promise<void> {
  const stories = getAllStoriesSync();
  stories.push(story);
  await saveAllStories(stories);
  clearStoriesCache(); // Clear cache after add
}

// Update existing story
export async function updateStory(id: string, updatedStory: Story): Promise<void> {
  const stories = getAllStoriesSync();
  const index = stories.findIndex(s => s.id === id);
  if (index !== -1) {
    stories[index] = updatedStory;
    await saveAllStories(stories);
    clearStoriesCache(); // Clear cache after update
  }
}

// Delete story
export async function deleteStory(id: string): Promise<void> {
  const stories = getAllStoriesSync().filter(s => s.id !== id);
  await saveAllStories(stories);
  clearStoriesCache(); // Clear cache after delete
}

// Filter by level
export function getStoriesByLevel(level: Story['level']): Story[] {
  return getAllStoriesSync().filter(story => story.level === level);
}

// Filter by topic
export function getStoriesByTopic(topic: string): Story[] {
  return getAllStoriesSync().filter(story => 
    story.topics.some(t => t.toLowerCase() === topic.toLowerCase())
  );
}

// Get all unique topics
export function getAllTopics(): string[] {
  const topics = new Set<string>();
  getAllStoriesSync().forEach(story => {
    story.topics.forEach(topic => topics.add(topic));
  });
  return Array.from(topics).sort();
}

// Search stories
export function searchStories(query: string): Story[] {
  const allStories = getAllStoriesSync();
  const q = query.toLowerCase().trim();
  if (!q) return allStories;
  
  return allStories.filter(story =>
    story.title_en.toLowerCase().includes(q) ||
    story.title_vi.toLowerCase().includes(q) ||
    story.topics.some(t => t.toLowerCase().includes(q))
  );
}

// Get story count
export function getStoryCount(): number {
  return getAllStoriesSync().length;
}

// Check if any stories exist
export function hasStories(): boolean {
  return getAllStoriesSync().length > 0;
}
