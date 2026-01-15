import { Story } from '@/types';
import { supabase } from '@/services/supabase';

// ===========================================
// STORY DATA SERVICE - SUPABASE BACKEND
// ===========================================
// Tất cả truyện được lưu trữ trong Supabase
// Có fallback về localStorage nếu không có Supabase

const STORAGE_KEY = 'comic-lingua.stories';
let cachedStories: Story[] = [];
let lastCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let syncPromise: Promise<void> | null = null;

// Helper: Check if we're on the client
function isClient(): boolean {
  return typeof window !== 'undefined';
}

// Helper: Get from localStorage (client-side only)
function getFromLocalStorage(): Story[] {
  if (!isClient()) return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper: Save to localStorage (client-side only)
function saveToLocalStorage(stories: Story[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// Get all stories from Supabase (or localStorage as fallback)
export async function getAllStories(): Promise<Story[]> {
  // Check cache validity
  const now = Date.now();
  if (cachedStories.length > 0 && (now - lastCacheTime) < CACHE_TTL) {
    return cachedStories;
  }

  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*');
    
    if (error) throw error;
    
    cachedStories = data || [];
    lastCacheTime = now;
    
    // Sync to localStorage for offline access
    saveToLocalStorage(cachedStories);
    
    return cachedStories;
  } catch (err) {
    console.warn('Supabase fetch failed, using localStorage:', err);
    // Fallback to localStorage
    const localStories = getFromLocalStorage();
    if (localStories.length > 0) {
      cachedStories = localStories;
      lastCacheTime = now;
      return localStories;
    }
    return [];
  }
}

// Get all stories synchronously from cache (safe for server-side)
export function getAllStoriesSync(): Story[] {
  // On server, return cache only (no localStorage access)
  if (!isClient()) {
    return cachedStories;
  }
  
  // On client, use cache if valid, otherwise try localStorage
  const now = Date.now();
  if (cachedStories.length > 0 && (now - lastCacheTime) < CACHE_TTL) {
    return cachedStories;
  }
  
  // Try localStorage as fallback
  const localStories = getFromLocalStorage();
  if (localStories.length > 0) {
    cachedStories = localStories;
    lastCacheTime = now;
  }
  
  return cachedStories;
}

// Save all stories to Supabase
async function saveAllStoriesToSupabase(stories: Story[]): Promise<void> {
  // Prevent concurrent syncs using promise queue
  if (syncPromise) {
    await syncPromise;
  }
  
  syncPromise = (async () => {
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
      lastCacheTime = Date.now();
    } catch (err) {
      console.error('❌ Failed to save stories to Supabase:', err);
      console.log('💾 Fallback: saving to localStorage instead');
      // Fallback: save to localStorage
      saveToLocalStorage(stories);
      console.log('✅ Saved to localStorage:', stories.length, 'stories');
      throw err; // Re-throw to indicate failure
    } finally {
      syncPromise = null;
    }
  })();
  
  await syncPromise;
}

// Save all stories (local + remote)
export async function saveAllStories(stories: Story[]): Promise<void> {
  // Always save to localStorage first (instant, works offline)
  saveToLocalStorage(stories);
  
  // Update cache immediately
  cachedStories = stories;
  lastCacheTime = Date.now();
  
  // Try to sync to Supabase in background
  try {
    await saveAllStoriesToSupabase(stories);
  } catch (err) {
    // Already logged in saveAllStoriesToSupabase
    // Continue - localStorage save succeeded
  }
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
