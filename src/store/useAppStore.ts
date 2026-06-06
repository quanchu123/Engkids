import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BadgeId,
  GameResult,
  GameScore,
  ProgressSnapshot,
  SavedWord,
  StoryProgress,
  UserProgress,
  UserSettings,
} from '@/types';
import {
  applyBadgeUnlocks,
  createDefaultProgress,
  createGameScore,
  DEFAULT_SETTINGS,
  getTodayDate,
  incrementQuestStep,
  normalizeProgress,
  normalizeProgressSnapshot,
} from '@/lib/progress';
import { trackEvent } from '@/lib/analytics';
import { syncSavedWordToSRS } from '@/services/vocabulary';
import { AvatarCategory, EquippedAvatar, getDefaultEquipped, getItem } from '@/lib/avatar';

const MAX_WORD_INTERACTIONS = 2000;
const STREAK_FREEZE_COST = 50;

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
  progress: UserProgress;
  hydrated: boolean;
  wordInteractions: Map<string, WordInteraction>;
  settings: UserSettings;
  equippedAvatar: EquippedAvatar;
  ownedAvatarItems: string[];
  coins: number;
  streakFreezes: number;
  equipAvatarItem: (category: AvatarCategory, itemId: string) => void;
  unlockAvatarItem: (itemId: string) => void;
  purchaseAvatarItem: (itemId: string) => boolean;
  buyStreakFreeze: () => boolean;
  isAvatarItemOwned: (itemId: string) => boolean;
  markPanelViewed: (storyId: string, panelId: number) => void;
  completeStory: (storyId: string, stars: number) => void;
  saveWord: (word: string, vi: string, isFavorite?: boolean, ipa?: string, storyId?: string, exampleSentence?: string) => void;
  unsaveWord: (wordText: string) => void;
  toggleWordFavorite: (wordText: string) => void;
  updateWordMastery: (wordText: string, masteryLevel: 0 | 1 | 2 | 3 | 4 | 5) => void;
  addGameScore: (score: GameScore) => void;
  applyGameResult: (result: GameResult) => void;
  completeQuestStep: (step: 'story' | 'media' | 'game' | 'saveWord', amount?: number) => void;
  grantBadgeIfEligible: (badgeId: BadgeId) => void;
  recordMediaActivity: () => void;
  updateStreak: () => void;
  trackWordClick: (word: string, storyId: string) => void;
  getWordState: (word: string) => 'new' | 'viewed' | 'saved' | 'mastered';
  toggleVietnamese: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setReadingSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  toggleAutoPlayAudio: () => void;
  replaceProgress: (progress: UserProgress) => void;
  replaceSettings: (settings: UserSettings) => void;
  setHydrated: (hydrated: boolean) => void;
  isWordSaved: (word: string) => boolean;
  getStoryProgress: (storyId: string) => StoryProgress | null;
}

function updateWordInteractionMap(
  map: Map<string, WordInteraction>,
  word: string,
  updater: (current: WordInteraction | undefined) => WordInteraction,
) {
  const normalized = word.toLowerCase().trim();
  const next = new Map(map);
  next.set(normalized, updater(map.get(normalized)));

  if (next.size > MAX_WORD_INTERACTIONS) {
    const entries = Array.from(next.entries()).sort((a, b) => a[1].lastSeen.localeCompare(b[1].lastSeen));
    entries.slice(0, next.size - MAX_WORD_INTERACTIONS).forEach(([key]) => next.delete(key));
  }

  return next;
}

function refreshQuestIfNeeded(progress: UserProgress): UserProgress {
  const today = getTodayDate();
  if (progress.dailyQuestState.date === today) {
    return progress;
  }
  return normalizeProgress({
    ...progress,
    lastActiveDate: progress.lastActiveDate || today,
    dailyQuestState: undefined,
  });
}

