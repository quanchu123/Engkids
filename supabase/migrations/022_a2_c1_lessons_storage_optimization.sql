-- 022: A2-C1 active curriculum, licensed import metadata, lesson entities, and storage retention support.

-- Import/source metadata for safe licensed curriculum imports.
CREATE TABLE IF NOT EXISTS curriculum_import_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL DEFAULT '',
  license_proof TEXT NOT NULL DEFAULT '',
  allowed_use TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'a2-key',
  file_path TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  import_mode TEXT NOT NULL DEFAULT 'review',
  approved BOOLEAN NOT NULL DEFAULT false,
  source_hash TEXT,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS curriculum_import_sources_updated_at ON curriculum_import_sources;
CREATE TRIGGER curriculum_import_sources_updated_at BEFORE UPDATE ON curriculum_import_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS curriculum_import_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT REFERENCES curriculum_import_sources(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL DEFAULT 0,
  entity_type TEXT NOT NULL DEFAULT 'unknown',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'imported')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_import_staging_source ON curriculum_import_staging(source_id, review_status);

-- Add source/license metadata to generated/imported catalog rows.
ALTER TABLE IF EXISTS word_bank_items
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS license_status TEXT NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS source_hash TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';

ALTER TABLE IF EXISTS assessment_items
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS license_status TEXT NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS source_hash TEXT,
  ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';

