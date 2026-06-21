-- ============================================
-- 015: Editable game content
-- ============================================
-- Lets admins override the built-in question/word data for each game.
-- One row per game type; `data` holds a JSONB payload matching that game's
-- shape. If a game has no row, the app falls back to its built-in defaults.
-- ============================================

CREATE TABLE IF NOT EXISTS game_content (
  game_type TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE game_content IS 'Admin-editable content per game. Empty/missing = use built-in defaults.';

-- Keep updated_at fresh on change (reuses the shared trigger function).
DROP TRIGGER IF EXISTS game_content_updated_at ON game_content;
CREATE TRIGGER game_content_updated_at BEFORE UPDATE ON game_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: public can read, only service role can write.
ALTER TABLE game_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Game content readable by everyone" ON game_content;
CREATE POLICY "Game content readable by everyone" ON game_content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages game content" ON game_content;
CREATE POLICY "Service role manages game content" ON game_content
  FOR ALL USING (auth.role() = 'service_role');
