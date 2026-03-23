/**
 * User Progress Service
 * Sync user progress to database based on device ID
 */

import { createClient } from '@supabase/supabase-js';

// Client-side Supabase
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

export interface UserProgress {
  totalStars: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  savedWords: string[];
  storiesProgress: Record<string, {
    completed: boolean;
    stars: number;
    lastPlayed: string;
  }>;
  videosProgress: Record<string, {
    watchedSeconds: number;
    completionPercent: number;
    learnedWords: string[];
    lastWatched: string;
  }>;
  gameScores: Array<{
    gameId: string;
    score: number;
    playedAt: string;
  }>;
  settings: Record<string, unknown>;
}

const DEFAULT_PROGRESS: UserProgress = {
  totalStars: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  savedWords: [],
  storiesProgress: {},
  videosProgress: {},
  gameScores: [],
  settings: {},
};

/**
 * Get or create device ID for anonymous tracking
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

/**
 * Get or create user profile
 */
export async function getOrCreateUserProfile(deviceId: string): Promise<string> {
  const supabase = getSupabase();
  
  // Try to find existing profile
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('device_id', deviceId)
    .single();
  
  if (existing) {
    return existing.id;
  }
  
  // Create new profile
  const { data: newProfile, error } = await supabase
    .from('user_profiles')
    .insert({ device_id: deviceId })
    .select('id')
    .single();
  
  if (error) {
    console.error('Failed to create user profile:', error);
    throw error;
  }
  
  // Create empty progress record
  await supabase
    .from('user_progress')
    .insert({ user_profile_id: newProfile.id })
    .single();
  
  return newProfile.id;
}

/**
 * Load user progress from database
 */
export async function loadProgress(deviceId: string): Promise<UserProgress> {
  const supabase = getSupabase();
  
  try {
    const profileId = await getOrCreateUserProfile(deviceId);
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_profile_id', profileId)
      .single();
    
    if (error || !data) {
      return DEFAULT_PROGRESS;
    }
    
    return {
      totalStars: data.total_stars || 0,
      currentStreak: data.current_streak || 0,
      longestStreak: data.longest_streak || 0,
      lastActivityDate: data.last_activity_date,
      savedWords: data.saved_words || [],
      storiesProgress: data.stories_progress || {},
      videosProgress: data.videos_progress || {},
      gameScores: data.game_scores || [],
      settings: data.settings || {},
    };
  } catch (error) {
    console.error('Failed to load progress:', error);
    return DEFAULT_PROGRESS;
  }
}

/**
 * Save user progress to database
 */
export async function saveProgress(
  deviceId: string,
  progress: Partial<UserProgress>
): Promise<void> {
  const supabase = getSupabase();
  
  try {
    const profileId = await getOrCreateUserProfile(deviceId);
    
    // Convert to database format
    const dbData: Record<string, unknown> = {};
    
    if (progress.totalStars !== undefined) dbData.total_stars = progress.totalStars;
    if (progress.currentStreak !== undefined) dbData.current_streak = progress.currentStreak;
    if (progress.longestStreak !== undefined) dbData.longest_streak = progress.longestStreak;
    if (progress.lastActivityDate !== undefined) dbData.last_activity_date = progress.lastActivityDate;
    if (progress.savedWords !== undefined) dbData.saved_words = progress.savedWords;
    if (progress.storiesProgress !== undefined) dbData.stories_progress = progress.storiesProgress;
    if (progress.videosProgress !== undefined) dbData.videos_progress = progress.videosProgress;
    if (progress.gameScores !== undefined) dbData.game_scores = progress.gameScores;
    if (progress.settings !== undefined) dbData.settings = progress.settings;
    
    const { error } = await supabase
      .from('user_progress')
      .update(dbData)
      .eq('user_profile_id', profileId);
    
    if (error) {
      console.error('Failed to save progress:', error);
    }
  } catch (error) {
    console.error('Failed to save progress:', error);
  }
}

/**
 * Add stars to user progress
 */
export async function addStars(deviceId: string, stars: number): Promise<number> {
  const supabase = getSupabase();
  
  try {
    const profileId = await getOrCreateUserProfile(deviceId);
    
    // Get current stars
    const { data } = await supabase
      .from('user_progress')
      .select('total_stars')
      .eq('user_profile_id', profileId)
      .single();
    
    const currentStars = data?.total_stars || 0;
    const newTotal = currentStars + stars;
    
    // Update
    await supabase
      .from('user_progress')
      .update({ 
        total_stars: newTotal,
        last_activity_date: new Date().toISOString().split('T')[0],
      })
      .eq('user_profile_id', profileId);
    
    return newTotal;
  } catch (error) {
    console.error('Failed to add stars:', error);
    return 0;
  }
}

