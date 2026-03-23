-- ============================================
-- 008_ENHANCED_SCHEMA.sql
-- Tối ưu database cho bilingual subtitles & scalability
-- Run in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TOPICS/CATEGORIES TABLE (Normalize topics)
-- ============================================

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY, -- 'animals', 'food', etc.
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  icon TEXT, -- emoji: '🐾', '🍕'
  color TEXT, -- hex color for UI
  description_en TEXT,
  description_vi TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default topics
INSERT INTO topics (id, name_en, name_vi, icon, color, sort_order) VALUES
  ('animals', 'Animals', 'Động vật', '🐾', '#f97316', 1),
  ('food', 'Food', 'Đồ ăn', '🍕', '#ec4899', 2),
  ('nature', 'Nature', 'Thiên nhiên', '🌿', '#22c55e', 3),
  ('family', 'Family', 'Gia đình', '👨‍👩‍👧', '#ec4899', 4),
  ('school', 'School', 'Trường học', '📚', '#3b82f6', 5),
  ('adventure', 'Adventure', 'Phiêu lưu', '🚀', '#a855f7', 6),
  ('friendship', 'Friendship', 'Tình bạn', '💕', '#ec4899', 7),
  ('science', 'Science', 'Khoa học', '🔬', '#3b82f6', 8),
  ('daily-life', 'Daily Life', 'Sinh hoạt', '☀️', '#f97316', 9),
  ('history', 'History', 'Lịch sử', '🏛️', '#eab308', 10),
  ('colors', 'Colors', 'Màu sắc', '🎨', '#ec4899', 11),
  ('numbers', 'Numbers', 'Số đếm', '🔢', '#3b82f6', 12),
  ('shapes', 'Shapes', 'Hình dạng', '⭐', '#a855f7', 13),
  ('transportation', 'Transportation', 'Giao thông', '🚗', '#f97316', 14),
  ('weather', 'Weather', 'Thời tiết', '🌤️', '#22c55e', 15)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_vi = EXCLUDED.name_vi,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- ============================================
-- 2. LANGUAGES TABLE (Multi-language support)
-- ============================================

CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY, -- 'en', 'vi', 'ja', 'ko'
  name TEXT NOT NULL,
  native_name TEXT NOT NULL, -- 'English', 'Tiếng Việt'
  flag_emoji TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO languages (code, name, native_name, flag_emoji, sort_order) VALUES
  ('en', 'English', 'English', '🇬🇧', 1),
  ('vi', 'Vietnamese', 'Tiếng Việt', '🇻🇳', 2),
  ('ja', 'Japanese', '日本語', '🇯🇵', 3),
  ('ko', 'Korean', '한국어', '🇰🇷', 4),
  ('zh', 'Chinese', '中文', '🇨🇳', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. SUBTITLE_TRACKS TABLE (Multi-language subtitles)
-- ============================================

CREATE TABLE IF NOT EXISTS subtitle_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL REFERENCES languages(code),
  
  -- Track metadata
  label TEXT, -- "English", "Vietnamese", "Auto-generated"
  is_primary BOOLEAN DEFAULT false,
  is_auto_generated BOOLEAN DEFAULT false,
  
  -- Stats
  cue_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(video_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_video ON subtitle_tracks(video_id);
CREATE INDEX IF NOT EXISTS idx_subtitle_tracks_language ON subtitle_tracks(language_code);

-- ============================================
-- 4. SUBTITLE_CUES TABLE (Individual subtitle lines)
-- ============================================

CREATE TABLE IF NOT EXISTS subtitle_cues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES subtitle_tracks(id) ON DELETE CASCADE,
  
  -- Timing (stored as milliseconds for precision)
  cue_index INTEGER NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  
  -- Content
  text TEXT NOT NULL,
  
  -- Word-level timing for karaoke effect
  -- Format: [{"word": "Hello", "start_ms": 1000, "end_ms": 1500}, ...]
  word_timings JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(track_id, cue_index)
);

CREATE INDEX IF NOT EXISTS idx_subtitle_cues_track ON subtitle_cues(track_id);
CREATE INDEX IF NOT EXISTS idx_subtitle_cues_timing ON subtitle_cues(track_id, start_ms);

-- ============================================
-- 5. SUBTITLE_TRANSLATIONS TABLE (Link EN ↔ VI cues)
-- ============================================

CREATE TABLE IF NOT EXISTS subtitle_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_cue_id UUID NOT NULL REFERENCES subtitle_cues(id) ON DELETE CASCADE,
  target_cue_id UUID NOT NULL REFERENCES subtitle_cues(id) ON DELETE CASCADE,
  
  -- Translation quality
  translation_type TEXT CHECK (translation_type IN ('human', 'ai', 'community')),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_cue_id, target_cue_id)
);

