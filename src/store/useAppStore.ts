import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProgress, UserSettings, SavedWord, GameScore, StoryProgress } from '@/types';

const MAX_WORD_INTERACTIONS = 2000;

// Enhanced word interaction tracking
export interface WordInteraction {
  word: string;
  clickCount: number;
  saveCount: number;
  firstSeen: string;
  lastSeen: string;
  storyIds: string[];
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5;
}

interface AppState {
  // Progress
  progress: UserProgress;
  
  // Word interactions
  wordInteractions: Map<string, WordInteraction>;
  
  // Settings
  settings: UserSettings;
  
  // Actions - Progress
  markPanelViewed: (storyId: string, panelId: number) => void;
  completeStory: (storyId: string, stars: number) => void;
  saveWord: (word: string, vi: string, isFavorite?: boolean, ipa?: string, storyId?: string, exampleSentence?: string) => void;
  unsaveWord: (wordText: string) => void;
  toggleWordFavorite: (wordText: string) => void;
  updateWordMastery: (wordText: string, masteryLevel: 0 | 1 | 2 | 3 | 4 | 5) => void;
  addGameScore: (score: GameScore) => void;
  updateStreak: () => void;
  
  // Actions - Word tracking
  trackWordClick: (word: string, storyId: string) => void;
  getWordState: (word: string) => 'new' | 'viewed' | 'saved' | 'mastered';
  
  // Actions - Settings
  toggleVietnamese: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setReadingSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  toggleAutoPlayAudio: () => void;
  
  // Getters
  isWordSaved: (word: string) => boolean;
  getStoryProgress: (storyId: string) => StoryProgress | null;
}

const defaultProgress: UserProgress = {
  storiesProgress: {},
  savedWords: [],
  gameScores: [],
  totalStars: 0,
  currentStreak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
};

