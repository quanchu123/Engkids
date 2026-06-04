-- ============================================
-- COMICLINGUA KIDS - FULL DATABASE SETUP
-- Copy toàn bộ file này vào Supabase SQL Editor
-- ============================================

-- ============================================
-- 0. DROP OLD TABLES (if exists with wrong schema)
-- ============================================

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS user_video_progress CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS video_subtitles CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS stories CASCADE;

-- ============================================
-- 1. CORE TABLES: Videos & Subtitles
-- ============================================

-- Videos table
-- Videos are stored in DigitalOcean Spaces and played as direct MP4 via the
-- Spaces CDN. `object_key` is the path of the file inside the bucket.
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  object_key TEXT,
  duration INTEGER DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Elementary', 'Intermediate')),
  topics TEXT[] DEFAULT '{}',
  age_group TEXT CHECK (age_group IN ('3-5', '6-8', '9-12')),
  category TEXT NOT NULL DEFAULT 'video' CHECK (category IN ('video', 'music')),
  feature TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_level ON videos(level);
CREATE INDEX IF NOT EXISTS idx_videos_object_key ON videos(object_key);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_feature ON videos(feature);

-- Video subtitles table  
CREATE TABLE IF NOT EXISTS video_subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  cue_index INTEGER NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  text_en TEXT NOT NULL,
  text_vi TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtitles_video ON video_subtitles(video_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subtitles_unique ON video_subtitles(video_id, cue_index);

-- ============================================
-- 2. STORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Elementary', 'Intermediate')),
  topics TEXT[] DEFAULT '{}',
  cover_image TEXT,
  estimated_minutes INTEGER DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT false,
  panels JSONB NOT NULL DEFAULT '[]',
  vocabulary JSONB NOT NULL DEFAULT '[]',
  games JSONB NOT NULL DEFAULT '{"match": [], "fill_blank": []}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_level ON stories(level);
CREATE INDEX IF NOT EXISTS idx_stories_published_created ON stories(published, created_at DESC);

-- ============================================
-- 3. ADMIN USERS (for content management)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- ============================================
-- 4. ADMIN SESSIONS (JWT refresh tokens)
-- ============================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ============================================
-- 5. USER PROFILES (for progress tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Auth provider ID (from Supabase Auth)
  auth_id UUID UNIQUE,
  -- For anonymous users (device fingerprint)
  device_id TEXT UNIQUE,
  -- Basic info
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  -- Account type for future premium feature
  account_type TEXT NOT NULL DEFAULT 'free' CHECK (account_type IN ('free', 'premium', 'trial')),
  premium_until TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth ON user_profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_device ON user_profiles(device_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_type ON user_profiles(account_type);

-- ============================================
-- 6. USER PROGRESS (learning data)
-- ============================================

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  -- Gamification
  total_stars INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  -- Learning data
  saved_words TEXT[] DEFAULT '{}',
  stories_progress JSONB DEFAULT '{}',
  videos_progress JSONB DEFAULT '{}',
  game_scores JSONB DEFAULT '[]',
  -- Settings
  settings JSONB DEFAULT '{"showVietnamese": true, "fontSize": "medium", "autoPlayAudio": false}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_progress_profile ON user_progress(user_profile_id);

-- ============================================
-- 7. USER VIDEO PROGRESS (watch history)
-- ============================================

CREATE TABLE IF NOT EXISTS user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watch_time INTEGER DEFAULT 0,
  last_position INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_profile_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_progress_user ON user_video_progress(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video ON user_video_progress(video_id);

-- ============================================
-- 8. AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS stories_updated_at ON stories;
CREATE TRIGGER stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_progress_updated_at ON user_progress;
CREATE TRIGGER user_progress_updated_at BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_video_progress_updated_at ON user_video_progress;
CREATE TRIGGER user_video_progress_updated_at BEFORE UPDATE ON user_video_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. RLS POLICIES
-- ============================================

-- VIDEOS: Everyone can read, only service_role can write
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON videos;
CREATE POLICY "Videos are viewable by everyone" ON videos
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Service role manages videos" ON videos;
CREATE POLICY "Service role manages videos" ON videos
  FOR ALL USING (auth.role() = 'service_role');

-- SUBTITLES: Everyone can read
DROP POLICY IF EXISTS "Subtitles are viewable by everyone" ON video_subtitles;
CREATE POLICY "Subtitles are viewable by everyone" ON video_subtitles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages subtitles" ON video_subtitles;
CREATE POLICY "Service role manages subtitles" ON video_subtitles
  FOR ALL USING (auth.role() = 'service_role');

-- STORIES: Everyone can read published stories
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
DROP POLICY IF EXISTS "Published stories are viewable by everyone" ON stories;
CREATE POLICY "Published stories are viewable by everyone" ON stories
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "Service role manages stories" ON stories;
CREATE POLICY "Service role manages stories" ON stories
  FOR ALL USING (auth.role() = 'service_role');

-- ADMIN: Only service_role can access
DROP POLICY IF EXISTS "Service role only for admin_users" ON admin_users;
CREATE POLICY "Service role only for admin_users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only for admin_sessions" ON admin_sessions;
CREATE POLICY "Service role only for admin_sessions" ON admin_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- USER PROFILES: Authenticated users can manage their own
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
CREATE POLICY "Users can view profiles" ON user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert profile" ON user_profiles;
CREATE POLICY "Users can insert profile" ON user_profiles
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (
    auth.uid() = auth_id OR 
    auth.role() = 'service_role'
  );

-- USER PROGRESS: Users manage their own
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert progress" ON user_progress;
CREATE POLICY "Users can insert progress" ON user_progress
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (true);

-- VIDEO PROGRESS: Users manage their own
DROP POLICY IF EXISTS "Users can manage video progress" ON user_video_progress;
CREATE POLICY "Users can manage video progress" ON user_video_progress
  FOR ALL USING (true);

-- ============================================
-- 11. HELPER FUNCTIONS
-- ============================================

-- Cleanup expired admin sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Get or create user profile by device_id
CREATE OR REPLACE FUNCTION get_or_create_user_profile(p_device_id TEXT)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Try to find existing
  SELECT id INTO v_profile_id FROM user_profiles WHERE device_id = p_device_id;
  
  -- Create if not exists
  IF v_profile_id IS NULL THEN
    INSERT INTO user_profiles (device_id) VALUES (p_device_id)
    RETURNING id INTO v_profile_id;
    
    -- Also create empty progress record
    INSERT INTO user_progress (user_profile_id) VALUES (v_profile_id);
  END IF;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. CREATE DEFAULT ADMIN ACCOUNT
-- ============================================

-- Insert default admin (password: Admin123!)
-- Password hash generated with bcrypt cost 12
INSERT INTO admin_users (email, password_hash, name, role)
VALUES (
  'admin@comiclingua.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIwnoHxT4u',
  'Super Admin',
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 13. VERIFY SETUP
-- ============================================

SELECT 
  'Database setup complete!' as status,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables;

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Show created admin
SELECT 
  'Admin account created!' as message,
  email,
  name,
  role,
  'chinh123' as password
FROM admin_users
WHERE email = 'admin@comiclingua.com';
