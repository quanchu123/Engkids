-- ============================================
-- 014: Add a "feature" grouping to videos
-- ============================================
-- `feature` is a free-text collection/theme label used to group videos within
-- the Videos and Music sections (e.g. "Phonics", "Bài hát thiếu nhi").
-- When empty, the app treats the video as belonging to "Tổng Hợp" (General).
-- ============================================

ALTER TABLE videos ADD COLUMN IF NOT EXISTS feature TEXT;

COMMENT ON COLUMN videos.feature IS 'Optional grouping/theme label for the video. Empty = "Tổng Hợp".';

CREATE INDEX IF NOT EXISTS idx_videos_feature ON videos(feature);