const defaultSettings: UserSettings = {
  showVietnamese: true,
  fontSize: 'medium',
  readingSpeed: 'normal',
  autoPlayAudio: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      progress: defaultProgress,
      settings: defaultSettings,
      wordInteractions: new Map(),

      // Track word click
      trackWordClick: (word, storyId) => {
        set((state) => {
          const normalized = word.toLowerCase().trim();
          if (!normalized) return state;
          const existing = state.wordInteractions.get(normalized);
          const now = new Date().toISOString();

          const updated = existing
            ? {
                ...existing,
                clickCount: existing.clickCount + 1,
                lastSeen: now,
                storyIds: existing.storyIds.includes(storyId)
                  ? existing.storyIds
                  : [...existing.storyIds, storyId],
              }
            : {
                word: normalized,
                clickCount: 1,
                saveCount: 0,
                firstSeen: now,
                lastSeen: now,
                storyIds: [storyId],
                masteryLevel: 0 as const,
              };

          const newMap = new Map(state.wordInteractions);
          newMap.set(normalized, updated);

          // LRU eviction: remove oldest entries when exceeding limit
          if (newMap.size > MAX_WORD_INTERACTIONS) {
            const entries = Array.from(newMap.entries());
            entries.sort((a, b) => a[1].lastSeen.localeCompare(b[1].lastSeen));
            const toRemove = entries.slice(0, newMap.size - MAX_WORD_INTERACTIONS);
            toRemove.forEach(([key]) => newMap.delete(key));
          }

          return { wordInteractions: newMap };
        });
      },

      // Get word state
      getWordState: (word) => {
        const state = get();
        const normalized = word.toLowerCase().trim();
        const interaction = state.wordInteractions.get(normalized);
        const saved = state.progress.savedWords.some(
          (w) => w.word.toLowerCase() === normalized
        );

        if (!interaction) return 'new';
        if (interaction.masteryLevel >= 3) return 'mastered';
        if (saved) return 'saved';
        if (interaction.clickCount > 0) return 'viewed';
        return 'new';
      },

      // Mark panel as viewed
      markPanelViewed: (storyId, panelId) => {
        set((state) => {
          const currentProgress = state.progress.storiesProgress[storyId] || {
            storyId,
            completed: false,
            panelsViewed: [],
            starsEarned: 0,
          };

          const panelsViewed = currentProgress.panelsViewed.includes(panelId)
            ? currentProgress.panelsViewed
            : [...currentProgress.panelsViewed, panelId];

          return {
            progress: {
              ...state.progress,
              storiesProgress: {
                ...state.progress.storiesProgress,
                [storyId]: {
                  ...currentProgress,
                  panelsViewed,
                },
              },
            },
          };
        });
      },

      // Complete story
      completeStory: (storyId, stars) => {
        set((state) => {
          const currentProgress = state.progress.storiesProgress[storyId] || {
            storyId,
            completed: false,
            panelsViewed: [],
            starsEarned: 0,
          };

          const newStars = Math.max(currentProgress.starsEarned, stars);
          const starsGained = newStars - currentProgress.starsEarned;

          return {
            progress: {
              ...state.progress,
              storiesProgress: {
                ...state.progress.storiesProgress,
                [storyId]: {
                  ...currentProgress,
                  completed: true,
                  starsEarned: newStars,
                  completedAt: new Date().toISOString(),
                },
              },
              totalStars: state.progress.totalStars + starsGained,
            },
          };
        });
      },

      // Save word
      saveWord: (word, vi, isFavorite = false, ipa = '', storyId = '', exampleSentence = '') => {
        set((state) => {
          const exists = state.progress.savedWords.some(
            (w) => w.word.toLowerCase().trim() === word.toLowerCase().trim()
          );
          if (exists) return state;

          const newWord: SavedWord = {
            word,
            vi,
            ipa,
            savedAt: new Date().toISOString(),
            storyId,
            isFavorite,
            masteryLevel: 0,
            reviewCount: 0,
            exampleSentence,
          };

          // Update word interaction
          const normalized = word.toLowerCase().trim();
          const interaction = state.wordInteractions.get(normalized);
          if (interaction) {
            const newMap = new Map(state.wordInteractions);
            newMap.set(normalized, {
              ...interaction,
              saveCount: interaction.saveCount + 1,
              masteryLevel: Math.min(5, interaction.masteryLevel + 1) as 0 | 1 | 2 | 3 | 4 | 5,
            });
            
            return {
              progress: {
                ...state.progress,
                savedWords: [...state.progress.savedWords, newWord],
              },
              wordInteractions: newMap,
            };
          }

          return {
            progress: {
              ...state.progress,
              savedWords: [...state.progress.savedWords, newWord],
            },
          };
        });
      },

      // Toggle word favorite
      toggleWordFavorite: (wordText) => {
        set((state) => ({
          progress: {
            ...state.progress,
            savedWords: state.progress.savedWords.map((w) =>
              w.word.toLowerCase().trim() === wordText.toLowerCase().trim()
                ? { ...w, isFavorite: !w.isFavorite }
                : w
            ),
          },
        }));
      },

      // Update word mastery level
      updateWordMastery: (wordText, masteryLevel) => {
        set((state) => ({
          progress: {
            ...state.progress,
            savedWords: state.progress.savedWords.map((w) =>
              w.word.toLowerCase().trim() === wordText.toLowerCase().trim()
                ? { ...w, masteryLevel, reviewCount: (w.reviewCount || 0) + 1, lastReviewedAt: new Date().toISOString() }
                : w
            ),
          },
        }));
      },

      // Unsave word
      unsaveWord: (wordText) => {
        set((state) => ({
          progress: {
            ...state.progress,
            savedWords: state.progress.savedWords.filter(
              (w) => w.word.toLowerCase().trim() !== wordText.toLowerCase().trim()
            ),
          },
        }));
      },

      // Add game score
      addGameScore: (score) => {
        set((state) => ({
          progress: {
            ...state.progress,
            gameScores: [...state.progress.gameScores, score],
          },
        }));
      },

      // Update streak
      updateStreak: () => {
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const lastActive = state.progress.lastActiveDate;
          
          if (lastActive === today) {
            return state;
          }

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const newStreak = lastActive === yesterdayStr
            ? state.progress.currentStreak + 1
            : 1;

          return {
            progress: {
              ...state.progress,
              currentStreak: newStreak,
              lastActiveDate: today,
            },
          };
        });
      },

      // Settings actions
      toggleVietnamese: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            showVietnamese: !state.settings.showVietnamese,
          },
        }));
      },

      setFontSize: (size) => {
        set((state) => ({
          settings: {
            ...state.settings,
            fontSize: size,
          },
        }));
      },

      setReadingSpeed: (speed) => {
        set((state) => ({
          settings: {
            ...state.settings,
            readingSpeed: speed,
          },
        }));
      },

      toggleAutoPlayAudio: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            autoPlayAudio: !state.settings.autoPlayAudio,
          },
        }));
      },

      // Getters
      isWordSaved: (word) => {
        return get().progress.savedWords.some(
          (w) => w.word.toLowerCase().trim() === word.toLowerCase().trim()
        );
      },

      getStoryProgress: (storyId) => {
        return get().progress.storiesProgress[storyId] || null;
      },
    }),
    {
      name: 'kids.progress.v1',
      partialize: (state) => ({
        progress: state.progress,
        settings: state.settings,
        wordInteractions: Array.from(state.wordInteractions.entries()),
      }),
      merge: (persistedState: unknown, currentState) => {
        const persisted = persistedState as Partial<AppState & { wordInteractions: [string, WordInteraction][] }>;
        // Convert wordInteractions array back to Map
        const wordInteractions = new Map(persisted.wordInteractions || []);
        return {
          ...currentState,
          ...persisted,
          wordInteractions,
        };
      },
    }
  )
);
