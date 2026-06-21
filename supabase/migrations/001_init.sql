-- ============================================
-- COMIC LINGUA KIDS - SUPABASE SCHEMA
-- ============================================

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  level TEXT NOT NULL,
  topics TEXT[] DEFAULT '{}',
  cover_image TEXT,
  estimated_minutes INTEGER DEFAULT 0,
  vocabulary JSONB DEFAULT '[]',
  games JSONB DEFAULT '{}',
  panels JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Progress table
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  total_stars INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  saved_words TEXT[] DEFAULT '{}',
  stories_progress JSONB DEFAULT '{}',
  game_scores JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stories_level ON stories(level);
CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created_at);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
