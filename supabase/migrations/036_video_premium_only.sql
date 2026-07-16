-- Premium-only flag for videos/music catalog items.

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS premium_only BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_videos_premium_only
  ON videos (premium_only)
  WHERE premium_only = true;

COMMENT ON COLUMN videos.premium_only IS
  'When true, only premium/admin users may open the full player; free users see locked card/CTA.';
