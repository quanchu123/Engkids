-- ============================================
-- VOCABULARY & PROGRESS ENHANCEMENT
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. VOCABULARY ITEMS TABLE
-- Store detailed vocabulary with meanings, examples, audio
-- ============================================

CREATE TABLE IF NOT EXISTS vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Word data
  word TEXT NOT NULL,
  word_lower TEXT GENERATED ALWAYS AS (LOWER(word)) STORED, -- For search
  pronunciation TEXT, -- IPA pronunciation
  
  -- Meanings
  meaning_vi TEXT NOT NULL, -- Vietnamese translation
  meaning_en TEXT, -- English definition
  part_of_speech TEXT CHECK (part_of_speech IN ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'other')),
  
  -- Context
  example_sentence TEXT, -- Example in English
  example_sentence_vi TEXT, -- Example in Vietnamese
  source_type TEXT CHECK (source_type IN ('story', 'video', 'manual')),
  source_id TEXT, -- story_id or video_id
  
  -- Spaced Repetition (SM-2 algorithm)
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5, -- SM-2 ease factor
  interval_days INTEGER DEFAULT 1, -- Days until next review
  next_review_date DATE DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  
  -- Status
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
  -- 0: New, 1: Learning, 2: Reviewing, 3: Familiar, 4: Known, 5: Mastered
  is_favorite BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(user_profile_id, word_lower)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vocab_user ON vocabulary_items(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary_items(word_lower);
CREATE INDEX IF NOT EXISTS idx_vocab_review ON vocabulary_items(user_profile_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_vocab_mastery ON vocabulary_items(user_profile_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocab_favorite ON vocabulary_items(user_profile_id, is_favorite);

-- ============================================
-- 2. LEARNING SESSIONS TABLE
-- Track study sessions for analytics
-- ============================================

CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Session data
  session_type TEXT NOT NULL CHECK (session_type IN ('story', 'video', 'vocabulary', 'game')),
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  
  -- Content
  content_id TEXT, -- story_id, video_id, etc.
  content_title TEXT,
  
  -- Results
  words_learned INTEGER DEFAULT 0,
  words_reviewed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  
  -- Device info
  device_type TEXT, -- mobile, tablet, desktop
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON learning_sessions(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON learning_sessions(user_profile_id, session_start);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON learning_sessions(user_profile_id, session_type);

-- ============================================
-- 3. ACHIEVEMENTS TABLE
-- Gamification achievements/badges
-- ============================================

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  achievement_icon TEXT, -- Emoji or icon name
  
  -- Progress
  progress INTEGER DEFAULT 0,
  target INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_profile_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_profile_id);

-- ============================================
-- 4. DAILY GOALS TABLE
-- Track daily learning goals
-- ============================================

CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Goals
  words_goal INTEGER DEFAULT 10,
  words_completed INTEGER DEFAULT 0,
  minutes_goal INTEGER DEFAULT 15,
  minutes_completed INTEGER DEFAULT 0,
  stories_goal INTEGER DEFAULT 1,
  stories_completed INTEGER DEFAULT 0,
  
  -- Status
  all_goals_met BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_profile_id, goal_date)
);

CREATE INDEX IF NOT EXISTS idx_goals_user_date ON daily_goals(user_profile_id, goal_date);

-- ============================================
-- 5. UPDATE user_progress TABLE
-- Add new fields for enhanced tracking
-- ============================================

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS total_words_learned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_minutes_studied INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekly_stats JSONB DEFAULT '{"words": 0, "minutes": 0, "sessions": 0}',
ADD COLUMN IF NOT EXISTS monthly_stats JSONB DEFAULT '{"words": 0, "minutes": 0, "sessions": 0}';

-- ============================================
-- 6. RLS POLICIES FOR NEW TABLES
-- ============================================

-- Enable RLS
ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

-- Vocabulary policies
DROP POLICY IF EXISTS "Users manage own vocabulary" ON vocabulary_items;
CREATE POLICY "Users manage own vocabulary" ON vocabulary_items
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
  );

-- Sessions policies  
DROP POLICY IF EXISTS "Users manage own sessions" ON learning_sessions;
CREATE POLICY "Users manage own sessions" ON learning_sessions
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
  );

-- Achievements policies
DROP POLICY IF EXISTS "Users manage own achievements" ON user_achievements;
CREATE POLICY "Users manage own achievements" ON user_achievements
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
  );

-- Goals policies
DROP POLICY IF EXISTS "Users manage own goals" ON daily_goals;
CREATE POLICY "Users manage own goals" ON daily_goals
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
  );

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- SM-2 Spaced Repetition Algorithm
CREATE OR REPLACE FUNCTION calculate_next_review(
  p_ease_factor FLOAT,
  p_interval INTEGER,
  p_quality INTEGER -- 0-5 rating (0-2 = fail, 3-5 = pass)
)
RETURNS TABLE(new_ease FLOAT, new_interval INTEGER) AS $$
DECLARE
  min_ease CONSTANT FLOAT := 1.3;
BEGIN
  -- Calculate new ease factor
  new_ease := p_ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  IF new_ease < min_ease THEN
    new_ease := min_ease;
  END IF;
  
  -- Calculate new interval
  IF p_quality < 3 THEN
    -- Failed: reset
    new_interval := 1;
  ELSIF p_interval = 1 THEN
    new_interval := 1;
  ELSIF p_interval = 2 THEN
    new_interval := 6;
  ELSE
    new_interval := ROUND(p_interval * new_ease)::INTEGER;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Get words due for review
CREATE OR REPLACE FUNCTION get_words_for_review(p_user_profile_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS SETOF vocabulary_items AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM vocabulary_items
  WHERE user_profile_id = p_user_profile_id
    AND next_review_date <= CURRENT_DATE
  ORDER BY 
    CASE mastery_level WHEN 0 THEN 0 ELSE 1 END, -- New words first
    next_review_date ASC,
    ease_factor ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_profile_id UUID)
RETURNS void AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM user_progress
  WHERE user_profile_id = p_user_profile_id;
  
  IF v_last_date IS NULL OR v_last_date < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak broken or first activity
    v_current_streak := 1;
  ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
  END IF;
  -- If same day, don't change streak
  
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  UPDATE user_progress
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = CURRENT_DATE
  WHERE user_profile_id = p_user_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. VERIFY SETUP
-- ============================================

SELECT 'Vocabulary tables created!' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('vocabulary_items', 'learning_sessions', 'user_achievements', 'daily_goals')
ORDER BY table_name;
