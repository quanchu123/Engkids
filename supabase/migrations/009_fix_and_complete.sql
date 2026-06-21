-- ============================================
-- FIX_AND_COMPLETE_SCHEMA.sql
-- Run in Supabase SQL Editor
-- Fixes missing tables and cleans up orphaned data
-- ============================================

-- ============================================
-- PART 1: FIX ORPHANED VIDEOS
-- ============================================

-- Check videos stuck in uploading (more than 1 hour old)
SELECT id, title, status, created_at 
FROM videos 
WHERE status = 'uploading' 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Option A: Delete orphaned videos (uncomment to run)
-- DELETE FROM videos 
-- WHERE status = 'uploading' 
--   AND created_at < NOW() - INTERVAL '1 hour';

-- Option B: Mark as error (safer)
UPDATE videos 
SET status = 'error'
WHERE status = 'uploading' 
  AND created_at < NOW() - INTERVAL '1 hour';

-- ============================================
-- PART 2: CREATE MISSING GAMIFICATION TABLES
-- (From 006_vocabulary_progress.sql)
-- ============================================

-- Vocabulary Items
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  word TEXT NOT NULL,
  word_lower TEXT GENERATED ALWAYS AS (LOWER(word)) STORED,
  pronunciation TEXT,
  
  meaning_vi TEXT NOT NULL,
  meaning_en TEXT,
  part_of_speech TEXT CHECK (part_of_speech IN ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'other')),
  
  example_sentence TEXT,
  example_sentence_vi TEXT,
  source_type TEXT CHECK (source_type IN ('story', 'video', 'manual')),
  source_id TEXT,
  
  -- SM-2 Spaced Repetition
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  next_review_date DATE DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
  is_favorite BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_profile_id, word_lower)
);

CREATE INDEX IF NOT EXISTS idx_vocab_user ON vocabulary_items(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary_items(word_lower);
CREATE INDEX IF NOT EXISTS idx_vocab_review ON vocabulary_items(user_profile_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_vocab_mastery ON vocabulary_items(user_profile_id, mastery_level);

-- Learning Sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  session_type TEXT NOT NULL CHECK (session_type IN ('story', 'video', 'vocabulary', 'game')),
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  
  content_id TEXT,
  content_title TEXT,
  
  words_learned INTEGER DEFAULT 0,
  words_reviewed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0,
  
  device_type TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON learning_sessions(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON learning_sessions(user_profile_id, session_start);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  achievement_id TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  achievement_icon TEXT,
  
  progress INTEGER DEFAULT 0,
  target INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_profile_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_profile_id);

-- Daily Goals
CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  words_goal INTEGER DEFAULT 10,
  words_completed INTEGER DEFAULT 0,
  minutes_goal INTEGER DEFAULT 15,
  minutes_completed INTEGER DEFAULT 0,
  stories_goal INTEGER DEFAULT 1,
  stories_completed INTEGER DEFAULT 0,
  
  all_goals_met BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_profile_id, goal_date)
);

CREATE INDEX IF NOT EXISTS idx_goals_user_date ON daily_goals(user_profile_id, goal_date);

-- ============================================
-- PART 3: ADD MISSING COLUMNS TO user_progress
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
-- PART 4: CREATE MISSING JUNCTION TABLES
-- ============================================

-- Video-Topics junction
CREATE TABLE IF NOT EXISTS video_topics (
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_video_topics_topic ON video_topics(topic_id);

-- Story-Topics junction
CREATE TABLE IF NOT EXISTS story_topics (
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_story_topics_topic ON story_topics(topic_id);

-- Story Panels (normalized)
CREATE TABLE IF NOT EXISTS story_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  
  panel_index INTEGER NOT NULL,
  image_url TEXT,
  image_alt TEXT,
  
  text_en TEXT NOT NULL,
  text_vi TEXT NOT NULL,
  
  tokens_en JSONB,
  tokens_vi JSONB,
  
  audio_url_en TEXT,
  audio_url_vi TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(story_id, panel_index)
);

CREATE INDEX IF NOT EXISTS idx_story_panels_story ON story_panels(story_id);

-- Content Relations (video <-> story)
CREATE TABLE IF NOT EXISTS content_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  source_type TEXT NOT NULL CHECK (source_type IN ('video', 'story')),
  source_id TEXT NOT NULL,
  
  target_type TEXT NOT NULL CHECK (target_type IN ('video', 'story')),
  target_id TEXT NOT NULL,
  
  relation_type TEXT CHECK (relation_type IN ('sequel', 'prequel', 'related', 'same_topic', 'same_series')),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_type, source_id, target_type, target_id)
);

