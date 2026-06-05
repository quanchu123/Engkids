-- Migration: farm_saves — per-user save payload for the English Farming Game.
--
-- SAFETY: This migration is IDEMPOTENT and SAFE TO RE-RUN. It uses only
-- additive / guarded statements (CREATE TABLE IF NOT EXISTS, CREATE INDEX
-- IF NOT EXISTS, ENABLE ROW LEVEL SECURITY, DROP POLICY IF EXISTS + CREATE
-- POLICY). It contains NO DROP TABLE / DROP SCHEMA / TRUNCATE / DELETE or any
-- other destructive statement, so running it on a database that already has
-- the table will not lose any data.
--
-- Run manually in the Supabase SQL editor (same as 018_ensure_vocabulary_items.sql).
-- Until this is run, the game still works for anonymous players via localStorage.

CREATE TABLE IF NOT EXISTS farm_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_id TEXT,                         -- for anonymous saves (synced later)
  payload JSONB NOT NULL,                 -- the full FarmState
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_farm_saves_profile ON farm_saves(user_profile_id);

ALTER TABLE farm_saves ENABLE ROW LEVEL SECURITY;

-- Permissive read so a logged-in client can read its own row through the API.
-- (Writes always go through the server using the service role key.)
DROP POLICY IF EXISTS "farm_saves read" ON farm_saves;
CREATE POLICY "farm_saves read" ON farm_saves
  FOR SELECT
  USING (true);

-- The service role (server-side API route) manages all writes.
DROP POLICY IF EXISTS "farm_saves service manages" ON farm_saves;
CREATE POLICY "farm_saves service manages" ON farm_saves
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
