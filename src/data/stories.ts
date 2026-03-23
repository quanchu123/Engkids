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

// Save all stories to Supabase using upsert (safer than delete+insert)
async function saveAllStoriesToSupabase(stories: Story[]): Promise<void> {
  // Prevent concurrent syncs using promise queue
  if (syncPromise) {
    await syncPromise;
  }
  
  syncPromise = (async () => {
    try {
      if (stories.length > 0) {
        // Use upsert to safely add/update stories without deleting existing ones
        const { error } = await supabase
          .from('stories')
          .upsert(stories, { onConflict: 'id' });
        
        if (error) {
          console.error('❌ Supabase upsert error:', error);
          throw error;
        }
        
        // NOTE: Removed automatic deletion of "old" stories
        // This was dangerous - it would delete other users' stories!
        // If cleanup is needed, do it manually in admin panel
      }
      
      cachedStories = stories;
      lastCacheTime = Date.now();
    } catch (err) {
      console.error('❌ Failed to save stories to Supabase:', err);
      // Fallback: save to localStorage
      saveToLocalStorage(stories);
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
  
  // Sync to Supabase - throw error if fails so caller knows
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
  // IMPORTANT: Fetch all existing stories first to prevent data loss
  const existingStories = await getAllStories();
  
  // Check if story already exists
  const existingIndex = existingStories.findIndex(s => s.id === story.id);
  if (existingIndex !== -1) {
    existingStories[existingIndex] = story;
  } else {
    existingStories.push(story);
  }
  
  await saveAllStories(existingStories);
  clearStoriesCache(); // Clear cache after add
}

// Update existing story
export async function updateStory(id: string, updatedStory: Story): Promise<void> {
  // IMPORTANT: Fetch all existing stories first to prevent data loss
  const stories = await getAllStories();
  const index = stories.findIndex(s => s.id === id);
  if (index !== -1) {
    stories[index] = updatedStory;
    await saveAllStories(stories);
    clearStoriesCache(); // Clear cache after update
  } else {
    console.warn('Story not found for update:', id);
  }
}

// Delete story - xóa trực tiếp từ Supabase
export async function deleteStory(id: string): Promise<void> {
  try {
    // Xóa trực tiếp từ Supabase
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ Failed to delete story:', error);
      throw error;
    }

    // Clear cache to force refresh
    clearStoriesCache();
    
    // Also remove from localStorage
    if (isClient()) {
      const localStories = getFromLocalStorage();
      const filtered = localStories.filter(s => s.id !== id);
      saveToLocalStorage(filtered);
    }
  } catch (err) {
    console.error('❌ Delete story error:', err);
    throw err;
  }
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
