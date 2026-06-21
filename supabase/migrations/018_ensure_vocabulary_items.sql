-- Ensure account-scoped saved vocabulary exists.
-- Some deployed databases have user_progress but are missing this table.

CREATE TABLE IF NOT EXISTS vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  word_lower TEXT GENERATED ALWAYS AS (LOWER(word)) STORED,
  pronunciation TEXT,
  meaning_vi TEXT NOT NULL,
  meaning_en TEXT,
  part_of_speech TEXT CHECK (part_of_speech IN ('noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'other')),
  example_sentence TEXT,
  example_sentence_vi TEXT,
  source_type TEXT CHECK (source_type IN ('story', 'video', 'manual')),
  source_id TEXT,
  review_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  next_review_date DATE DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMPTZ,
  mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_profile_id, word_lower)
);

CREATE INDEX IF NOT EXISTS idx_vocab_user ON vocabulary_items(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_vocab_word ON vocabulary_items(word_lower);
CREATE INDEX IF NOT EXISTS idx_vocab_review ON vocabulary_items(user_profile_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_vocab_mastery ON vocabulary_items(user_profile_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocab_favorite ON vocabulary_items(user_profile_id, is_favorite);

ALTER TABLE vocabulary_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own vocabulary" ON vocabulary_items;
CREATE POLICY "Users manage own vocabulary" ON vocabulary_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = vocabulary_items.user_profile_id
        AND user_profiles.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = vocabulary_items.user_profile_id
        AND user_profiles.auth_id = auth.uid()
    )
  );