-- A2-C1 learner-facing path. Legacy rows stay for FK safety but are inactive.
INSERT INTO curriculum_stages (
  id, cefr, title_vi, objective_vi, age_vi, weeks_vi, target_words,
  target_stories, target_games, topics, focus, can_do, daily_loop,
  weekly_plan, assessment, exit_criteria, engkids, sort_order, active
) VALUES
  ('a2-key', 'A2 Key', 'A2 Key - Nen tang giao tiep', 'Be hieu noi dung quen thuoc, noi/viet cau ngan va tu tin trong cac tinh huong hang ngay.', '9-13 tuoi hoac da co nen tang A1', '4-6 thang', 1200, 18, 35,
    ARRAY['daily life','school','travel','health','hobbies','stories','technology','community'],
    '["Mo rong tu vung A2", "Hoi dap ve trai nghiem va ke hoach gan", "Doc/nghe doan ngan co chi tiet ro"]'::jsonb,
    '["Hieu y chinh trong cau chuyen, video va hoi thoai ngan", "Viet tin nhan/email ngan ve chu de quen thuoc", "Dung thi hien tai, qua khu don va tu noi co ban"]'::jsonb,
    '["Review tu den han", "Mot lesson ngan", "Game luyen phan xa", "Checkpoint mini"]'::jsonb,
    '["Vocabulary + listening", "Reading story", "Grammar in context", "Speaking prompt", "Writing mini task", "Checkpoint"]'::jsonb,
    '["Placement A2", "Daily check 8 cau", "Weekly checkpoint 16 cau", "Stage exit 24 cau"]'::jsonb,
    '["1200 tu active", "18 lesson/story hoan thanh", "35 luot game dat 70%+", "Checkpoint >= 70%"]'::jsonb,
    '["Today queue", "Word-bank games", "Story/video lesson", "Parent progress"]'::jsonb, 1, true),
  ('b1-preliminary', 'B1 Preliminary', 'B1 Preliminary - Giao tiep doc lap', 'Be giao tiep ve truong lop, so thich, y kien va su kien quen thuoc bang doan ngan co cau truc.', '11-15 tuoi', '6-9 thang', 2200, 36, 70,
    ARRAY['teen life','environment','culture','media','science','problem solving','future plans'],
    '["Doc bai 250-500 tu", "Nghe chi tiet va suy luan don gian", "Viet email/story/review ngan"]'::jsonb,
    '["Giai thich ly do va y kien bang nhieu cau noi tiep", "Tom tat y chinh cua bai doc/video quen thuoc", "Tu sua loi co ban trong cau va doan ngan"]'::jsonb,
    '["SRS", "Reading/listening task", "Skill drill", "Writing or speaking output"]'::jsonb,
    '["Theme input", "Vocabulary depth", "Grammar pattern", "Listening detail", "Writing task", "Checkpoint"]'::jsonb,
    '["B1 checkpoint theo skill", "Stage exit voi writing/speaking prompt", "Weak-skill review"]'::jsonb,
    '["2200 tu active", "36 lesson hoan thanh", "70 luot game dat 70%+", "Skill thap nhat >= 60%"]'::jsonb,
    '["Learning path", "Review queue", "Skill breakdown", "Parent dashboard"]'::jsonb, 2, true),
  ('b2-first', 'B2 First', 'B2 First - Tu tin dien dat', 'Be hieu van ban dai hon, so sanh quan diem va trinh bay y tuong ro rang trong bai noi/viet co cau truc.', '13-16 tuoi', '8-12 thang', 3600, 60, 110,
    ARRAY['global issues','education','technology','creativity','health','careers','literature'],
    '["Doc bai 500-900 tu", "Phan biet y chinh/chi tiet/thai do", "Viet review/article/opinion paragraph"]'::jsonb,
    '["Bao ve y kien bang vi du", "So sanh hai lua chon hoac hai quan diem", "Dung cau phuc, tu noi va paraphrase phu hop"]'::jsonb,
    '["Advanced review", "Input rich lesson", "Analysis task", "Output task"]'::jsonb,
    '["Article/story", "Listening viewpoint", "Use of English", "Writing workshop", "Speaking cards", "Checkpoint"]'::jsonb,
    '["B2 mixed-skill checkpoint", "Stage exit voi writing rubric", "Targeted remediation"]'::jsonb,
    '["3600 tu active", "60 lesson hoan thanh", "110 luot game dat 70%+", "Checkpoint >= 75%"]'::jsonb,
    '["Dashboard path", "Lesson workspace", "Assessment report", "Portfolio tasks"]'::jsonb, 3, true),
  ('c1-advanced', 'C1 Advanced', 'C1 Advanced - Hoc thuat than thien', 'Be/teen hieu y phuc tap, tom tat, tranh luan va viet/noi ro rang ve chu de hoc thuat vua suc.', '14+ hoac da dat B2 vung', '9-15 thang', 5200, 90, 160,
    ARRAY['research','society','innovation','arts','ethics','communication','independent learning'],
    '["Doc bai dai co lap luan", "Nghe quan diem/ham y", "Viet summary, proposal, presentation script"]'::jsonb,
    '["Tom tat va danh gia y kien trong nguon doc/nghe", "Trinh bay lap luan co cau truc va vi du", "Dieu chinh van phong cho nguoi nghe/nguoi doc"]'::jsonb,
    '["Precision vocab", "Long-form input", "Critical thinking task", "Polished output"]'::jsonb,
    '["Deep reading", "Lecture-style listening", "Vocabulary nuance", "Discussion", "Writing revision", "Checkpoint"]'::jsonb,
    '["C1 checkpoint theo rubric", "Stage exit portfolio", "Parent/learner review"]'::jsonb,
    '["5200 tu active", "90 lesson hoan thanh", "160 luot game dat 70%+", "Portfolio task dat rubric"]'::jsonb,
    '["Advanced lesson path", "Portfolio", "Skill radar", "Parent summary"]'::jsonb, 4, true)
ON CONFLICT (id) DO UPDATE SET
  cefr = EXCLUDED.cefr,
  title_vi = EXCLUDED.title_vi,
  objective_vi = EXCLUDED.objective_vi,
  age_vi = EXCLUDED.age_vi,
  weeks_vi = EXCLUDED.weeks_vi,
  target_words = EXCLUDED.target_words,
  target_stories = EXCLUDED.target_stories,
  target_games = EXCLUDED.target_games,
  topics = EXCLUDED.topics,
  focus = EXCLUDED.focus,
  can_do = EXCLUDED.can_do,
  daily_loop = EXCLUDED.daily_loop,
  weekly_plan = EXCLUDED.weekly_plan,
  assessment = EXCLUDED.assessment,
  exit_criteria = EXCLUDED.exit_criteria,
  engkids = EXCLUDED.engkids,
  sort_order = EXCLUDED.sort_order,
  active = true,
  updated_at = NOW();

UPDATE curriculum_stages
SET active = false, updated_at = NOW()
WHERE id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');

