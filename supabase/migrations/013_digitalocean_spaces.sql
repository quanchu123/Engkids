-- ============================================
-- 013: Migrate video storage to DigitalOcean Spaces
-- ============================================
-- Videos are now stored in DigitalOcean Spaces (S3-compatible) and played as
-- direct MP4 via the Spaces CDN. This migration:
--   1. Removes all old video data (Bunny.net / YouTube / local). The app now
--      relies only on self-uploaded videos in Spaces.
--   2. Replaces the Bunny-specific columns with a single `object_key`.
--
-- NOTE: This is destructive for the `videos` table only. Stories, quizzes
--       (videos.quiz is recreated below), admin users and progress are kept.
-- ============================================

-- 1. Wipe old video data (Bunny references are no longer playable).
DELETE FROM video_subtitles;
DELETE FROM videos;

-- 2. Add the Spaces object key (path of the file inside the bucket).
ALTER TABLE videos ADD COLUMN IF NOT EXISTS object_key TEXT;

COMMENT ON COLUMN videos.object_key IS 'Object key of the video file in the DigitalOcean Spaces bucket (e.g. videos/<uuid>.mp4).';

-- 3. Drop Bunny.net specific columns and constraints.
--    bunny_video_id was NOT NULL UNIQUE; remove it along with the HLS/DASH URLs.
DROP INDEX IF EXISTS idx_videos_bunny;
ALTER TABLE videos DROP COLUMN IF EXISTS bunny_video_id;
ALTER TABLE videos DROP COLUMN IF EXISTS hls_url;
ALTER TABLE videos DROP COLUMN IF EXISTS dash_url;

-- 4. Make sure the quiz column still exists (kept from migration 012).
ALTER TABLE videos ADD COLUMN IF NOT EXISTS quiz JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 5. Helpful index for resolving objects.
CREATE INDEX IF NOT EXISTS idx_videos_object_key ON videos(object_key);
