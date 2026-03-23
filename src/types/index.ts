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
  topics: string[];
  cover_image: string;
  estimated_minutes: number;
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

export interface GameScore {
  gameType: 'match' | 'fill_blank';
  storyId: string;
  score: number;
  totalQuestions: number;
  playedAt: string;
}

export interface UserProgress {
  storiesProgress: Record<string, StoryProgress>;
  savedWords: SavedWord[];
  gameScores: GameScore[];
  totalStars: number;
  currentStreak: number;
  lastActiveDate: string;
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
  
  // Bunny.net Stream ID
  bunnyVideoId: string;
  
  // Stream URLs (populated after processing)
  hlsUrl?: string;
  dashUrl?: string;
  
  // Metadata
  duration: number;        // seconds
  level: 'Beginner' | 'Elementary' | 'Intermediate';
  topics: string[];
  ageGroup?: '3-5' | '6-8' | '9-12';
  category: 'video' | 'music'; // Distinguish between educational videos and music
  
  // Status
  status: 'uploading' | 'processing' | 'ready' | 'error';
  
  // Subtitles stored inline (for simplicity)
  subtitles: SubtitleCue[];
  
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
