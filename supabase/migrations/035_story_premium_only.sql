-- Premium-only flag for stories (default free/public).
-- Free users may still list cover/title; app layer gates full reader content.

ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS premium_only BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_stories_published_premium
  ON stories (published, premium_only);

COMMENT ON COLUMN stories.premium_only IS
  'When true, only premium/admin users may read full panels; free users see locked cards.';
