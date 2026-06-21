-- 024: Open-corpus staging tables for large A2-C1 curriculum imports.

CREATE TABLE IF NOT EXISTS source_sentence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL REFERENCES curriculum_import_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'eng',
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  level TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  topic TEXT NOT NULL DEFAULT 'general',
  sentence_length INTEGER NOT NULL DEFAULT 0 CHECK (sentence_length >= 0),
  source_url TEXT NOT NULL DEFAULT '',
  attribution TEXT NOT NULL DEFAULT '',
  license_name TEXT NOT NULL DEFAULT '',
  license_url TEXT NOT NULL DEFAULT '',
  source_hash TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'imported')),
  safety_status TEXT NOT NULL DEFAULT 'pending' CHECK (safety_status IN ('pending', 'safe', 'blocked')),
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, external_id),
  UNIQUE (source_hash)
);

CREATE TABLE IF NOT EXISTS source_lexical_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL REFERENCES curriculum_import_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  lemma TEXT NOT NULL,
  lemma_lower TEXT NOT NULL,
  part_of_speech TEXT NOT NULL DEFAULT '',
  definition TEXT NOT NULL DEFAULT '',
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  example TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  topic TEXT NOT NULL DEFAULT 'general',
  source_url TEXT NOT NULL DEFAULT '',
  attribution TEXT NOT NULL DEFAULT '',
  license_name TEXT NOT NULL DEFAULT '',
  license_url TEXT NOT NULL DEFAULT '',
  source_hash TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'imported')),
  safety_status TEXT NOT NULL DEFAULT 'pending' CHECK (safety_status IN ('pending', 'safe', 'blocked')),
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, external_id),
  UNIQUE (lemma_lower),
  UNIQUE (source_hash)
);

CREATE TABLE IF NOT EXISTS source_reading_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL REFERENCES curriculum_import_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  level TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  topic TEXT NOT NULL DEFAULT 'reading',
  word_count INTEGER NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  source_url TEXT NOT NULL DEFAULT '',
  attribution TEXT NOT NULL DEFAULT '',
  license_name TEXT NOT NULL DEFAULT '',
  license_url TEXT NOT NULL DEFAULT '',
  source_hash TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'imported')),
  safety_status TEXT NOT NULL DEFAULT 'pending' CHECK (safety_status IN ('pending', 'safe', 'blocked')),
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, external_id),
  UNIQUE (source_hash)
);

CREATE INDEX IF NOT EXISTS idx_source_sentence_items_level ON source_sentence_items(level, review_status, safety_status);
CREATE INDEX IF NOT EXISTS idx_source_sentence_items_source ON source_sentence_items(source_id, review_status);
CREATE INDEX IF NOT EXISTS idx_source_lexical_items_level ON source_lexical_items(level, review_status, safety_status);
CREATE INDEX IF NOT EXISTS idx_source_lexical_items_topic ON source_lexical_items(topic, level);
CREATE INDEX IF NOT EXISTS idx_source_reading_passages_level ON source_reading_passages(level, review_status, safety_status);

ALTER TABLE source_sentence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_lexical_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_reading_passages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages source sentence items" ON source_sentence_items;
CREATE POLICY "Service role manages source sentence items" ON source_sentence_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages source lexical items" ON source_lexical_items;
CREATE POLICY "Service role manages source lexical items" ON source_lexical_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages source reading passages" ON source_reading_passages;
CREATE POLICY "Service role manages source reading passages" ON source_reading_passages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
