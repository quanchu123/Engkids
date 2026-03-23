// ============================================
// CENTRALIZED STORAGE SERVICE
// Handles localStorage/sessionStorage safely
// ============================================

import { STORAGE_KEYS } from './constants';

// Check if we're in browser
const isBrowser = typeof window !== 'undefined';

// ============================================
// GENERIC STORAGE FUNCTIONS
// ============================================

/**
 * Get item from localStorage with JSON parsing
 */
export function getItem<T>(key: string, defaultValue: T): T {
  if (!isBrowser) return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`[Storage] Error reading ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage with JSON stringify
 */
export function setItem<T>(key: string, value: T): boolean {
  if (!isBrowser) return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Storage] Error writing ${key}:`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 */
export function removeItem(key: string): boolean {
  if (!isBrowser) return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Error removing ${key}:`, error);
    return false;
  }
}

/**
 * Clear all localStorage
 */
export function clearAll(): boolean {
  if (!isBrowser) return false;
  
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('[Storage] Error clearing storage:', error);
    return false;
  }
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================

export const adminAuth = {
  isAuthenticated(): boolean {
    return getItem<boolean>(STORAGE_KEYS.ADMIN_AUTH, false) === true;
  },

  login(): void {
    setItem(STORAGE_KEYS.ADMIN_AUTH, true);
  },

  logout(): void {
    removeItem(STORAGE_KEYS.ADMIN_AUTH);
    removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  },

  setToken(token: string): void {
    setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
  },

  getToken(): string | null {
    return getItem<string | null>(STORAGE_KEYS.ADMIN_TOKEN, null);
  },
};

// ============================================
// VIDEO PROGRESS
// ============================================

interface VideoProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  completedAt?: string;
}

export const videoProgress = {
  get(videoId: string): VideoProgress | null {
    const all = getItem<Record<string, VideoProgress>>(STORAGE_KEYS.VIDEO_PROGRESS, {});
    return all[videoId] || null;
  },

  set(progress: VideoProgress): void {
    const all = getItem<Record<string, VideoProgress>>(STORAGE_KEYS.VIDEO_PROGRESS, {});
    all[progress.videoId] = progress;
    setItem(STORAGE_KEYS.VIDEO_PROGRESS, all);
  },

  getAll(): VideoProgress[] {
    const all = getItem<Record<string, VideoProgress>>(STORAGE_KEYS.VIDEO_PROGRESS, {});
    return Object.values(all);
  },

  clear(videoId?: string): void {
    if (videoId) {
      const all = getItem<Record<string, VideoProgress>>(STORAGE_KEYS.VIDEO_PROGRESS, {});
      delete all[videoId];
      setItem(STORAGE_KEYS.VIDEO_PROGRESS, all);
    } else {
      removeItem(STORAGE_KEYS.VIDEO_PROGRESS);
    }
  },
};

// ============================================
// USER PREFERENCES
// ============================================

interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: 'en' | 'vi';
  subtitlesEnabled?: boolean;
  playbackSpeed?: number;
  autoplay?: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'vi',
  subtitlesEnabled: true,
  playbackSpeed: 1,
  autoplay: true,
};

export const userPreferences = {
  get(): UserPreferences {
    return getItem(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
  },

  set(prefs: Partial<UserPreferences>): void {
    const current = this.get();
    setItem(STORAGE_KEYS.USER_PREFERENCES, { ...current, ...prefs });
  },

  reset(): void {
    setItem(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
  },
};

// ============================================
// LAST WATCHED
// ============================================

interface LastWatched {
  videoId: string;
  title: string;
  timestamp: string;
  progress: number; // percentage 0-100
}

export const lastWatched = {
  get(): LastWatched | null {
    return getItem<LastWatched | null>(STORAGE_KEYS.LAST_WATCHED, null);
  },

  set(video: Omit<LastWatched, 'timestamp'>): void {
    setItem(STORAGE_KEYS.LAST_WATCHED, {
      ...video,
      timestamp: new Date().toISOString(),
    });
  },

  clear(): void {
    removeItem(STORAGE_KEYS.LAST_WATCHED);
  },
};

// ============================================
// STORIES CACHE
// ============================================

interface CachedStories<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // ms
}

export const storiesCache = {
  get<T>(defaultValue: T): T | null {
    const cached = getItem<CachedStories<T> | null>(STORAGE_KEYS.STORIES_CACHE, null);
    
    if (!cached) return null;
    
    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > cached.expiresIn) {
      this.clear();
      return null;
    }
    
    return cached.data;
  },

  set<T>(data: T, expiresIn: number = 5 * 60 * 1000): void { // default 5 minutes
    setItem(STORAGE_KEYS.STORIES_CACHE, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  },

  clear(): void {
    removeItem(STORAGE_KEYS.STORIES_CACHE);
  },
};

// ============================================
// EXPORT ALL
// ============================================
export const storage = {
  // Generic
  getItem,
  setItem,
  removeItem,
  clearAll,
  
  // Specific
  adminAuth,
  videoProgress,
  userPreferences,
  lastWatched,
  storiesCache,
};

export default storage;