CREATE INDEX IF NOT EXISTS idx_translations_source ON subtitle_translations(source_cue_id);
CREATE INDEX IF NOT EXISTS idx_translations_target ON subtitle_translations(target_cue_id);

-- ============================================
-- 6. VIDEO_TOPICS JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS video_topics (
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_video_topics_topic ON video_topics(topic_id);

CREATE TABLE IF NOT EXISTS story_topics (
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_story_topics_topic ON story_topics(topic_id);

-- ============================================
-- 7. STORY_PANELS TABLE (Normalize panels)
-- ============================================

CREATE TABLE IF NOT EXISTS story_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  
  panel_index INTEGER NOT NULL,
  image_url TEXT,
  image_alt TEXT,
  
  -- Text content (bilingual)
  text_en TEXT NOT NULL,
  text_vi TEXT NOT NULL,
  
  -- Parsed tokens for interactive learning
  -- Format: [{"display": "Hello", "lemma": "hello", "pos": "intj"}]
  tokens_en JSONB,
  tokens_vi JSONB,
  
  -- Audio URLs (TTS or recorded)
  audio_url_en TEXT,
  audio_url_vi TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(story_id, panel_index)
);

CREATE INDEX IF NOT EXISTS idx_story_panels_story ON story_panels(story_id);

-- ============================================
-- 8. CONTENT_RELATIONS (Video ↔ Story links)
-- ============================================

CREATE TABLE IF NOT EXISTS content_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source content
  source_type TEXT NOT NULL CHECK (source_type IN ('video', 'story')),
  source_id TEXT NOT NULL,
  
  -- Related content  
  target_type TEXT NOT NULL CHECK (target_type IN ('video', 'story')),
  target_id TEXT NOT NULL,
  
  -- Relation metadata
  relation_type TEXT CHECK (relation_type IN ('sequel', 'prequel', 'related', 'same_topic', 'same_series')),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_content_relations_source ON content_relations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_content_relations_target ON content_relations(target_type, target_id);

-- ============================================
-- 9. ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add primary language to videos
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'en';

-- Add difficulty score (1-10)
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS difficulty_score INTEGER;

-- Add series/collection support for videos
ALTER TABLE videos
ADD COLUMN IF NOT EXISTS series_id TEXT,
ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Add series/collection support for stories
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS series_id TEXT,
ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Add word-level timing to existing video_subtitles (quick fix)
ALTER TABLE video_subtitles
ADD COLUMN IF NOT EXISTS word_timings_en JSONB,
ADD COLUMN IF NOT EXISTS word_timings_vi JSONB;

-- ============================================
-- 10. HELPER VIEWS
-- ============================================

-- View: Videos with subtitle counts
CREATE OR REPLACE VIEW videos_with_subtitles AS
SELECT 
  v.*,
  COALESCE(st.subtitle_count, 0) as subtitle_track_count,
  COALESCE(st.languages, ARRAY[]::TEXT[]) as available_languages
FROM videos v
LEFT JOIN (
  SELECT 
    video_id,
    COUNT(*) as subtitle_count,
    ARRAY_AGG(language_code) as languages
  FROM subtitle_tracks
  GROUP BY video_id
) st ON v.id = st.video_id
WHERE v.deleted_at IS NULL;

-- View: Bilingual subtitle pairs (for easy querying)
CREATE OR REPLACE VIEW bilingual_subtitles AS
SELECT 
  v.id as video_id,
  v.title,
  en_cue.cue_index,
  en_cue.start_ms,
  en_cue.end_ms,
  en_cue.text as text_en,
  vi_cue.text as text_vi,
  en_cue.word_timings as word_timings_en,
  vi_cue.word_timings as word_timings_vi
FROM videos v
JOIN subtitle_tracks en_track ON v.id = en_track.video_id AND en_track.language_code = 'en'
JOIN subtitle_cues en_cue ON en_track.id = en_cue.track_id
LEFT JOIN subtitle_translations st ON en_cue.id = st.source_cue_id
LEFT JOIN subtitle_cues vi_cue ON st.target_cue_id = vi_cue.id
WHERE v.deleted_at IS NULL;

-- View: Topics with content count
CREATE OR REPLACE VIEW topics_with_counts AS
SELECT 
  t.*,
  COALESCE(vc.video_count, 0) as video_count,
  COALESCE(sc.story_count, 0) as story_count
FROM topics t
LEFT JOIN (
  SELECT topic_id, COUNT(*) as video_count
  FROM video_topics vt
  JOIN videos v ON vt.video_id = v.id AND v.deleted_at IS NULL
  GROUP BY topic_id
) vc ON t.id = vc.topic_id
LEFT JOIN (
  SELECT topic_id, COUNT(*) as story_count
  FROM story_topics
  GROUP BY topic_id
) sc ON t.id = sc.topic_id
WHERE t.is_active = true
ORDER BY t.sort_order;

-- ============================================
-- 11. ENABLE RLS
-- ============================================

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtitle_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_relations ENABLE ROW LEVEL SECURITY;

-- Public read for content tables
CREATE POLICY "Public read topics" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read languages" ON languages FOR SELECT USING (true);
CREATE POLICY "Public read subtitle_tracks" ON subtitle_tracks FOR SELECT USING (true);
CREATE POLICY "Public read subtitle_cues" ON subtitle_cues FOR SELECT USING (true);
CREATE POLICY "Public read subtitle_translations" ON subtitle_translations FOR SELECT USING (true);
CREATE POLICY "Public read video_topics" ON video_topics FOR SELECT USING (true);
CREATE POLICY "Public read story_topics" ON story_topics FOR SELECT USING (true);
CREATE POLICY "Public read story_panels" ON story_panels FOR SELECT USING (true);
CREATE POLICY "Public read content_relations" ON content_relations FOR SELECT USING (true);

-- Allow anon insert/update for now (dev mode - tighten later)
CREATE POLICY "Allow anon write topics" ON topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write languages" ON languages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write subtitle_tracks" ON subtitle_tracks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write subtitle_cues" ON subtitle_cues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write subtitle_translations" ON subtitle_translations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write video_topics" ON video_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write story_topics" ON story_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write story_panels" ON story_panels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write content_relations" ON content_relations FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 12. DATA MIGRATION (Optional - run separately)
-- ============================================

-- Migrate existing video_subtitles to new structure
-- Uncomment and run after creating tables

/*
-- Step 1: Create EN subtitle tracks for existing videos
INSERT INTO subtitle_tracks (video_id, language_code, label, is_primary)
SELECT DISTINCT video_id, 'en', 'English', true
FROM video_subtitles
ON CONFLICT (video_id, language_code) DO NOTHING;

-- Step 2: Create VI subtitle tracks for existing videos
INSERT INTO subtitle_tracks (video_id, language_code, label, is_primary)
SELECT DISTINCT video_id, 'vi', 'Vietnamese', false
FROM video_subtitles
ON CONFLICT (video_id, language_code) DO NOTHING;

-- Step 3: Migrate EN cues
INSERT INTO subtitle_cues (track_id, cue_index, start_ms, end_ms, text)
SELECT 
  st.id,
  vs.cue_index,
  CAST(vs.start_time * 1000 AS INTEGER),
  CAST(vs.end_time * 1000 AS INTEGER),
  vs.text_en
FROM video_subtitles vs
JOIN subtitle_tracks st ON vs.video_id = st.video_id AND st.language_code = 'en'
ON CONFLICT (track_id, cue_index) DO NOTHING;

-- Step 4: Migrate VI cues  
INSERT INTO subtitle_cues (track_id, cue_index, start_ms, end_ms, text)
SELECT 
  st.id,
  vs.cue_index,
  CAST(vs.start_time * 1000 AS INTEGER),
  CAST(vs.end_time * 1000 AS INTEGER),
  vs.text_vi
FROM video_subtitles vs
JOIN subtitle_tracks st ON vs.video_id = st.video_id AND st.language_code = 'vi'
ON CONFLICT (track_id, cue_index) DO NOTHING;

-- Step 5: Create translation links
INSERT INTO subtitle_translations (source_cue_id, target_cue_id, translation_type)
SELECT 
  en_cue.id,
  vi_cue.id,
  'human'
FROM video_subtitles vs
JOIN subtitle_tracks en_track ON vs.video_id = en_track.video_id AND en_track.language_code = 'en'
JOIN subtitle_cues en_cue ON en_track.id = en_cue.track_id AND vs.cue_index = en_cue.cue_index
JOIN subtitle_tracks vi_track ON vs.video_id = vi_track.video_id AND vi_track.language_code = 'vi'
JOIN subtitle_cues vi_cue ON vi_track.id = vi_cue.track_id AND vs.cue_index = vi_cue.cue_index
ON CONFLICT (source_cue_id, target_cue_id) DO NOTHING;

-- Step 6: Update cue counts
UPDATE subtitle_tracks st
SET cue_count = (
  SELECT COUNT(*) FROM subtitle_cues WHERE track_id = st.id
);
*/

-- ============================================
-- Done! 🎉
-- ============================================
