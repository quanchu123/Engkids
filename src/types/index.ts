// Story Types
export interface Token {
  display: string;
  norm: string;
  vi?: string;
  ipa?: string;
  audio?: string;
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
  ipa: string;
  savedAt: string;
  storyId: string;
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
