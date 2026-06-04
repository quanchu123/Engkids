-- ============================================
-- 013: Move video storage to the DigitalOcean droplet disk
-- ============================================
-- Videos are now uploaded to and served from the droplet's local disk
-- (public/uploads) and played as direct MP4. This migration:
--   1. Removes all old video data (Bunny.net / YouTube). The app now relies
--      only on self-uploaded videos stored on the droplet.
--   2. Replaces the Bunny-specific columns with a single `object_key`
--      (the file name stored under public/uploads).
--
-- NOTE: This is destructive for the `videos` table only. Stories, quizzes,
--       admin users and progress are kept.
-- ============================================

-- 1. Wipe old video data (Bunny references are no longer playable).
DELETE FROM video_subtitles;
DELETE FROM videos;

-- 2. Add the object key (file name of the video on disk).
ALTER TABLE videos ADD COLUMN IF NOT EXISTS object_key TEXT;

COMMENT ON COLUMN videos.object_key IS 'File name of the video stored on the droplet under public/uploads (e.g. <uuid>.mp4).';

-- 3. Drop Bunny.net specific columns and constraints.
DROP INDEX IF EXISTS idx_videos_bunny;
ALTER TABLE videos DROP COLUMN IF EXISTS bunny_video_id;
ALTER TABLE videos DROP COLUMN IF EXISTS hls_url;
ALTER TABLE videos DROP COLUMN IF EXISTS dash_url;

-- 4. Make sure the quiz column still exists (kept from migration 012).
ALTER TABLE videos ADD COLUMN IF NOT EXISTS quiz JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 5. Helpful index for resolving objects.
CREATE INDEX IF NOT EXISTS idx_videos_object_key ON videos(object_key);
