-- 023: Static asset manifest and richer trusted-source metadata.

ALTER TABLE IF EXISTS curriculum_import_sources
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT,
  ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'licensed',
  ADD COLUMN IF NOT EXISTS trust_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (trust_status IN ('pending', 'trusted', 'blocked'));

ALTER TABLE IF EXISTS curriculum_import_staging
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT,
  ADD COLUMN IF NOT EXISTS source_hash TEXT;

ALTER TABLE IF EXISTS word_bank_items
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT;

ALTER TABLE IF EXISTS assessment_items
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT;

ALTER TABLE IF EXISTS curriculum_units
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT;

ALTER TABLE IF EXISTS lessons
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT;

ALTER TABLE IF EXISTS lesson_steps
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT;

ALTER TABLE IF EXISTS lesson_assets
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS attribution TEXT,
  ADD COLUMN IF NOT EXISTS license_name TEXT,
  ADD COLUMN IF NOT EXISTS license_url TEXT;

CREATE TABLE IF NOT EXISTS static_asset_manifest (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  original_bytes BIGINT NOT NULL DEFAULT 0,
  optimized_bytes BIGINT,
  sha256 TEXT NOT NULL,
  derivative_format TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_static_asset_manifest_active ON static_asset_manifest(active, source_path);
CREATE INDEX IF NOT EXISTS idx_curriculum_import_sources_trust ON curriculum_import_sources(trust_status, approved);
CREATE INDEX IF NOT EXISTS idx_curriculum_import_staging_review ON curriculum_import_staging(review_status, source_id);

DROP TRIGGER IF EXISTS static_asset_manifest_updated_at ON static_asset_manifest;
CREATE TRIGGER static_asset_manifest_updated_at BEFORE UPDATE ON static_asset_manifest
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE static_asset_manifest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Static asset manifest readable by everyone" ON static_asset_manifest;
CREATE POLICY "Static asset manifest readable by everyone" ON static_asset_manifest
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role manages static asset manifest" ON static_asset_manifest;
CREATE POLICY "Service role manages static asset manifest" ON static_asset_manifest
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