ALTER TABLE IF EXISTS learner_curriculum_state
  ALTER COLUMN current_stage_id SET DEFAULT 'a2-key',
  ALTER COLUMN unlocked_stage_ids SET DEFAULT ARRAY['a2-key'];

UPDATE learner_curriculum_state
SET current_stage_id = 'a2-key',
    unlocked_stage_ids = ARRAY['a2-key'],
    recommended_task = COALESCE(NULLIF(recommended_task, '{}'::jsonb), '{"kind":"today","href":"/learn/today"}'::jsonb),
    updated_at = NOW()
WHERE current_stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');

UPDATE word_bank_items
SET level = 'a2-key',
    source_id = COALESCE(source_id, source),
    license_status = COALESCE(NULLIF(license_status, ''), 'original'),
    review_status = COALESCE(NULLIF(review_status, ''), 'approved'),
    updated_at = NOW()
WHERE level IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');

UPDATE assessment_items SET stage_id = 'a2-key', updated_at = NOW()
WHERE stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');
UPDATE assessment_attempts SET stage_id = 'a2-key' WHERE stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');
UPDATE assessment_attempts SET recommended_stage_id = 'a2-key' WHERE recommended_stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');
UPDATE learner_skill_mastery SET stage_id = 'a2-key', updated_at = NOW() WHERE stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');
UPDATE learner_daily_tasks SET stage_id = 'a2-key', updated_at = NOW() WHERE stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge');
UPDATE stories SET curriculum_stage_id = 'a2-key' WHERE curriculum_stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge') OR curriculum_stage_id IS NULL;
UPDATE videos SET curriculum_stage_id = 'a2-key' WHERE curriculum_stage_id IN ('sound-play', 'pre-a1-starters', 'a1-movers', 'a2-flyers', 'a2-bridge') OR curriculum_stage_id IS NULL;

