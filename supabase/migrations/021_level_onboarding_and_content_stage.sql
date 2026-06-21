-- Level onboarding + curriculum-stage-aware content.
-- Run after 020_curriculum_assessment_engine.sql.

ALTER TABLE IF EXISTS learner_curriculum_state
  ADD COLUMN IF NOT EXISTS level_source text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS selected_level_at timestamptz,
  ADD COLUMN IF NOT EXISTS level_changed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_learner_curriculum_state_current_stage
  ON learner_curriculum_state(current_stage_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'learner_curriculum_state'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'learner_curriculum_state_level_source_check'
  ) THEN
    ALTER TABLE learner_curriculum_state
      ADD CONSTRAINT learner_curriculum_state_level_source_check
      CHECK (level_source IN ('auto', 'manual', 'placement', 'parent'));
  END IF;
END $$;

ALTER TABLE IF EXISTS stories
  ADD COLUMN IF NOT EXISTS curriculum_stage_id text;

ALTER TABLE IF EXISTS videos
  ADD COLUMN IF NOT EXISTS curriculum_stage_id text;

UPDATE stories
SET curriculum_stage_id = CASE
  WHEN level = 'Elementary' THEN 'a1-movers'
  WHEN level = 'Intermediate' THEN 'a2-flyers'
  ELSE 'pre-a1-starters'
END
WHERE curriculum_stage_id IS NULL;

UPDATE videos
SET curriculum_stage_id = CASE
  WHEN level = 'Elementary' THEN 'a1-movers'
  WHEN level = 'Intermediate' THEN 'a2-flyers'
  ELSE 'pre-a1-starters'
END
WHERE curriculum_stage_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_stories_curriculum_stage_id
  ON stories(curriculum_stage_id);

CREATE INDEX IF NOT EXISTS idx_videos_curriculum_stage_id
  ON videos(curriculum_stage_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'curriculum_stages'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stories_curriculum_stage_id_fkey') THEN
      ALTER TABLE stories
        ADD CONSTRAINT stories_curriculum_stage_id_fkey
        FOREIGN KEY (curriculum_stage_id) REFERENCES curriculum_stages(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'videos_curriculum_stage_id_fkey') THEN
      ALTER TABLE videos
        ADD CONSTRAINT videos_curriculum_stage_id_fkey
        FOREIGN KEY (curriculum_stage_id) REFERENCES curriculum_stages(id);
    END IF;
  END IF;
END $$;
