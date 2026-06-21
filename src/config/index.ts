// ============================================
// CONFIG INDEX - SINGLE IMPORT POINT
// ============================================

// Re-export everything from config modules
export * from './constants';
export * from './env';
export * from './storage';

// Named exports for convenience
export { config } from './env';
export { storage, adminAuth, videoProgress, userPreferences, lastWatched, storiesCache } from './storage';
