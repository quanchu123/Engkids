// Story Types
export interface Token {
  display: string;      // Display text (e.g., "Running")
  norm: string;         // Normalized (e.g., "running")
  lemma?: string;       // Base form (e.g., "run")
  vi?: string;          // Vietnamese translation
  ipa?: string;         // Pronunciation
  audio?: string;       // Audio URL
}

export interface Panel {
  panel_id: number;
  image: string;           // URL ảnh hoặc emoji
  image_alt?: string;      // Mô tả ảnh (accessibility)
  sentence_en: string;
  sentence_vi: string;
  tokens: Token[];
  tokens_vi?: TokenVi[];   // Tokens cho câu tiếng Việt (optional)
}

// Token tiếng Việt - dùng khi muốn click từ TV tra nghĩa
export interface TokenVi {
  display: string;
  en?: string;             // Nghĩa tiếng Anh
}

export interface VocabWord {
  word: string;
  vi: string;
  ipa: string;
  image?: string;
}

export interface MatchGameItem {
  word: string;
  image?: string;
  vi: string;
}

export interface FillBlankItem {
  sentence_en: string;
  answer: string;
  choices: string[];
}

export interface StoryGames {
  match: MatchGameItem[];
  fill_blank: FillBlankItem[];
}

export interface Story {
  id: string;
  title_en: string;
  title_vi: string;
  level: 'Beginner' | 'Elementary' | 'Intermediate';
  curriculum_stage_id?: string | null;
  topics: string[];
  cover_image: string;
  estimated_minutes: number;
  published: boolean;
  panels: Panel[];
  vocabulary: VocabWord[];
  games: StoryGames;
}

// Progress Types
export interface StoryProgress {
  storyId: string;
  completed: boolean;
  panelsViewed: number[];
  starsEarned: number;
  completedAt?: string;
}

export interface SavedWord {
  word: string;
  vi: string;
  ipa?: string;
  savedAt: string;
  storyId?: string;
  // Enhanced fields for vocabulary system
  isFavorite?: boolean;
  masteryLevel?: 0 | 1 | 2 | 3 | 4 | 5;
  reviewCount?: number;
  lastReviewedAt?: string;
  exampleSentence?: string;
}

export type GameType =
  | 'match'
  | 'fill_blank'
  | 'memory_match'
  | 'word_puzzle'
  | 'word_burst'
  | 'rpg_world'
  | 'candy_crush'
  | 'space_invaders'
  | 'word_collector'
  | 'mario_word'
  | 'rpg_battle'
  | 'tank_word'
  | 'tower_climb'
  | 'tower_word'
  | 'multiple_choice'
  | 'true_false'
  | 'matching_pairs'
  | 'sentence_scramble'
  | 'fill_blanks'
  | string;

export interface GameScore {
  gameType: GameType;
  storyId: string;
  score: number;
  totalQuestions: number;
  playedAt: string;
}

export type DailyQuestStepType = 'story' | 'media' | 'game' | 'saveWord';

export interface DailyQuestStep {
  type: DailyQuestStepType;
  target: number;
  completed: number;
  done: boolean;
}

export interface DailyQuestState {
  date: string;
  steps: Record<DailyQuestStepType, DailyQuestStep>;
  completed: boolean;
  completedAt?: string;
}

export type BadgeId =
  | 'streak_3'
  | 'streak_7'
  | 'story_1'
  | 'story_5'
  | 'vocab_10'
  | 'vocab_50'
  | 'game_master';

export interface BadgeProgress {
  id: BadgeId;
  unlockedAt: string;
}

export type MistakeKind = 'vocab' | 'grammar' | 'listening' | 'reading' | 'other';

export interface MistakeItem {
  id: string;
  kind: MistakeKind;
  promptVi: string;
  questionEn: string;
  yourAnswer: string;
  correctAnswer: string;
  skillId?: string;
  stageId?: string;
  addedAt: string;
  reviewCount: number;
  resolved: boolean;
  lastReviewedAt?: string;
}

export interface UserProgress {
  storiesProgress: Record<string, StoryProgress>;
  savedWords: SavedWord[];
  gameScores: GameScore[];
  totalStars: number;
  currentStreak: number;
  lastActiveDate: string;
  dailyQuestState: DailyQuestState;
  badges: BadgeProgress[];
  mistakes: MistakeItem[];
}

export interface ProgressSnapshot {
  progress: UserProgress;
  settings: UserSettings;
}

export interface RewardGrant {
  stars?: number;
  badges?: BadgeId[];
}

export interface QuestProgressDelta {
  step: DailyQuestStepType;
  amount?: number;
}

export interface GameScorePayload {
  gameType: GameType;
  storyId: string;
  score: number;
  totalQuestions: number;
  playedAt?: string;
}

export interface GameResult extends GameScorePayload {
  rewards?: RewardGrant;
}

// Settings Types
export interface UserSettings {
  showVietnamese: boolean;
  fontSize: 'small' | 'medium' | 'large';
  readingSpeed: 'slow' | 'normal' | 'fast';
  autoPlayAudio: boolean;
}

// ===========================================
// VIDEO LEARNING TYPES
// ===========================================

export interface SubtitleCue {
  id: string;
  startTime: number;      // seconds (e.g., 1.5)
  endTime: number;        // seconds (e.g., 4.2)
  textEn: string;         // English text
  textVi: string;         // Vietnamese translation
  words?: ClickableWord[]; // Clickable words in English text
}

export interface ClickableWord {
  word: string;
  startIndex: number;     // position in textEn
  endIndex: number;
  startTime?: number;     // for karaoke effect
  endTime?: number;
}

// Multiple-choice quiz question shown beside the video player
export interface VideoQuizQuestion {
  id: string;
  question: string;        // Question text (English)
  questionVi?: string;     // Vietnamese translation (optional)
  options: string[];       // Answer choices (2-4)
  correctIndex: number;    // Index of the correct option
  explanation?: string;    // Optional feedback shown after answering
  timeCode?: number;       // Optional: seconds into the video this relates to
}

export interface SubtitleTrack {
  id: string;
  videoId: string;
  cues: SubtitleCue[];
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  title: string;
  titleVi: string;
  description?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;

  // DigitalOcean Spaces object key (path of the file inside the bucket).
  objectKey?: string;

  // Public CDN URL resolved from objectKey, used by the <video> element.
  videoUrl?: string;

  // Optional collection/theme label used to group videos within a section.
  // Empty/undefined is treated as the "Tổng Hợp" (General) feature.
  feature?: string;

  // Metadata
  duration: number;        // seconds
  level: 'Beginner' | 'Elementary' | 'Intermediate';
  curriculum_stage_id?: string | null;
  topics: string[];
  ageGroup?: '3-5' | '6-8' | '9-12';
  category: 'video' | 'music'; // Distinguish between educational videos and music
  
  // Status
  status: 'uploading' | 'processing' | 'ready' | 'error';
  
  // Subtitles stored inline (for simplicity)
  subtitles: SubtitleCue[];

  // Multiple-choice questions shown next to the player (kids answer while watching)
  quiz?: VideoQuizQuestion[];
  
  createdAt: string;
  updatedAt: string;
}

export interface UserVideoProgress {
  videoId: string;
  watchedSeconds: number;
  completionPercent: number;
  lastWatchedAt: string;
  learnedWords: string[];   // words clicked and learned
}
