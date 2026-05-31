-- ============================================
-- 016: Site settings (key/value)
-- ============================================
-- Generic key/value store for global site settings. First use: background
-- music for the home page (object key + enabled flag + volume).
-- ============================================

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE site_settings IS 'Global site settings as key/value JSON.';

DROP TRIGGER IF EXISTS site_settings_updated_at ON site_settings;
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: public can read, only service role can write.
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site settings readable by everyone" ON site_settings;
CREATE POLICY "Site settings readable by everyone" ON site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages site settings" ON site_settings;
CREATE POLICY "Service role manages site settings" ON site_settings
  FOR ALL USING (auth.role() = 'service_role');
