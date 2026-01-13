import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProgress, UserSettings, SavedWord, GameScore, StoryProgress } from '@/types';

interface AppState {
  // Progress
  progress: UserProgress;
  
  // Settings
  settings: UserSettings;
  
  // Actions - Progress
  markPanelViewed: (storyId: string, panelId: number) => void;
  completeStory: (storyId: string, stars: number) => void;
  saveWord: (word: SavedWord) => void;
  unsaveWord: (wordText: string) => void;
  addGameScore: (score: GameScore) => void;
  updateStreak: () => void;
  
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
      saveWord: (word) => {
        set((state) => {
          const exists = state.progress.savedWords.some(
            (w) => w.word.toLowerCase() === word.word.toLowerCase()
          );
          if (exists) return state;

          return {
            progress: {
              ...state.progress,
              savedWords: [...state.progress.savedWords, word],
            },
          };
        });
      },

      // Unsave word
      unsaveWord: (wordText) => {
        set((state) => ({
          progress: {
            ...state.progress,
            savedWords: state.progress.savedWords.filter(
              (w) => w.word.toLowerCase() !== wordText.toLowerCase()
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
          (w) => w.word.toLowerCase() === word.toLowerCase()
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
      }),
    }
  )
);
