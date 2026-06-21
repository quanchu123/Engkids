-- ============================================
-- 020: Curriculum, assessment, and DB-first word bank
-- ============================================
-- This migration turns the learning roadmap into a database-backed system:
-- stages, skills, global word bank, assessment blueprints/items, learner stage
-- state, skill mastery, assessment attempts/responses, and daily tasks.
-- It is additive and safe to re-run.
-- ============================================

CREATE TABLE IF NOT EXISTS curriculum_stages (
  id TEXT PRIMARY KEY,
  cefr TEXT NOT NULL,
  title_vi TEXT NOT NULL,
  objective_vi TEXT NOT NULL DEFAULT '',
  age_vi TEXT NOT NULL DEFAULT '',
  weeks_vi TEXT NOT NULL DEFAULT '',
  target_words INTEGER NOT NULL DEFAULT 0 CHECK (target_words >= 0),
  target_stories INTEGER NOT NULL DEFAULT 0 CHECK (target_stories >= 0),
  target_games INTEGER NOT NULL DEFAULT 0 CHECK (target_games >= 0),
  topics TEXT[] NOT NULL DEFAULT '{}',
  focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  can_do JSONB NOT NULL DEFAULT '[]'::jsonb,
  daily_loop JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  assessment JSONB NOT NULL DEFAULT '[]'::jsonb,
  exit_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  engkids JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS curriculum_stages_updated_at ON curriculum_stages;
CREATE TRIGGER curriculum_stages_updated_at BEFORE UPDATE ON curriculum_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS curriculum_skills (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_vi TEXT NOT NULL,
  description_vi TEXT NOT NULL DEFAULT '',
  cefr_domain TEXT NOT NULL DEFAULT 'language',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS word_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  en TEXT NOT NULL,
  en_lower TEXT GENERATED ALWAYS AS (LOWER(TRIM(en))) STORED,
  vi TEXT NOT NULL,
  level TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  topic TEXT NOT NULL DEFAULT 'general',
  example TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT,
  source TEXT NOT NULL DEFAULT 'engkids-seed',
  tags TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (en_lower)
);

CREATE INDEX IF NOT EXISTS idx_word_bank_items_level ON word_bank_items(level);
CREATE INDEX IF NOT EXISTS idx_word_bank_items_topic ON word_bank_items(topic);
CREATE INDEX IF NOT EXISTS idx_word_bank_items_active ON word_bank_items(active);

DROP TRIGGER IF EXISTS word_bank_items_updated_at ON word_bank_items;
CREATE TRIGGER word_bank_items_updated_at BEFORE UPDATE ON word_bank_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS assessment_blueprints (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('placement', 'daily-check', 'weekly-checkpoint', 'stage-exit')),
  stage_id TEXT REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  title_vi TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 10 CHECK (item_count > 0),
  pass_percent INTEGER NOT NULL DEFAULT 70 CHECK (pass_percent BETWEEN 0 AND 100),
  min_skill_percent INTEGER NOT NULL DEFAULT 60 CHECK (min_skill_percent BETWEEN 0 AND 100),
  skill_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_blueprints_kind ON assessment_blueprints(kind);
CREATE INDEX IF NOT EXISTS idx_assessment_blueprints_stage ON assessment_blueprints(stage_id);

DROP TRIGGER IF EXISTS assessment_blueprints_updated_at ON assessment_blueprints;
CREATE TRIGGER assessment_blueprints_updated_at BEFORE UPDATE ON assessment_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS assessment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id TEXT REFERENCES assessment_blueprints(id) ON DELETE SET NULL,
  stage_id TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON UPDATE CASCADE,
  topic TEXT NOT NULL DEFAULT 'general',
  item_type TEXT NOT NULL CHECK (item_type IN ('meaning-choice', 'word-choice', 'fill-blank', 'sentence-order', 'listening-choice', 'can-do')),
  prompt TEXT NOT NULL,
  prompt_vi TEXT NOT NULL DEFAULT '',
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation_vi TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  source_word_en TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_items_blueprint ON assessment_items(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_assessment_items_stage_skill ON assessment_items(stage_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_assessment_items_active ON assessment_items(active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_items_generated_unique
  ON assessment_items(stage_id, skill_id, item_type, source_word_en);

DROP TRIGGER IF EXISTS assessment_items_updated_at ON assessment_items;
CREATE TRIGGER assessment_items_updated_at BEFORE UPDATE ON assessment_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS learner_curriculum_state (
  user_profile_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  current_stage_id TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE DEFAULT 'pre-a1-starters',
  unlocked_stage_ids TEXT[] NOT NULL DEFAULT ARRAY['sound-play', 'pre-a1-starters'],
  placement_attempt_id UUID,
  last_checkpoint_at TIMESTAMPTZ,
  next_checkpoint_due_at DATE,
  recommended_task JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS learner_curriculum_state_updated_at ON learner_curriculum_state;
CREATE TRIGGER learner_curriculum_state_updated_at BEFORE UPDATE ON learner_curriculum_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS learner_skill_mastery (
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON UPDATE CASCADE,
  mastery_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (mastery_percent BETWEEN 0 AND 100),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  correct INTEGER NOT NULL DEFAULT 0 CHECK (correct >= 0),
  last_practiced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_profile_id, stage_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_skill_mastery_profile ON learner_skill_mastery(user_profile_id);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  blueprint_id TEXT REFERENCES assessment_blueprints(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('placement', 'daily-check', 'weekly-checkpoint', 'stage-exit')),
  stage_id TEXT REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score_percent BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL DEFAULT false,
  recommended_stage_id TEXT REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  skill_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_profile ON assessment_attempts(user_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_kind ON assessment_attempts(kind, stage_id);

ALTER TABLE learner_curriculum_state
  DROP CONSTRAINT IF EXISTS learner_curriculum_state_placement_attempt_fk;
ALTER TABLE learner_curriculum_state
  ADD CONSTRAINT learner_curriculum_state_placement_attempt_fk
  FOREIGN KEY (placement_attempt_id) REFERENCES assessment_attempts(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  item_id UUID REFERENCES assessment_items(id) ON DELETE SET NULL,
  skill_id TEXT REFERENCES curriculum_skills(id) ON UPDATE CASCADE,
  user_answer TEXT NOT NULL DEFAULT '',
  correct_answer TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  response_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_attempt ON assessment_responses(attempt_id);

CREATE TABLE IF NOT EXISTS learner_daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  stage_id TEXT NOT NULL REFERENCES curriculum_stages(id) ON UPDATE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('placement', 'review', 'story', 'media', 'game', 'daily-check', 'checkpoint')),
  skill_id TEXT REFERENCES curriculum_skills(id) ON UPDATE CASCADE,
  title_vi TEXT NOT NULL,
  href TEXT NOT NULL DEFAULT '/',
  target_count INTEGER NOT NULL DEFAULT 1 CHECK (target_count > 0),
  completed_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'skipped')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_profile_id, task_date, kind, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_learner_daily_tasks_profile_date ON learner_daily_tasks(user_profile_id, task_date);

DROP TRIGGER IF EXISTS learner_daily_tasks_updated_at ON learner_daily_tasks;
CREATE TRIGGER learner_daily_tasks_updated_at BEFORE UPDATE ON learner_daily_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed stages from the Engkids CEFR / Cambridge Young Learners progression.
INSERT INTO curriculum_stages (
  id, cefr, title_vi, objective_vi, age_vi, weeks_vi, target_words,
  target_stories, target_games, topics, focus, can_do, daily_loop,
  weekly_plan, assessment, exit_criteria, engkids, sort_order
) VALUES
  ('sound-play', 'Pre-A1 readiness', 'Lam quen am thanh', 'Nhan dien am, tu don va chi dan ngan.', '4-6 tuoi hoac moi bat dau', '4-8 tuan', 40, 1, 3,
    ARRAY['greetings','colors','numbers','animals','family','toys'],
    '["Nghe va bat chuoc am quen thuoc", "Nhan dien tranh, mau, so, nguoi than", "Tra loi yes/no va lap lai cum 1-3 tu"]'::jsonb,
    '["Hieu loi chao va chi dan 1 buoc", "Chon dung tranh hoac tu khi nghe", "Noi lai tu don/cum ngan"]'::jsonb,
    '["Input ngan", "Meaning qua tranh", "Practice bang game", "Review tu yeu"]'::jsonb,
    '["Nghe va nhac lai", "Mau/so/do vat", "Truyen tranh ngan", "On bang game"]'::jsonb,
    '["Chon dung 8/10 tranh khi nghe", "Noi duoc toi thieu 20 tu quen thuoc", "Lam game de voi tro giup it dan"]'::jsonb,
    '["40 tu nho tot", "Hoan thanh 1 truyen ngan", "3 luot game dat 70%+"]'::jsonb,
    '["Video/bai hat ngan", "Memory Match/Matching Pairs", "Pet cau hoi 1 tu"]'::jsonb, 1),
  ('pre-a1-starters', 'Pre A1 Starters', 'Nen tang tu va cau ngan', 'Dung tu quen thuoc de hieu cau ngan ve ban than va doi song gan be.', '6-8 tuoi', '3-5 thang', 180, 5, 10,
    ARRAY['family','animals','school','food','body','home','weather','nature'],
    '["Tu vung doi song gan be", "Mau cau I like/This is/Where is", "Doc tu va cau rat ngan"]'::jsonb,
    '["Tra loi cau hoi ca nhan don gian", "Ghep Anh-Viet va doc cau ngan", "Dien hoac keo tha tu dung ngu canh"]'::jsonb,
    '["On tu cu", "Truyen/video", "Game word_bank", "Noi lai cau mau"]'::jsonb,
    '["School/home", "Food/body/animals", "Weather/nature", "Story vocab", "Review dashboard"]'::jsonb,
    '["Hieu What is it/Where is it/Do you like", "Doc cau 3-6 tu", "Dung I like/I can/This is"]'::jsonb,
    '["180 tu nho tot", "Hoan thanh 5 truyen", "10 luot game dat 70%+"]'::jsonb,
    '["Stories cap de", "Word Burst/Word Puzzle/Matching", "Progress Review"]'::jsonb, 2),
  ('a1-movers', 'A1 Movers', 'Giao tiep cau don', 'Dung cau don ve thoi quen, so thich, noi chon va trai nghiem quen thuoc.', '7-10 tuoi', '5-8 thang', 360, 12, 22,
    ARRAY['daily routines','places','hobbies','transport','nature','feelings'],
    '["Hoi dap ve thoi quen va so thich", "Doc truyen 80-150 tu", "Viet cum va cau don"]'::jsonb,
    '["Hieu hoi thoai ngan", "Ke lai truyen bang 2-4 cau", "Dung hien tai don va menh lenh quen thuoc"]'::jsonb,
    '["SRS", "Doc/nghe", "Farm hoac game cau hoi", "Noi/viet 1-2 cau"]'::jsonb,
    '["Routine/places", "Transport/hobbies", "Nature/feelings", "Story game", "Farm review", "Can-do check"]'::jsonb,
    '["Mo ta ngay thuong bang 3 cau", "Tra loi Why/Where/When don gian", "Lam quiz co cau day du"]'::jsonb,
    '["360 tu nho tot", "Hoan thanh 12 truyen", "22 luot game dat 70%+"]'::jsonb,
    '["English Farm", "RPG/Tower", "Story games"]'::jsonb, 3),
  ('a2-flyers', 'A2 Flyers', 'Doc hieu va ke chuyen', 'Hieu y chinh, chi tiet quen thuoc va dien dat y kien bang nhieu cau noi tiep.', '9-12 tuoi', '8-12 thang', 720, 24, 40,
    ARRAY['adventure','science','health','technology','language','community'],
    '["Doc doan 150-300 tu", "Nghe chi tiet trong video/truyen", "Viet 4-6 cau co trinh tu"]'::jsonb,
    '["Nam y chinh va chi tiet", "Mo ta tranh/nhan vat/su kien", "Dung qua khu don va tu noi"]'::jsonb,
    '["On tu den han", "Doc/video", "Fill blank/sentence scramble", "Viet hoac noi lai"]'::jsonb,
    '["Adventure/story", "Science/health", "Technology/language", "Video quiz", "Sentence writing", "Progress review"]'::jsonb,
    '["Tra loi cau hoi chi tiet", "Viet 4 cau theo tranh/chu de", "Giai thich bang because/then/first"]'::jsonb,
    '["720 tu nho tot", "Hoan thanh 24 truyen", "40 luot game dat 70%+"]'::jsonb,
    '["Fill Blanks/Sentence Scramble", "Video quiz/Story vocab", "SRS review"]'::jsonb, 4),
  ('a2-bridge', 'A2 bridge', 'Tu hoc co huong dan', 'Theo doi muc tieu tuan, doc nhieu chu de va trinh bay y kien bang doan ngan.', '10+ hoac hoan thanh Flyers', '3-6 thang', 1000, 36, 60,
    ARRAY['projects','culture','problem solving','media','opinions','future plans'],
    '["Doc nhieu chu de hon", "Noi/viet y kien don gian", "Tu theo doi loi va muc tieu tuan"]'::jsonb,
    '["Doc email/tin nhan/truyen doi thuong", "Noi ve ke hoach va trai nghiem", "Biet on lai tu yeu"]'::jsonb,
    '["Xem muc tieu", "Doc/nghe tu chon", "Game hoac viet", "Danh dau loi can on"]'::jsonb,
    '["Project/culture", "Media/news", "Problem solving", "Opinion writing", "Presentation nho", "Review tu chon"]'::jsonb,
    '["Lap ke hoach hoc tuan", "Trinh bay 5-6 cau ve chu de quen thuoc", "Tu nhan ra tu/cau truc can on"]'::jsonb,
    '["1000 tu nho tot", "Hoan thanh 36 truyen", "60 luot game dat 70%+"]'::jsonb,
    '["Progress dashboard", "Today plan", "Game nang cao"]'::jsonb, 5)
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
  active = true;

INSERT INTO curriculum_skills (id, name_en, name_vi, description_vi, cefr_domain, sort_order) VALUES
  ('vocabulary', 'Vocabulary', 'Tu vung', 'Nhan dien, hieu nghia va dung tu dung topic.', 'language', 1),
  ('listening', 'Listening', 'Nghe', 'Nhan dien am, tu va y chinh trong audio/video.', 'reception', 2),
  ('reading', 'Reading', 'Doc', 'Doc tu, cau va doan ngan theo CEFR can-do.', 'reception', 3),
  ('grammar', 'Grammar', 'Ngu phap', 'Dung mau cau va cau truc phu hop cap do.', 'language', 4),
  ('writing', 'Writing', 'Viet', 'Sap xep, dien tu va tao cau ngan.', 'production', 5),
  ('speaking', 'Speaking', 'Noi', 'Lap lai, tra loi va trinh bay ngan.', 'production', 6)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_vi = EXCLUDED.name_vi,
  description_vi = EXCLUDED.description_vi,
  cefr_domain = EXCLUDED.cefr_domain,
  sort_order = EXCLUDED.sort_order,
  active = true;

INSERT INTO assessment_blueprints (id, kind, stage_id, title_vi, item_count, pass_percent, min_skill_percent, skill_weights, rules) VALUES
  ('placement-default', 'placement', NULL, 'Placement test', 24, 70, 50, '{"vocabulary": 8, "listening": 4, "reading": 6, "grammar": 4, "writing": 2}'::jsonb, '{"adaptive": true, "setsInitialStage": true}'::jsonb),
  ('daily-check-default', 'daily-check', NULL, 'Daily micro check', 8, 70, 50, '{"vocabulary": 3, "reading": 2, "grammar": 2, "listening": 1}'::jsonb, '{"unlocksCoins": true}'::jsonb),
  ('weekly-checkpoint-default', 'weekly-checkpoint', NULL, 'Weekly checkpoint', 16, 70, 60, '{"vocabulary": 5, "listening": 3, "reading": 4, "grammar": 2, "writing": 2}'::jsonb, '{"remedialIfBelow": 70}'::jsonb),
  ('stage-exit-default', 'stage-exit', NULL, 'Stage exit test', 24, 75, 60, '{"vocabulary": 8, "listening": 4, "reading": 6, "grammar": 3, "writing": 3}'::jsonb, '{"unlocksNextStage": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind,
  stage_id = EXCLUDED.stage_id,
  title_vi = EXCLUDED.title_vi,
  item_count = EXCLUDED.item_count,
  pass_percent = EXCLUDED.pass_percent,
  min_skill_percent = EXCLUDED.min_skill_percent,
  skill_weights = EXCLUDED.skill_weights,
  rules = EXCLUDED.rules,
  active = true;

-- If old JSON game_content already contains word-bank data, migrate it once into
-- the normalized word_bank_items table. The app service also backfills defaults.
INSERT INTO word_bank_items (en, vi, level, topic, example, source, sort_order)
SELECT
  TRIM(item.value->>'en') AS en,
  TRIM(item.value->>'vi') AS vi,
  COALESCE(NULLIF(item.value->>'level', ''), 'pre-a1-starters') AS level,
  COALESCE(NULLIF(LOWER(TRIM(item.value->>'topic')), ''), 'general') AS topic,
  COALESCE(NULLIF(TRIM(item.value->>'example'), ''), 'I can see ' || LOWER(TRIM(item.value->>'en')) || '.') AS example,
  'game_content-migration' AS source,
  item.ordinality::INTEGER AS sort_order
FROM game_content gc,
  jsonb_array_elements(gc.data) WITH ORDINALITY AS item(value, ordinality)
WHERE gc.game_type = 'word-bank'
  AND jsonb_typeof(gc.data) = 'array'
  AND TRIM(item.value->>'en') <> ''
  AND TRIM(item.value->>'vi') <> ''
ON CONFLICT (en_lower) DO UPDATE SET
  vi = EXCLUDED.vi,
  level = EXCLUDED.level,
  topic = EXCLUDED.topic,
  example = EXCLUDED.example,
  source = EXCLUDED.source,
  sort_order = EXCLUDED.sort_order,
  active = true,
  updated_at = NOW();

-- RLS: catalog/content tables are public-read so anonymous learners can see the
-- path and take guest assessments. Writes are server-side through service role.
ALTER TABLE curriculum_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_bank_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_curriculum_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_skill_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_daily_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Curriculum stages readable by everyone" ON curriculum_stages;
CREATE POLICY "Curriculum stages readable by everyone" ON curriculum_stages
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role manages curriculum stages" ON curriculum_stages;
CREATE POLICY "Service role manages curriculum stages" ON curriculum_stages
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Curriculum skills readable by everyone" ON curriculum_skills;
CREATE POLICY "Curriculum skills readable by everyone" ON curriculum_skills
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role manages curriculum skills" ON curriculum_skills;
CREATE POLICY "Service role manages curriculum skills" ON curriculum_skills
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Word bank readable by everyone" ON word_bank_items;
CREATE POLICY "Word bank readable by everyone" ON word_bank_items
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role manages word bank" ON word_bank_items;
CREATE POLICY "Service role manages word bank" ON word_bank_items
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Assessment blueprints readable by everyone" ON assessment_blueprints;
CREATE POLICY "Assessment blueprints readable by everyone" ON assessment_blueprints
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role manages assessment blueprints" ON assessment_blueprints;
CREATE POLICY "Service role manages assessment blueprints" ON assessment_blueprints
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Assessment items readable by everyone" ON assessment_items;
CREATE POLICY "Assessment items readable by everyone" ON assessment_items
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Service role manages assessment items" ON assessment_items;
CREATE POLICY "Service role manages assessment items" ON assessment_items
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own learner curriculum state" ON learner_curriculum_state;
CREATE POLICY "Users read own learner curriculum state" ON learner_curriculum_state
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = learner_curriculum_state.user_profile_id
        AND user_profiles.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages learner curriculum state" ON learner_curriculum_state;
CREATE POLICY "Service role manages learner curriculum state" ON learner_curriculum_state
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own learner skill mastery" ON learner_skill_mastery;
CREATE POLICY "Users read own learner skill mastery" ON learner_skill_mastery
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = learner_skill_mastery.user_profile_id
        AND user_profiles.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages learner skill mastery" ON learner_skill_mastery;
CREATE POLICY "Service role manages learner skill mastery" ON learner_skill_mastery
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own assessment attempts" ON assessment_attempts;
CREATE POLICY "Users read own assessment attempts" ON assessment_attempts
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = assessment_attempts.user_profile_id
        AND user_profiles.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages assessment attempts" ON assessment_attempts;
CREATE POLICY "Service role manages assessment attempts" ON assessment_attempts
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own assessment responses" ON assessment_responses;
CREATE POLICY "Users read own assessment responses" ON assessment_responses
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM assessment_attempts
      JOIN user_profiles ON user_profiles.id = assessment_attempts.user_profile_id
      WHERE assessment_attempts.id = assessment_responses.attempt_id
        AND user_profiles.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages assessment responses" ON assessment_responses;
CREATE POLICY "Service role manages assessment responses" ON assessment_responses
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own daily tasks" ON learner_daily_tasks;
CREATE POLICY "Users read own daily tasks" ON learner_daily_tasks
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = learner_daily_tasks.user_profile_id
        AND user_profiles.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages daily tasks" ON learner_daily_tasks;
CREATE POLICY "Service role manages daily tasks" ON learner_daily_tasks
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