-- Normalized lessons.
CREATE TABLE IF NOT EXISTS curriculum_units (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  title_vi TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'general',
  target_skills TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_id TEXT REFERENCES curriculum_import_sources(id) ON DELETE SET NULL,
  license_status TEXT NOT NULL DEFAULT 'original',
  source_hash TEXT,
  imported_at TIMESTAMPTZ,
  review_status TEXT NOT NULL DEFAULT 'approved',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  title_vi TEXT NOT NULL,
  title_en TEXT NOT NULL DEFAULT '',
  objective_vi TEXT NOT NULL DEFAULT '',
  cefr TEXT NOT NULL DEFAULT '',
  estimated_minutes INTEGER NOT NULL DEFAULT 15 CHECK (estimated_minutes > 0),
  cover_asset_url TEXT,
  skill_focus TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_id TEXT REFERENCES curriculum_import_sources(id) ON DELETE SET NULL,
  license_status TEXT NOT NULL DEFAULT 'original',
  source_hash TEXT,
  imported_at TIMESTAMPTZ,
  review_status TEXT NOT NULL DEFAULT 'approved',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('warmup', 'vocab', 'reading', 'listening', 'grammar', 'speaking', 'writing', 'quiz', 'review')),
  title_vi TEXT NOT NULL,
  instruction_vi TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_id TEXT REFERENCES curriculum_import_sources(id) ON DELETE SET NULL,
  license_status TEXT NOT NULL DEFAULT 'original',
  source_hash TEXT,
  imported_at TIMESTAMPTZ,
  review_status TEXT NOT NULL DEFAULT 'approved',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  asset_kind TEXT NOT NULL CHECK (asset_kind IN ('image', 'audio', 'video', 'document')),
  original_url TEXT NOT NULL,
  optimized_url TEXT,
  derivative_format TEXT,
  width INTEGER,
  height INTEGER,
  bytes BIGINT,
  optimized_bytes BIGINT,
  source_id TEXT REFERENCES curriculum_import_sources(id) ON DELETE SET NULL,
  license_status TEXT NOT NULL DEFAULT 'original',
  source_hash TEXT,
  imported_at TIMESTAMPTZ,
  review_status TEXT NOT NULL DEFAULT 'approved',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'skipped')),
  completed_steps INTEGER NOT NULL DEFAULT 0 CHECK (completed_steps >= 0),
  total_steps INTEGER NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  score_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score_percent BETWEEN 0 AND 100),
  last_step_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_profile_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS storage_cleanup_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL DEFAULT 'system',
  dry_run BOOLEAN NOT NULL DEFAULT true,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curriculum_units_stage ON curriculum_units(stage_id, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_lessons_stage ON lessons(stage_id, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_steps_lesson ON lesson_steps(lesson_id, active, sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_assets_lesson ON lesson_assets(lesson_id, active);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_profile ON lesson_progress(user_profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_word_bank_items_license ON word_bank_items(license_status, review_status);
CREATE INDEX IF NOT EXISTS idx_assessment_items_license ON assessment_items(license_status, review_status);

DROP TRIGGER IF EXISTS curriculum_units_updated_at ON curriculum_units;
CREATE TRIGGER curriculum_units_updated_at BEFORE UPDATE ON curriculum_units FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS lessons_updated_at ON lessons;
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS lesson_steps_updated_at ON lesson_steps;
CREATE TRIGGER lesson_steps_updated_at BEFORE UPDATE ON lesson_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Original-safe lesson templates, not copied from licensed textbooks.
INSERT INTO curriculum_units (id, stage_id, title_vi, theme, target_skills, sort_order, license_status, review_status) VALUES
  ('a2-key-foundation', 'a2-key', 'A2 daily confidence', 'daily life', ARRAY['vocabulary','reading','speaking'], 1, 'original', 'approved'),
  ('b1-preliminary-voice', 'b1-preliminary', 'B1 opinions and routines', 'teen life', ARRAY['reading','listening','writing'], 1, 'original', 'approved'),
  ('b2-first-ideas', 'b2-first', 'B2 compare and explain', 'technology', ARRAY['reading','grammar','writing'], 1, 'original', 'approved'),
  ('c1-advanced-thinking', 'c1-advanced', 'C1 clear arguments', 'innovation', ARRAY['reading','speaking','writing'], 1, 'original', 'approved')
ON CONFLICT (id) DO UPDATE SET stage_id = EXCLUDED.stage_id, title_vi = EXCLUDED.title_vi, theme = EXCLUDED.theme, target_skills = EXCLUDED.target_skills, active = true, updated_at = NOW();

INSERT INTO lessons (id, unit_id, stage_id, title_vi, title_en, objective_vi, cefr, estimated_minutes, skill_focus, sort_order, license_status, review_status) VALUES
  ('a2-key-first-message', 'a2-key-foundation', 'a2-key', 'Viet tin nhan dau tien', 'My first useful message', 'Doc mot tinh huong ngan va viet tin nhan 3-4 cau.', 'A2 Key', 18, ARRAY['vocabulary','reading','writing'], 1, 'original', 'approved'),
  ('b1-preliminary-school-club', 'b1-preliminary-voice', 'b1-preliminary', 'Y kien ve cau lac bo', 'Opinions about a school club', 'Nghe/doc y kien va viet email ngan neu ly do.', 'B1 Preliminary', 22, ARRAY['listening','reading','writing'], 1, 'original', 'approved'),
  ('b2-first-tech-choice', 'b2-first-ideas', 'b2-first', 'So sanh hai lua chon cong nghe', 'Comparing two tech choices', 'So sanh lua chon va bao ve y kien bang vi du.', 'B2 First', 28, ARRAY['reading','grammar','speaking'], 1, 'original', 'approved'),
  ('c1-advanced-innovation-summary', 'c1-advanced-thinking', 'c1-advanced', 'Tom tat mot y tuong moi', 'Summarising an innovation', 'Tom tat, danh gia va trinh bay quan diem ro rang.', 'C1 Advanced', 35, ARRAY['reading','speaking','writing'], 1, 'original', 'approved')
ON CONFLICT (id) DO UPDATE SET unit_id = EXCLUDED.unit_id, stage_id = EXCLUDED.stage_id, title_vi = EXCLUDED.title_vi, objective_vi = EXCLUDED.objective_vi, active = true, updated_at = NOW();

INSERT INTO lesson_steps (lesson_id, step_type, title_vi, instruction_vi, payload, sort_order, license_status, review_status)
SELECT lesson_id, step_type, title_vi, instruction_vi, payload, sort_order, 'original', 'approved'
FROM (VALUES
  ('a2-key-first-message','warmup','Khoi dong','Chon 3 tu ban can de viet tin nhan.', '{"minutes":3}'::jsonb, 1),
  ('a2-key-first-message','reading','Doc tinh huong','Doc doan ngan va tim ai, o dau, can lam gi.', '{"minutes":5}'::jsonb, 2),
  ('a2-key-first-message','writing','Viet tin nhan','Viet 3-4 cau ngan, ro y.', '{"minutes":8,"rubric":["clear purpose","friendly tone","A2 words"]}'::jsonb, 3),
  ('b1-preliminary-school-club','listening','Nghe y kien','Ghi lai ly do ung ho hoac phan doi.', '{"minutes":7}'::jsonb, 1),
  ('b1-preliminary-school-club','writing','Email ngan','Viet email neu y kien va hai ly do.', '{"minutes":10,"rubric":["opinion","reasons","closing"]}'::jsonb, 2),
  ('b2-first-tech-choice','reading','So sanh lua chon','Tim diem manh/yeu cua moi lua chon.', '{"minutes":8}'::jsonb, 1),
  ('b2-first-tech-choice','speaking','Bao ve y kien','Noi 45 giay ve lua chon tot hon.', '{"minutes":8,"rubric":["comparison","example","linkers"]}'::jsonb, 2),
  ('c1-advanced-innovation-summary','reading','Doc y tuong','Danh dau y chinh va ham y.', '{"minutes":10}'::jsonb, 1),
  ('c1-advanced-innovation-summary','writing','Tom tat va danh gia','Viet tom tat 80-120 tu kem nhan xet.', '{"minutes":15,"rubric":["summary","evaluation","precision"]}'::jsonb, 2)
) AS seed(lesson_id, step_type, title_vi, instruction_vi, payload, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM lesson_steps existing
  WHERE existing.lesson_id = seed.lesson_id
    AND existing.step_type = seed.step_type
    AND existing.sort_order = seed.sort_order
);

-- RLS: public read for catalog, service role writes, users read/update own lesson progress through server APIs.
ALTER TABLE curriculum_import_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_cleanup_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages curriculum import sources" ON curriculum_import_sources;
CREATE POLICY "Service role manages curriculum import sources" ON curriculum_import_sources FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages curriculum import staging" ON curriculum_import_staging;
CREATE POLICY "Service role manages curriculum import staging" ON curriculum_import_staging FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Curriculum units readable by everyone" ON curriculum_units;
CREATE POLICY "Curriculum units readable by everyone" ON curriculum_units FOR SELECT USING (active = true AND review_status = 'approved');
DROP POLICY IF EXISTS "Lessons readable by everyone" ON lessons;
CREATE POLICY "Lessons readable by everyone" ON lessons FOR SELECT USING (active = true AND review_status = 'approved');
DROP POLICY IF EXISTS "Lesson steps readable by everyone" ON lesson_steps;
CREATE POLICY "Lesson steps readable by everyone" ON lesson_steps FOR SELECT USING (active = true AND review_status = 'approved');
DROP POLICY IF EXISTS "Lesson assets readable by everyone" ON lesson_assets;
CREATE POLICY "Lesson assets readable by everyone" ON lesson_assets FOR SELECT USING (active = true AND review_status = 'approved');

DROP POLICY IF EXISTS "Service role manages curriculum units" ON curriculum_units;
CREATE POLICY "Service role manages curriculum units" ON curriculum_units FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages lessons" ON lessons;
CREATE POLICY "Service role manages lessons" ON lessons FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages lesson steps" ON lesson_steps;
CREATE POLICY "Service role manages lesson steps" ON lesson_steps FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages lesson assets" ON lesson_assets;
CREATE POLICY "Service role manages lesson assets" ON lesson_assets FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages lesson progress" ON lesson_progress;
CREATE POLICY "Service role manages lesson progress" ON lesson_progress FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role manages storage cleanup events" ON storage_cleanup_events;
CREATE POLICY "Service role manages storage cleanup events" ON storage_cleanup_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