-- Subtitle Translations (link EN <-> VI cues)
CREATE TABLE IF NOT EXISTS subtitle_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_cue_id UUID NOT NULL REFERENCES subtitle_cues(id) ON DELETE CASCADE,
  target_cue_id UUID NOT NULL REFERENCES subtitle_cues(id) ON DELETE CASCADE,
  
  translation_type TEXT CHECK (translation_type IN ('human', 'ai', 'community')),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_cue_id, target_cue_id)
);

-- ============================================
-- PART 5: ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Vocabulary - users manage own
DROP POLICY IF EXISTS "Users manage own vocabulary" ON vocabulary_items;
CREATE POLICY "Users manage own vocabulary" ON vocabulary_items
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

-- Sessions - users manage own
DROP POLICY IF EXISTS "Users manage own sessions" ON learning_sessions;
CREATE POLICY "Users manage own sessions" ON learning_sessions
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

-- Achievements - users manage own
DROP POLICY IF EXISTS "Users manage own achievements" ON user_achievements;
CREATE POLICY "Users manage own achievements" ON user_achievements
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

-- Goals - users manage own
DROP POLICY IF EXISTS "Users manage own goals" ON daily_goals;
CREATE POLICY "Users manage own goals" ON daily_goals
  FOR ALL USING (
    auth.uid() IN (SELECT auth_id FROM user_profiles WHERE id = user_profile_id)
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'
  );

-- Public read for content tables
DROP POLICY IF EXISTS "Public read video_topics" ON video_topics;
DROP POLICY IF EXISTS "Public read story_topics" ON story_topics;
DROP POLICY IF EXISTS "Public read story_panels" ON story_panels;
DROP POLICY IF EXISTS "Public read content_relations" ON content_relations;
DROP POLICY IF EXISTS "Public read subtitle_translations" ON subtitle_translations;

CREATE POLICY "Public read video_topics" ON video_topics FOR SELECT USING (true);
CREATE POLICY "Public read story_topics" ON story_topics FOR SELECT USING (true);
CREATE POLICY "Public read story_panels" ON story_panels FOR SELECT USING (true);
CREATE POLICY "Public read content_relations" ON content_relations FOR SELECT USING (true);
CREATE POLICY "Public read subtitle_translations" ON subtitle_translations FOR SELECT USING (true);

-- Allow anon write for content (dev mode)
DROP POLICY IF EXISTS "Allow write video_topics" ON video_topics;
DROP POLICY IF EXISTS "Allow write story_topics" ON story_topics;
DROP POLICY IF EXISTS "Allow write story_panels" ON story_panels;
DROP POLICY IF EXISTS "Allow write content_relations" ON content_relations;
DROP POLICY IF EXISTS "Allow write subtitle_translations" ON subtitle_translations;

CREATE POLICY "Allow write video_topics" ON video_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write story_topics" ON story_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write story_panels" ON story_panels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write content_relations" ON content_relations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow write subtitle_translations" ON subtitle_translations FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PART 6: USEFUL VIEWS
-- ============================================

-- Videos with topics (denormalized view)
CREATE OR REPLACE VIEW videos_full AS
SELECT 
  v.*,
  COALESCE(
    ARRAY_AGG(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL), 
    ARRAY[]::TEXT[]
  ) as topic_ids,
  COALESCE(
    ARRAY_AGG(DISTINCT t.name_en) FILTER (WHERE t.id IS NOT NULL), 
    ARRAY[]::TEXT[]
  ) as topic_names
FROM videos v
LEFT JOIN video_topics vt ON v.id = vt.video_id
LEFT JOIN topics t ON vt.topic_id = t.id
WHERE v.deleted_at IS NULL
GROUP BY v.id;

-- User learning stats
CREATE OR REPLACE VIEW user_learning_stats AS
SELECT 
  up.id as user_profile_id,
  up.name,
  upr.total_stars,
  upr.current_streak,
  upr.level,
  upr.experience_points,
  COALESCE(vocab_count.count, 0) as vocabulary_count,
  COALESCE(session_count.count, 0) as session_count,
  COALESCE(achievement_count.count, 0) as achievement_count
FROM user_profiles up
LEFT JOIN user_progress upr ON up.id = upr.user_profile_id
LEFT JOIN (
  SELECT user_profile_id, COUNT(*) as count 
  FROM vocabulary_items 
  GROUP BY user_profile_id
) vocab_count ON up.id = vocab_count.user_profile_id
LEFT JOIN (
  SELECT user_profile_id, COUNT(*) as count 
  FROM learning_sessions 
  GROUP BY user_profile_id
) session_count ON up.id = session_count.user_profile_id
LEFT JOIN (
  SELECT user_profile_id, COUNT(*) as count 
  FROM user_achievements 
  WHERE completed = true
  GROUP BY user_profile_id
) achievement_count ON up.id = achievement_count.user_profile_id;

-- ============================================
-- DONE! Verify with:
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