/**
 * Update video progress
 */
export async function updateVideoProgress(
  deviceId: string,
  videoId: string,
  progress: {
    watchedSeconds?: number;
    completionPercent?: number;
    learnedWords?: string[];
  }
): Promise<void> {
  const supabase = getSupabase();
  
  try {
    const profileId = await getOrCreateUserProfile(deviceId);
    
    // Get current progress
    const { data } = await supabase
      .from('user_progress')
      .select('videos_progress')
      .eq('user_profile_id', profileId)
      .single();
    
    const videosProgress = data?.videos_progress || {};
    const currentVideoProgress = videosProgress[videoId] || {
      watchedSeconds: 0,
      completionPercent: 0,
      learnedWords: [],
      lastWatched: null,
    };
    
    // Merge progress
    const updatedVideoProgress = {
      ...currentVideoProgress,
      ...progress,
      lastWatched: new Date().toISOString(),
    };
    
    // If learnedWords provided, merge instead of replace
    if (progress.learnedWords) {
      updatedVideoProgress.learnedWords = [
        ...new Set([...currentVideoProgress.learnedWords, ...progress.learnedWords])
      ];
    }
    
    videosProgress[videoId] = updatedVideoProgress;
    
    await supabase
      .from('user_progress')
      .update({ 
        videos_progress: videosProgress,
        last_activity_date: new Date().toISOString().split('T')[0],
      })
      .eq('user_profile_id', profileId);
  } catch (error) {
    console.error('Failed to update video progress:', error);
  }
}

/**
 * Update story progress
 */
export async function updateStoryProgress(
  deviceId: string,
  storyId: string,
  progress: {
    completed?: boolean;
    stars?: number;
  }
): Promise<void> {
  const supabase = getSupabase();
  
  try {
    const profileId = await getOrCreateUserProfile(deviceId);
    
    // Get current progress
    const { data } = await supabase
      .from('user_progress')
      .select('stories_progress, total_stars')
      .eq('user_profile_id', profileId)
      .single();
    
    const storiesProgress = data?.stories_progress || {};
    const currentStoryProgress = storiesProgress[storyId] || {
      completed: false,
      stars: 0,
      lastPlayed: null,
    };
    
    // Calculate star difference for total
    const starsDiff = (progress.stars || 0) - currentStoryProgress.stars;
    const newTotalStars = Math.max(0, (data?.total_stars || 0) + starsDiff);
    
    storiesProgress[storyId] = {
      ...currentStoryProgress,
      ...progress,
      lastPlayed: new Date().toISOString(),
    };
    
    await supabase
      .from('user_progress')
      .update({ 
        stories_progress: storiesProgress,
        total_stars: newTotalStars,
        last_activity_date: new Date().toISOString().split('T')[0],
      })
      .eq('user_profile_id', profileId);
  } catch (error) {
    console.error('Failed to update story progress:', error);
  }
}

/**
 * Save word to vocabulary
 */
export async function saveWord(deviceId: string, word: string): Promise<void> {
  const supabase = getSupabase();
  
  try {
    const profileId = await getOrCreateUserProfile(deviceId);
    
    const { data } = await supabase
      .from('user_progress')
      .select('saved_words')
      .eq('user_profile_id', profileId)
      .single();
    
    const savedWords = data?.saved_words || [];
    if (!savedWords.includes(word)) {
      savedWords.push(word);
      
      await supabase
        .from('user_progress')
        .update({ saved_words: savedWords })
        .eq('user_profile_id', profileId);
    }
  } catch (error) {
    console.error('Failed to save word:', error);
  }
}

/**
 * Remove word from vocabulary
 */
export async function removeWord(deviceId: string, word: string): Promise<void> {
  const supabase = getSupabase();
  
  try {
    const profileId = await getOrCreateUserProfile(deviceId);
    
    const { data } = await supabase
      .from('user_progress')
      .select('saved_words')
      .eq('user_profile_id', profileId)
      .single();
    
    const savedWords = (data?.saved_words || []).filter((w: string) => w !== word);
    
    await supabase
      .from('user_progress')
      .update({ saved_words: savedWords })
      .eq('user_profile_id', profileId);
  } catch (error) {
    console.error('Failed to remove word:', error);
  }
}
