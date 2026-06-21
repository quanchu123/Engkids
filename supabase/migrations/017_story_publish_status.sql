-- Add draft/publish control for stories.
-- Existing stories stay public; new stories are drafts until an admin publishes them.

ALTER TABLE stories
ADD COLUMN IF NOT EXISTS published BOOLEAN;

UPDATE stories
SET published = true
WHERE published IS NULL;

ALTER TABLE stories
ALTER COLUMN published SET DEFAULT false,
ALTER COLUMN published SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_stories_published_created
ON stories(published, created_at DESC);

DROP POLICY IF EXISTS "Allow public read" ON stories;
DROP POLICY IF EXISTS "Allow anon read" ON stories;
DROP POLICY IF EXISTS "Allow anon insert" ON stories;
DROP POLICY IF EXISTS "Allow anon update" ON stories;
DROP POLICY IF EXISTS "Allow anon delete" ON stories;
DROP POLICY IF EXISTS "Allow authenticated insert" ON stories;
DROP POLICY IF EXISTS "Allow authenticated update" ON stories;
DROP POLICY IF EXISTS "Allow authenticated delete" ON stories;
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
DROP POLICY IF EXISTS "Published stories are viewable by everyone" ON stories;

CREATE POLICY "Published stories are viewable by everyone" ON stories
  FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS "Service role manages stories" ON stories;
CREATE POLICY "Service role manages stories" ON stories
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
