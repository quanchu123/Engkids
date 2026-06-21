-- 025: CEFR standards metadata, learner events, and quality gates.

ALTER TABLE IF EXISTS word_bank_items
  ADD COLUMN IF NOT EXISTS cefr_level TEXT,
  ADD COLUMN IF NOT EXISTS can_do_statement TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_score NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (difficulty_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS age_band TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'needs-review'
    CHECK (quality_status IN ('approved', 'needs-review', 'blocked')),
  ADD COLUMN IF NOT EXISTS cefr_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS safety_status TEXT NOT NULL DEFAULT 'safe'
    CHECK (safety_status IN ('safe', 'needs-review', 'blocked'));

ALTER TABLE IF EXISTS assessment_items
  ADD COLUMN IF NOT EXISTS cefr_level TEXT,
  ADD COLUMN IF NOT EXISTS can_do_statement TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_score NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (difficulty_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS age_band TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'needs-review'
    CHECK (quality_status IN ('approved', 'needs-review', 'blocked')),
  ADD COLUMN IF NOT EXISTS cefr_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS safety_status TEXT NOT NULL DEFAULT 'safe'
    CHECK (safety_status IN ('safe', 'needs-review', 'blocked'));

ALTER TABLE IF EXISTS curriculum_units
  ADD COLUMN IF NOT EXISTS cefr_level TEXT,
  ADD COLUMN IF NOT EXISTS can_do_statement TEXT,
  ADD COLUMN IF NOT EXISTS difficulty_score NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (difficulty_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS age_band TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'needs-review'
    CHECK (quality_status IN ('approved', 'needs-review', 'blocked')),
  ADD COLUMN IF NOT EXISTS cefr_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS safety_status TEXT NOT NULL DEFAULT 'safe'
    CHECK (safety_status IN ('safe', 'needs-review', 'blocked'));

ALTER TABLE IF EXISTS lessons
  ADD COLUMN IF NOT EXISTS cefr_level TEXT,
  ADD COLUMN IF NOT EXISTS can_do_statement TEXT,
  ADD COLUMN IF NOT EXISTS expected_output TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rubric JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS learning_mode TEXT NOT NULL DEFAULT 'kid'
    CHECK (learning_mode IN ('kid', 'teen')),
  ADD COLUMN IF NOT EXISTS difficulty_score NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (difficulty_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS age_band TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'needs-review'
    CHECK (quality_status IN ('approved', 'needs-review', 'blocked')),
  ADD COLUMN IF NOT EXISTS cefr_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS safety_status TEXT NOT NULL DEFAULT 'safe'
    CHECK (safety_status IN ('safe', 'needs-review', 'blocked'));

ALTER TABLE IF EXISTS lesson_steps
  ADD COLUMN IF NOT EXISTS cefr_skill TEXT,
  ADD COLUMN IF NOT EXISTS can_do_statement TEXT,
  ADD COLUMN IF NOT EXISTS expected_output TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'needs-review'
    CHECK (quality_status IN ('approved', 'needs-review', 'blocked')),
  ADD COLUMN IF NOT EXISTS safety_status TEXT NOT NULL DEFAULT 'safe'
    CHECK (safety_status IN ('safe', 'needs-review', 'blocked'));

CREATE TABLE IF NOT EXISTS lesson_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  step_id UUID REFERENCES lesson_steps(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('step-complete', 'quiz-result', 'output-submit', 'reflection', 'reward')),
  skill_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_percent NUMERIC(5,2) CHECK (score_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_events_profile ON lesson_events(user_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_events_lesson ON lesson_events(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_standards ON lessons(stage_id, quality_status, safety_status, learning_mode);
CREATE INDEX IF NOT EXISTS idx_word_bank_items_standards ON word_bank_items(level, quality_status, safety_status);
CREATE INDEX IF NOT EXISTS idx_assessment_items_standards ON assessment_items(stage_id, quality_status, safety_status);

UPDATE word_bank_items
SET cefr_level = COALESCE(NULLIF(cefr_level, ''), level),
    can_do_statement = COALESCE(NULLIF(can_do_statement, ''), 'Use this word in a level-appropriate sentence.'),
    difficulty_score = CASE level WHEN 'a2-key' THEN 2.5 WHEN 'b1-preliminary' THEN 4.5 WHEN 'b2-first' THEN 6.5 WHEN 'c1-advanced' THEN 8 ELSE 2 END,
    age_band = CASE level WHEN 'a2-key' THEN '9-13' WHEN 'b1-preliminary' THEN '11-15' WHEN 'b2-first' THEN '13-16' WHEN 'c1-advanced' THEN '14+' ELSE '9+' END,
    quality_status = CASE WHEN COALESCE(review_status, 'approved') = 'approved' THEN 'approved' ELSE 'needs-review' END,
    safety_status = 'safe',
    cefr_reason = COALESCE(NULLIF(cefr_reason, ''), 'Mapped by active CEFR stage, source metadata, topic, part of speech, and difficulty heuristic.'),
    updated_at = NOW()
WHERE active = true;

UPDATE assessment_items
SET cefr_level = COALESCE(NULLIF(cefr_level, ''), stage_id),
    can_do_statement = COALESCE(NULLIF(can_do_statement, ''), 'Answer a level-appropriate check-in item.'),
    difficulty_score = CASE stage_id WHEN 'a2-key' THEN 2.5 WHEN 'b1-preliminary' THEN 4.5 WHEN 'b2-first' THEN 6.5 WHEN 'c1-advanced' THEN 8 ELSE difficulty END,
    age_band = CASE stage_id WHEN 'a2-key' THEN '9-13' WHEN 'b1-preliminary' THEN '11-15' WHEN 'b2-first' THEN '13-16' WHEN 'c1-advanced' THEN '14+' ELSE '9+' END,
    quality_status = CASE WHEN COALESCE(review_status, 'approved') = 'approved' THEN 'approved' ELSE 'needs-review' END,
    safety_status = 'safe',
    cefr_reason = COALESCE(NULLIF(cefr_reason, ''), 'Assessment item follows active stage, skill, topic, and checkpoint blueprint.'),
    updated_at = NOW()
WHERE active = true;

UPDATE curriculum_units
SET cefr_level = COALESCE(NULLIF(cefr_level, ''), stage_id),
    can_do_statement = COALESCE(NULLIF(can_do_statement, ''), 'Complete a short sequence of level-appropriate learning tasks.'),
    difficulty_score = CASE stage_id WHEN 'a2-key' THEN 2.5 WHEN 'b1-preliminary' THEN 4.5 WHEN 'b2-first' THEN 6.5 WHEN 'c1-advanced' THEN 8 ELSE 2 END,
    age_band = CASE stage_id WHEN 'a2-key' THEN '9-13' WHEN 'b1-preliminary' THEN '11-15' WHEN 'b2-first' THEN '13-16' WHEN 'c1-advanced' THEN '14+' ELSE '9+' END,
    quality_status = CASE WHEN COALESCE(review_status, 'approved') = 'approved' THEN 'approved' ELSE 'needs-review' END,
    safety_status = 'safe',
    cefr_reason = COALESCE(NULLIF(cefr_reason, ''), 'Unit is aligned by CEFR stage, theme, target skills, and lesson sequence.'),
    updated_at = NOW()
WHERE active = true;

UPDATE lessons
SET cefr_level = COALESCE(NULLIF(cefr_level, ''), stage_id),
    can_do_statement = COALESCE(NULLIF(can_do_statement, ''), objective_vi),
    expected_output = COALESCE(NULLIF(expected_output, ''), CASE stage_id
      WHEN 'a2-key' THEN 'Short sentence or message using target vocabulary.'
      WHEN 'b1-preliminary' THEN 'Short paragraph, email, or spoken opinion with reasons.'
      WHEN 'b2-first' THEN 'Structured comparison or opinion with examples.'
      WHEN 'c1-advanced' THEN 'Summary, evaluation, or presentation-style response.'
      ELSE 'Level-appropriate learner output.' END),
    rubric = CASE WHEN rubric = '[]'::jsonb THEN '["clear meaning", "level-appropriate vocabulary", "complete response"]'::jsonb ELSE rubric END,
    learning_mode = CASE WHEN stage_id IN ('b2-first', 'c1-advanced') THEN 'teen' ELSE 'kid' END,
    difficulty_score = CASE stage_id WHEN 'a2-key' THEN 2.5 WHEN 'b1-preliminary' THEN 4.5 WHEN 'b2-first' THEN 6.5 WHEN 'c1-advanced' THEN 8 ELSE 2 END,
    age_band = CASE stage_id WHEN 'a2-key' THEN '9-13' WHEN 'b1-preliminary' THEN '11-15' WHEN 'b2-first' THEN '13-16' WHEN 'c1-advanced' THEN '14+' ELSE '9+' END,
    quality_status = CASE WHEN COALESCE(review_status, 'approved') = 'approved' THEN 'approved' ELSE 'needs-review' END,
    safety_status = 'safe',
    cefr_reason = COALESCE(NULLIF(cefr_reason, ''), 'Lesson is aligned by active CEFR stage, skill focus, step sequence, source metadata, and expected output.'),
    updated_at = NOW()
WHERE active = true;

UPDATE lesson_steps
SET cefr_skill = COALESCE(NULLIF(cefr_skill, ''), CASE step_type
      WHEN 'vocab' THEN 'vocabulary'
      WHEN 'reading' THEN 'reading'
      WHEN 'listening' THEN 'listening'
      WHEN 'speaking' THEN 'speaking'
      WHEN 'writing' THEN 'writing'
      WHEN 'grammar' THEN 'use-of-english'
      ELSE 'vocabulary' END),
    can_do_statement = COALESCE(NULLIF(can_do_statement, ''), 'Complete this short learning step with support.'),
    expected_output = COALESCE(NULLIF(expected_output, ''), CASE step_type
      WHEN 'quiz' THEN 'Quiz answers'
      WHEN 'writing' THEN 'Written response'
      WHEN 'speaking' THEN 'Spoken response'
      ELSE 'Step completion' END),
    quality_status = CASE WHEN COALESCE(review_status, 'approved') = 'approved' THEN 'approved' ELSE 'needs-review' END,
    safety_status = 'safe'
WHERE active = true;

ALTER TABLE lesson_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages lesson events" ON lesson_events;
CREATE POLICY "Service role manages lesson events" ON lesson_events
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own lesson events" ON lesson_events;
CREATE POLICY "Users read own lesson events" ON lesson_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = lesson_events.user_profile_id
        AND user_profiles.auth_id = auth.uid()
    )
  );
