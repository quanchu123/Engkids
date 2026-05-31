// ============================================
// CENTRALIZED CONFIGURATION
// All app constants, no hardcoded values
// ============================================

// ============================================
// APP INFO
// ============================================
export const APP = {
  NAME: 'Comic Lingua Kids',
  DESCRIPTION: 'Learn English through engaging video stories',
  VERSION: '1.0.0',
} as const;

// ============================================
// ROUTES
// ============================================
export const ROUTES = {
  HOME: '/',
  VIDEOS: '/videos',
  VIDEO_DETAIL: (id: string) => `/videos/${id}`,
  MUSIC: '/music',
  STORIES: '/stories',
  STORY_DETAIL: (id: string) => `/stories/${id}`,
  STORY_VOCAB: (id: string) => `/stories/${id}/vocab`,
  STORY_GAMES: (id: string) => `/stories/${id}/games`,
  PROGRESS: '/progress',
  
  // Admin routes
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_VIDEOS: '/admin/videos',
  ADMIN_VIDEO_NEW: '/admin/videos/new',
  ADMIN_VIDEO_EDIT: (id: string) => `/admin/videos/${id}`,
  ADMIN_EDIT: (id: string) => `/admin/edit/${id}`,
  ADMIN_NEW: '/admin/new',
  
  // API routes
  API: {
    HEALTH: '/api/health',
    READY: '/api/ready',
    STORIES: '/api/stories',
    STORY: (id: string) => `/api/stories/${id}`,
    VIDEOS: '/api/videos',
    VIDEO: (id: string) => `/api/videos/${id}`,
    VIDEO_UPLOAD_SIGN: '/api/videos/upload/sign',
    VIDEO_STATUS: (id: string) => `/api/videos/${id}/status`,
    VIDEO_SUBTITLES: (id: string) => `/api/videos/${id}/subtitles`,
    VIDEO_QUIZ: (id: string) => `/api/videos/${id}/quiz`,
  },
} as const;

// ============================================
// VIDEO CONSTRAINTS
// ============================================
export const VIDEO = {
  MAX_SIZE_MB: 2048,
  MAX_SIZE_BYTES: 2 * 1024 * 1024 * 1024, // 2GB
  ALLOWED_TYPES: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'] as const,
  ALLOWED_EXTENSIONS: ['.mp4', '.webm', '.mov', '.ogg'] as const,
  
  // Processing status
  STATUS: {
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    READY: 'ready',
    FAILED: 'failed',
  } as const,
  
  // Polling configuration
  POLL_INTERVAL_MS: 3000,
  POLL_MAX_ATTEMPTS: 100, // 5 minutes total
} as const;

// ============================================
// IMAGE CONSTRAINTS
// ============================================
export const IMAGE = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
  MAX_WIDTH: 1200,
  MAX_HEIGHT: 800,
  QUALITY: 0.8,
} as const;

// ============================================
// LEARNING LEVELS
// ============================================
export const LEVELS = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary', 
  INTERMEDIATE: 'Intermediate',
} as const;

export const LEVEL_OPTIONS = [
  { value: 'Beginner', label: 'Beginner (A1-A2)', emoji: '' },
  { value: 'Elementary', label: 'Elementary (B1)', emoji: '' },
  { value: 'Intermediate', label: 'Intermediate (B2)', emoji: '' },
] as const;

// ============================================
// AGE GROUPS
// ============================================
export const AGE_GROUPS = {
  TODDLER: '3-5',
  EARLY: '6-8',
  MIDDLE: '9-11',
  TEEN: '12-15',
} as const;

export const AGE_GROUP_OPTIONS = [
  { value: '3-5', label: '3-5 years (Toddler)', emoji: '' },
  { value: '6-8', label: '6-8 years (Early Elementary)', emoji: '' },
  { value: '9-11', label: '9-11 years (Middle Elementary)', emoji: '' },
  { value: '12-15', label: '12-15 years (Teen)', emoji: '' },
] as const;

// ============================================
// TOPICS
// ============================================
export const TOPICS = [
  'Daily Life',
  'Animals', 
  'Food',
  'Nature',
  'Family',
  'School',
  'Adventure',
  'Friendship',
  'Science',
  'History',
] as const;

// ============================================
// STORAGE KEYS (localStorage/sessionStorage)
// ============================================
export const STORAGE_KEYS = {
  ADMIN_AUTH: 'admin_auth',
  ADMIN_TOKEN: 'admin_token',
  VIDEO_PROGRESS: 'video_progress',
  USER_PREFERENCES: 'user_preferences',
  LAST_WATCHED: 'last_watched',
  STORIES_CACHE: 'stories_cache',
  THEME: 'theme',
} as const;

// ============================================
// RATE LIMITING
// ============================================
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  MAX_UPLOAD_REQUESTS: 10,
} as const;

// ============================================
// TIMEOUTS & DELAYS
// ============================================
export const TIMING = {
  TOAST_SHORT: 2000,
  TOAST_MEDIUM: 4000,
  TOAST_LONG: 6000,
  TOAST_ERROR: 8000,
  DEBOUNCE_DEFAULT: 300,
  THROTTLE_DEFAULT: 100,
  API_TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 300000, // 5 minutes
} as const;

// ============================================
// UI CONSTANTS
// ============================================
export const UI = {
  SIDEBAR_WIDTH: 224, // 56 * 4 = 224px (w-56)
  HEADER_HEIGHT: 64,
  PAGE_SIZE: 12,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

// ============================================
// ERROR MESSAGES
// ============================================
export const ERRORS = {
  UNAUTHORIZED: 'Unauthorized. Please login.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION: 'Please check your input.',
  NETWORK: 'Network error. Please check your connection.',
  SERVER: 'Server error. Please try again later.',
  UPLOAD_FAILED: 'Upload failed. Please try again.',
  FILE_TOO_LARGE: (maxMB: number) => `File size must be less than ${maxMB}MB`,
  INVALID_FILE_TYPE: (types: readonly string[]) => `Please select a valid file type: ${types.join(', ')}`,
} as const;

// ============================================
// SUCCESS MESSAGES
// ============================================
export const SUCCESS = {
  UPLOADED: 'File uploaded successfully!',
  SAVED: 'Changes saved successfully!',
  DELETED: 'Deleted successfully!',
  LOGIN: 'Welcome back!',
  LOGOUT: 'You have been logged out.',
} as const;

// Type exports
export type Level = typeof LEVELS[keyof typeof LEVELS];
export type AgeGroup = typeof AGE_GROUPS[keyof typeof AGE_GROUPS];
export type Topic = typeof TOPICS[number];
export type VideoStatus = typeof VIDEO.STATUS[keyof typeof VIDEO.STATUS];