function withNormalizedProgress(progress: UserProgress, updater: (progress: UserProgress) => UserProgress): UserProgress {
  const normalized = refreshQuestIfNeeded(normalizeProgress(progress));
  return applyBadgeUnlocks(updater(normalized));
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      progress: createDefaultProgress(),
      hydrated: false,
      settings: DEFAULT_SETTINGS,
      wordInteractions: new Map(),
      equippedAvatar: getDefaultEquipped(),
      ownedAvatarItems: [],
      coins: 0,
      streakFreezes: 0,

      unlockAvatarItem: (itemId) => {
        set((state) => {
          if (state.ownedAvatarItems.includes(itemId)) return state;
          if (!getItem(itemId)) return state;
          return { ownedAvatarItems: [...state.ownedAvatarItems, itemId] };
        });
      },

      // Spend coins to buy an avatar item. Returns false (no-op) when the item
      // is unknown, already owned, or the child can't afford it. Free items
      // (price 0) are always purchasable.
      purchaseAvatarItem: (itemId) => {
        const item = getItem(itemId);
        if (!item) return false;
        const state = get();
        if (state.ownedAvatarItems.includes(itemId)) return true;
        const price = item.requiredStars;
        if (state.coins < price) return false;
        set({
          coins: state.coins - price,
          ownedAvatarItems: [...state.ownedAvatarItems, itemId],
        });
        return true;
      },

      // Buy a streak-freeze token (protects the streak when a day is missed).
      buyStreakFreeze: () => {
        const state = get();
        if (state.coins < STREAK_FREEZE_COST) return false;
        set({ coins: state.coins - STREAK_FREEZE_COST, streakFreezes: state.streakFreezes + 1 });
        return true;
      },

      equipAvatarItem: (category, itemId) => {
        set((state) => ({
          equippedAvatar: { ...state.equippedAvatar, [category]: itemId },
        }));
      },

      isAvatarItemOwned: (itemId) => {
        const state = get();
        if (state.ownedAvatarItems.includes(itemId)) return true;
        const item = getItem(itemId);
        return Boolean(item && item.requiredStars === 0);
      },

      trackWordClick: (word, storyId) => {
        set((state) => {
          const normalized = word.toLowerCase().trim();
          if (!normalized) return state;
          const now = new Date().toISOString();
          return {
            wordInteractions: updateWordInteractionMap(state.wordInteractions, normalized, (existing) => ({
              word: normalized,
              clickCount: (existing?.clickCount || 0) + 1,
              saveCount: existing?.saveCount || 0,
              firstSeen: existing?.firstSeen || now,
              lastSeen: now,
              storyIds: existing?.storyIds?.includes(storyId)
                ? existing.storyIds
                : [...(existing?.storyIds || []), storyId],
              masteryLevel: existing?.masteryLevel || 0,
            })),
          };
        });
      },

      getWordState: (word) => {
        const state = get();
        const normalized = word.toLowerCase().trim();
        const interaction = state.wordInteractions.get(normalized);
        const saved = state.progress.savedWords.some((item) => item.word.toLowerCase().trim() === normalized);

        if (!interaction) return 'new';
        if ((interaction.masteryLevel || 0) >= 3) return 'mastered';
        if (saved) return 'saved';
        if (interaction.clickCount > 0) return 'viewed';
        return 'new';
      },

      markPanelViewed: (storyId, panelId) => {
        set((state) => ({
          progress: withNormalizedProgress(state.progress, (progress) => {
            const currentProgress = progress.storiesProgress[storyId] || {
              storyId,
              completed: false,
              panelsViewed: [],
              starsEarned: 0,
            };

            const panelsViewed = currentProgress.panelsViewed.includes(panelId)
              ? currentProgress.panelsViewed
              : [...currentProgress.panelsViewed, panelId];

            return {
              ...progress,
              storiesProgress: {
                ...progress.storiesProgress,
                [storyId]: {
                  ...currentProgress,
                  panelsViewed,
                },
              },
            };
          }),
        }));
      },

      completeStory: (storyId, stars) => {
        set((state) => {
          const prevStars = state.progress.totalStars;
          const nextProgress = withNormalizedProgress(state.progress, (progress) => {
            const currentProgress = progress.storiesProgress[storyId] || {
              storyId,
              completed: false,
              panelsViewed: [],
              starsEarned: 0,
            };

            const newStars = Math.max(currentProgress.starsEarned, stars);
            const starsGained = newStars - currentProgress.starsEarned;
            const nextQuest = incrementQuestStep(progress.dailyQuestState, 'story', currentProgress.completed ? 0 : 1);
            if (!currentProgress.completed) {
              trackEvent('story_opened', { storyId });
            }
            if (nextQuest.completed && !progress.dailyQuestState.completed) {
              trackEvent('quest_completed', { date: nextQuest.date });
            }

            return {
              ...progress,
              storiesProgress: {
                ...progress.storiesProgress,
                [storyId]: {
                  ...currentProgress,
                  completed: true,
                  starsEarned: newStars,
                  completedAt: new Date().toISOString(),
                },
              },
              totalStars: progress.totalStars + starsGained,
              dailyQuestState: nextQuest,
            };
          });
          // Spendable coins grow with every newly-earned star.
          const gained = Math.max(0, nextProgress.totalStars - prevStars);
          return { progress: nextProgress, coins: state.coins + gained };
        });
      },

      saveWord: (word, vi, isFavorite = false, ipa = '', storyId = '', exampleSentence = '') => {
        const alreadySaved = get().progress.savedWords.some(
          (item) => item.word.toLowerCase().trim() === word.toLowerCase().trim(),
        );

        set((state) => {
          const exists = state.progress.savedWords.some(
            (item) => item.word.toLowerCase().trim() === word.toLowerCase().trim(),
          );
          if (exists) return state;

          const now = new Date().toISOString();
          const newWord: SavedWord = {
            word,
            vi,
            ipa,
            savedAt: now,
            storyId,
            isFavorite,
            masteryLevel: 0,
            reviewCount: 0,
            exampleSentence,
          };

          const nextProgress = withNormalizedProgress(state.progress, (progress) => {
            const nextQuest = incrementQuestStep(progress.dailyQuestState, 'saveWord', 1);
            if (nextQuest.completed && !progress.dailyQuestState.completed) {
              trackEvent('quest_completed', { date: nextQuest.date });
            }
            trackEvent('word_saved', { word, sourceId: storyId || undefined });

            return {
              ...progress,
              savedWords: [...progress.savedWords, newWord],
              dailyQuestState: nextQuest,
            };
          });

          return {
            progress: nextProgress,
            wordInteractions: updateWordInteractionMap(state.wordInteractions, word, (existing) => ({
              word: word.toLowerCase().trim(),
              clickCount: existing?.clickCount || 0,
              saveCount: (existing?.saveCount || 0) + 1,
              firstSeen: existing?.firstSeen || now,
              lastSeen: now,
              storyIds: existing?.storyIds || (storyId ? [storyId] : []),
              masteryLevel: Math.min(5, (existing?.masteryLevel || 0) + 1) as 0 | 1 | 2 | 3 | 4 | 5,
            })),
          };
        });

        // Best-effort: mirror newly saved words into the SRS schedule for
        // logged-in users. Fire-and-forget, never blocks; safe no-op for guests
        // (addVocabulary returns null when unauthenticated). Skip if the word
        // was already saved to avoid unnecessary calls.
        if (!alreadySaved) {
          syncSavedWordToSRS({
            word,
            meaningVi: vi,
            pronunciation: ipa || undefined,
            exampleSentence: exampleSentence || undefined,
            sourceType: storyId ? 'story' : 'manual',
            sourceId: storyId || undefined,
          });
        }
      },

      toggleWordFavorite: (wordText) => {
        set((state) => ({
          progress: {
            ...state.progress,
            savedWords: state.progress.savedWords.map((word) =>
              word.word.toLowerCase().trim() === wordText.toLowerCase().trim()
                ? { ...word, isFavorite: !word.isFavorite }
                : word,
            ),
          },
        }));
      },

      updateWordMastery: (wordText, masteryLevel) => {
        set((state) => ({
          progress: {
            ...state.progress,
            savedWords: state.progress.savedWords.map((word) =>
              word.word.toLowerCase().trim() === wordText.toLowerCase().trim()
                ? {
                    ...word,
                    masteryLevel,
                    reviewCount: (word.reviewCount || 0) + 1,
                    lastReviewedAt: new Date().toISOString(),
                  }
                : word,
            ),
          },
        }));
      },

      unsaveWord: (wordText) => {
        set((state) => ({
          progress: {
            ...state.progress,
            savedWords: state.progress.savedWords.filter(
              (word) => word.word.toLowerCase().trim() !== wordText.toLowerCase().trim(),
            ),
          },
        }));
      },

      addGameScore: (score) => {
        get().applyGameResult({
          ...score,
          playedAt: score.playedAt,
        });
      },

      applyGameResult: (result) => {
        set((state) => {
          const prevStars = state.progress.totalStars;
          const nextProgress = withNormalizedProgress(state.progress, (progress) => {
            const nextQuest = incrementQuestStep(progress.dailyQuestState, 'game', 1);
            const nextScore = createGameScore(result);
            const rewardStars = result.rewards?.stars || 0;
            trackEvent('game_finished', {
              gameType: result.gameType,
              storyId: result.storyId,
              score: result.score,
              totalQuestions: result.totalQuestions,
            });
            if (nextQuest.completed && !progress.dailyQuestState.completed) {
              trackEvent('quest_completed', { date: nextQuest.date });
            }

            return {
              ...progress,
              gameScores: [...progress.gameScores, nextScore],
              totalStars: progress.totalStars + rewardStars,
              dailyQuestState: nextQuest,
            };
          });
          const gained = Math.max(0, nextProgress.totalStars - prevStars);
          return { progress: nextProgress, coins: state.coins + gained };
        });
      },

      completeQuestStep: (step, amount = 1) => {
        set((state) => {
          const nextQuest = incrementQuestStep(state.progress.dailyQuestState, step, amount);
          if (nextQuest.completed && !state.progress.dailyQuestState.completed) {
            trackEvent('quest_completed', { date: nextQuest.date });
          }
          return {
            progress: {
              ...state.progress,
              dailyQuestState: nextQuest,
            },
          };
        });
      },

      grantBadgeIfEligible: (badgeId) => {
        set((state) => {
          const alreadyUnlocked = state.progress.badges.some((badge) => badge.id === badgeId);
          const eligibleProgress = applyBadgeUnlocks(state.progress);
          if (alreadyUnlocked || !eligibleProgress.badges.some((badge) => badge.id === badgeId)) {
            return state;
          }
          return { progress: eligibleProgress };
        });
      },

      recordMediaActivity: () => {
        set((state) => {
          const nextQuest = incrementQuestStep(state.progress.dailyQuestState, 'media', 1);
          if (nextQuest.completed && !state.progress.dailyQuestState.completed) {
            trackEvent('quest_completed', { date: nextQuest.date });
          }
          return {
            progress: {
              ...state.progress,
              dailyQuestState: nextQuest,
            },
          };
        });
      },

      updateStreak: () => {
        set((state) => {
          const today = getTodayDate();
          const lastActive = state.progress.lastActiveDate;

          if (lastActive === today) {
            return {
              progress: refreshQuestIfNeeded(state.progress),
            };
          }

          const MS_DAY = 86400000;
          const diffDays = Math.round((Date.parse(today) - Date.parse(lastActive)) / MS_DAY);

          let newStreak: number;
          let freezesLeft = state.streakFreezes;

          if (diffDays <= 1) {
            // Consecutive day (or same/again) → extend the streak.
            newStreak = state.progress.currentStreak + 1;
          } else if (diffDays === 2 && state.streakFreezes > 0) {
            // Missed exactly one day but a freeze token saves the streak.
            newStreak = Math.max(1, state.progress.currentStreak);
            freezesLeft = state.streakFreezes - 1;
          } else {
            // Missed two+ days (or no freeze) → reset.
            newStreak = 1;
          }

          return {
            streakFreezes: freezesLeft,
            progress: withNormalizedProgress(
              {
                ...state.progress,
                currentStreak: newStreak,
                lastActiveDate: today,
                dailyQuestState: undefined as never,
              } as UserProgress,
              (progress) => progress,
            ),
          };
        });
      },

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

      replaceProgress: (progress) => {
        set({ progress: normalizeProgress(progress) });
      },

      replaceSettings: (settings) => {
        set({ settings: { ...DEFAULT_SETTINGS, ...settings } });
      },

      setHydrated: (hydrated) => {
        set({ hydrated });
      },

      isWordSaved: (word) => {
        return get().progress.savedWords.some(
          (item) => item.word.toLowerCase().trim() === word.toLowerCase().trim(),
        );
      },

      getStoryProgress: (storyId) => {
        return get().progress.storiesProgress[storyId] || null;
      },
    }),
    {
      name: 'kids.progress.v2',
      partialize: (state) => ({
        progress: state.progress,
        settings: state.settings,
        wordInteractions: Array.from(state.wordInteractions.entries()),
        equippedAvatar: state.equippedAvatar,
        ownedAvatarItems: state.ownedAvatarItems,
        coins: state.coins,
        streakFreezes: state.streakFreezes,
      }),
      merge: (persistedState: unknown, currentState) => {
        const persisted = persistedState as Partial<AppState & { wordInteractions: [string, WordInteraction][] }>;
        const snapshot = normalizeProgressSnapshot({
          progress: persisted.progress,
          settings: persisted.settings,
        } as Partial<ProgressSnapshot>);

        return {
          ...currentState,
          ...persisted,
          progress: snapshot.progress,
          settings: snapshot.settings,
          wordInteractions: new Map(persisted.wordInteractions || []),
          equippedAvatar: persisted.equippedAvatar || getDefaultEquipped(),
          ownedAvatarItems: persisted.ownedAvatarItems || [],
          // Grandfather existing players: first run seeds coins from lifetime stars.
          coins: typeof persisted.coins === 'number' ? persisted.coins : snapshot.progress.totalStars,
          streakFreezes: typeof persisted.streakFreezes === 'number' ? persisted.streakFreezes : 0,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
