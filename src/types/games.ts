// ============================================
// EDITABLE GAME CONTENT TYPES
// ============================================
// Shapes for admin-editable game content. Each game type stores its data as a
// JSONB payload in the `game_content` table; when absent, built-in defaults are
// used so games never break.

export type GameDifficulty = 'beginner' | 'intermediate' | 'advanced';

// Multiple-choice question
export interface MCQuestion {
  id: number;
  question: string;
  options: string[];
  answer: string;       // must be one of options
  explanation: string;
}

// True/False question
export interface TFQuestion {
  id: number;
  text: string;
  answer: boolean;
  explanation: string;
}

// Content keyed by difficulty level.
export type MCContent = Record<GameDifficulty, MCQuestion[]>;
export type TFContent = Record<GameDifficulty, TFQuestion[]>;

// Identifiers used as primary keys in the game_content table.
export const GAME_TYPES = {
  MULTIPLE_CHOICE: 'multiple-choice',
  TRUE_FALSE: 'true-false',
} as const;

export type EditableGameType = (typeof GAME_TYPES)[keyof typeof GAME_TYPES];

export const DIFFICULTIES: GameDifficulty[] = ['beginner', 'intermediate', 'advanced'];

export const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  beginner: 'Dễ',
  intermediate: 'Trung bình',
  advanced: 'Khó',
};
