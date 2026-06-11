import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import {
  CURRICULUM_STAGES,
  normalizeStageId,
  type CurriculumStage,
  type CurriculumStageId,
} from '@/lib/curriculum';
import { DEFAULT_WORD_BANK, enrichWordPair, filterWordBank, type WordPair } from '@/lib/word-bank';
import { getWordBank } from '@/services/game-content';

export type AssessmentKind = 'placement' | 'daily-check' | 'weekly-checkpoint' | 'stage-exit';
export type CurriculumSkillId = 'vocabulary' | 'listening' | 'reading' | 'grammar' | 'writing' | 'speaking';
export type AssessmentItemType = 'meaning-choice' | 'word-choice' | 'fill-blank' | 'sentence-order' | 'listening-choice' | 'can-do';

export interface CurriculumSkill {
  id: CurriculumSkillId;
  nameEn: string;
  nameVi: string;
  descriptionVi: string;
  cefrDomain: string;
  sortOrder: number;
}

export interface AssessmentBlueprint {
  id: string;
  kind: AssessmentKind;
  stageId: CurriculumStageId | null;
  titleVi: string;
  itemCount: number;
  passPercent: number;
  minSkillPercent: number;
  skillWeights: Partial<Record<CurriculumSkillId, number>>;
  rules: Record<string, unknown>;
}

export interface AssessmentItemPublic {
  id: string;
  stageId: CurriculumStageId;
  skillId: CurriculumSkillId;
  topic: string;
  itemType: AssessmentItemType;
  prompt: string;
  promptVi: string;
  choices: string[];
  explanationVi: string;
}

export interface AssessmentResponseInput {
  itemId: string;
  answer: string;
  responseMs?: number;
}

export interface AssessmentAttemptInput {
  blueprintId?: string;
  kind: AssessmentKind;
  stageId?: CurriculumStageId;
  responses: AssessmentResponseInput[];
}

export interface AssessmentWrongItem {
  skillId: string;
  promptVi: string;
  questionEn: string;
  yourAnswer: string;
  correctAnswer: string;
}

export interface AssessmentAttemptResult {
  attemptId: string | null;
  saved: boolean;
  scorePercent: number;
  passed: boolean;
  recommendedStageId: CurriculumStageId;
  skillBreakdown: Record<string, { correct: number; total: number; percent: number }>;
  wrongItems: AssessmentWrongItem[];
}

export interface LearnerCurriculumState {
  currentStageId: CurriculumStageId;
  unlockedStageIds: CurriculumStageId[];
  levelSource: 'auto' | 'manual' | 'placement' | 'parent';
  selectedLevelAt: string | null;
  levelChangedAt: string | null;
  needsLevelSelection: boolean;
  placementDone: boolean;
  lastCheckpointAt: string | null;
  nextCheckpointDueAt: string | null;
  recommendedTask: Record<string, unknown>;
  skillMastery: Record<string, number>;
  recentAttempt: {
    id: string;
    kind: AssessmentKind;
    scorePercent: number;
    passed: boolean;
    createdAt: string;
  } | null;
}

export interface CurriculumCatalog {
  stages: CurriculumStage[];
  skills: CurriculumSkill[];
  blueprints: AssessmentBlueprint[];
  learnerState: LearnerCurriculumState | null;
}

interface CurriculumStageRow {
  id: string;
  cefr: string;
  title_vi: string;
  objective_vi: string;
  age_vi: string;
  weeks_vi: string;
  target_words: number;
  target_stories: number;
  target_games: number;
  topics: string[] | null;
  focus: string[] | null;
  can_do: string[] | null;
  daily_loop: string[] | null;
  weekly_plan: string[] | null;
  assessment: string[] | null;
  exit_criteria: string[] | null;
  engkids: string[] | null;
  sort_order: number;
}

interface CurriculumSkillRow {
  id: string;
  name_en: string;
  name_vi: string;
  description_vi: string;
  cefr_domain: string;
  sort_order: number;
}

interface AssessmentBlueprintRow {
  id: string;
  kind: AssessmentKind;
  stage_id: string | null;
  title_vi: string;
  item_count: number;
  pass_percent: number;
  min_skill_percent: number;
  skill_weights: Partial<Record<CurriculumSkillId, number>> | null;
  rules: Record<string, unknown> | null;
}

interface AssessmentItemRow {
  id: string;
  stage_id: CurriculumStageId;
  skill_id: CurriculumSkillId;
  topic: string;
  item_type: AssessmentItemType;
  prompt: string;
  prompt_vi: string;
  choices: string[];
  correct_answer: string;
  explanation_vi: string;
  source_word_en: string | null;
}

const DEFAULT_SKILLS: CurriculumSkill[] = [
  { id: 'vocabulary', nameEn: 'Vocabulary', nameVi: 'Tu vung', descriptionVi: 'Nhan dien, hieu nghia va dung tu dung topic.', cefrDomain: 'language', sortOrder: 1 },
  { id: 'listening', nameEn: 'Listening', nameVi: 'Nghe', descriptionVi: 'Nhan dien am, tu va y chinh trong audio/video.', cefrDomain: 'reception', sortOrder: 2 },
  { id: 'reading', nameEn: 'Reading', nameVi: 'Doc', descriptionVi: 'Doc tu, cau va doan ngan theo CEFR can-do.', cefrDomain: 'reception', sortOrder: 3 },
  { id: 'grammar', nameEn: 'Grammar', nameVi: 'Ngu phap', descriptionVi: 'Dung mau cau va cau truc phu hop cap do.', cefrDomain: 'language', sortOrder: 4 },
  { id: 'writing', nameEn: 'Writing', nameVi: 'Viet', descriptionVi: 'Sap xep, dien tu va tao cau ngan.', cefrDomain: 'production', sortOrder: 5 },
  { id: 'speaking', nameEn: 'Speaking', nameVi: 'Noi', descriptionVi: 'Lap lai, tra loi va trinh bay ngan.', cefrDomain: 'production', sortOrder: 6 },
];

const DEFAULT_BLUEPRINTS: AssessmentBlueprint[] = [
  { id: 'placement-default', kind: 'placement', stageId: null, titleVi: 'Placement test', itemCount: 24, passPercent: 70, minSkillPercent: 50, skillWeights: { vocabulary: 8, listening: 4, reading: 6, grammar: 4, writing: 2 }, rules: { adaptive: true, setsInitialStage: true } },
  { id: 'daily-check-default', kind: 'daily-check', stageId: null, titleVi: 'Daily micro check', itemCount: 8, passPercent: 70, minSkillPercent: 50, skillWeights: { vocabulary: 3, reading: 2, grammar: 2, listening: 1 }, rules: { unlocksCoins: true } },
  { id: 'weekly-checkpoint-default', kind: 'weekly-checkpoint', stageId: null, titleVi: 'Weekly checkpoint', itemCount: 16, passPercent: 70, minSkillPercent: 60, skillWeights: { vocabulary: 5, listening: 3, reading: 4, grammar: 2, writing: 2 }, rules: { remedialIfBelow: 70 } },
  { id: 'stage-exit-default', kind: 'stage-exit', stageId: null, titleVi: 'Stage exit test', itemCount: 24, passPercent: 75, minSkillPercent: 60, skillWeights: { vocabulary: 8, listening: 4, reading: 6, grammar: 3, writing: 3 }, rules: { unlocksNextStage: true } },
];

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function getSupabaseAnon(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function getSupabaseReader(): SupabaseClient | null {
  return getSupabaseAdmin() || getSupabaseAnon();
}

function missingTable(error: unknown, table: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  return maybe.code === 'PGRST205' || Boolean(maybe.message?.includes(table));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapStage(row: CurriculumStageRow): CurriculumStage | null {
  const id = normalizeStageId(row.id);
  if (!id) return null;
  return {
    id,
    cefr: row.cefr,
    titleVi: row.title_vi,
    objectiveVi: row.objective_vi,
    ageVi: row.age_vi,
    weeksVi: row.weeks_vi,
    targetWords: row.target_words,
    targetStories: row.target_stories,
    targetGames: row.target_games,
    topics: asStringArray(row.topics),
    focus: asStringArray(row.focus),
    canDo: asStringArray(row.can_do),
    dailyLoop: asStringArray(row.daily_loop),
    weeklyPlan: asStringArray(row.weekly_plan),
    assessment: asStringArray(row.assessment),
    exitCriteria: asStringArray(row.exit_criteria),
    engkids: asStringArray(row.engkids),
  };
}

function mapSkill(row: CurriculumSkillRow): CurriculumSkill | null {
  if (!['vocabulary', 'listening', 'reading', 'grammar', 'writing', 'speaking'].includes(row.id)) return null;
  return {
    id: row.id as CurriculumSkillId,
    nameEn: row.name_en,
    nameVi: row.name_vi,
    descriptionVi: row.description_vi,
    cefrDomain: row.cefr_domain,
    sortOrder: row.sort_order,
  };
}

function mapBlueprint(row: AssessmentBlueprintRow): AssessmentBlueprint {
  return {
    id: row.id,
    kind: row.kind,
    stageId: normalizeStageId(row.stage_id || undefined) || null,
    titleVi: row.title_vi,
    itemCount: row.item_count,
    passPercent: row.pass_percent,
    minSkillPercent: row.min_skill_percent,
    skillWeights: row.skill_weights || {},
    rules: row.rules || {},
  };
}

function stageIndex(stageId: CurriculumStageId): number {
  return CURRICULUM_STAGES.findIndex((stage) => stage.id === stageId);
}

function defaultUnlocked(stageId: CurriculumStageId): CurriculumStageId[] {
  const index = Math.max(0, stageIndex(stageId));
  return CURRICULUM_STAGES.slice(0, Math.max(index + 1, 2)).map((stage) => stage.id);
}

function normalizeLevelSource(value: unknown): LearnerCurriculumState['levelSource'] {
  return value === 'manual' || value === 'placement' || value === 'parent' ? value : 'auto';
}

export async function getCurriculumCatalog(profileId?: string | null): Promise<CurriculumCatalog> {
  const reader = getSupabaseReader();
  let stages = CURRICULUM_STAGES;
  let skills = DEFAULT_SKILLS;
  let blueprints = DEFAULT_BLUEPRINTS;

  if (reader) {
    try {
      const { data, error } = await reader
        .from('curriculum_stages')
        .select('id, cefr, title_vi, objective_vi, age_vi, weeks_vi, target_words, target_stories, target_games, topics, focus, can_do, daily_loop, weekly_plan, assessment, exit_criteria, engkids, sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = (data as CurriculumStageRow[]).map(mapStage).filter(Boolean) as CurriculumStage[];
        if (mapped.length > 0) stages = mapped;
      } else if (error && !missingTable(error, 'curriculum_stages')) {
        console.warn('Curriculum stages fallback:', error.message);
      }
    } catch {
      stages = CURRICULUM_STAGES;
    }

    try {
      const { data, error } = await reader
        .from('curriculum_skills')
        .select('id, name_en, name_vi, description_vi, cefr_domain, sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = (data as CurriculumSkillRow[]).map(mapSkill).filter(Boolean) as CurriculumSkill[];
        if (mapped.length > 0) skills = mapped;
      }
    } catch {
      skills = DEFAULT_SKILLS;
    }

    try {
      const { data, error } = await reader
        .from('assessment_blueprints')
        .select('id, kind, stage_id, title_vi, item_count, pass_percent, min_skill_percent, skill_weights, rules')
        .eq('active', true);
      if (!error && Array.isArray(data) && data.length > 0) blueprints = (data as AssessmentBlueprintRow[]).map(mapBlueprint);
    } catch {
      blueprints = DEFAULT_BLUEPRINTS;
    }
  }

  const learnerState = profileId ? await getLearnerCurriculumState(profileId) : null;
  return { stages, skills, blueprints, learnerState };
}

export async function getAuthUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: { user } } = await anon.auth.getUser(token);
        if (user?.id) return user.id;
      } catch {
        // Cookie fallback below.
      }
    }
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getOrCreateProfileId(authUserId: string | null): Promise<string | null> {
  if (!authUserId) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: existing } = await admin
    .from('user_profiles')
    .select('id')
    .eq('auth_id', authUserId)
    .maybeSingle();

  if (existing && typeof (existing as { id?: unknown }).id === 'string') return (existing as { id: string }).id;

  let email: string | null = null;
  try {
    const { data } = await admin.auth.admin.getUserById(authUserId);
    email = data.user?.email ?? null;
  } catch {
    email = null;
  }

  if (email) {
    const { data: byEmail } = await admin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .is('auth_id', null)
      .limit(1)
      .maybeSingle();

    if (byEmail && typeof (byEmail as { id?: unknown }).id === 'string') {
      const profileId = (byEmail as { id: string }).id;
      await admin.from('user_profiles').update({ auth_id: authUserId }).eq('id', profileId);
      return profileId;
    }
  }

  const { data: inserted, error } = await admin
    .from('user_profiles')
    .insert({ auth_id: authUserId, email })
    .select('id')
    .single();

  if (error || !inserted) return null;
  return (inserted as { id: string }).id;
}

export async function getProfileIdFromRequest(request: NextRequest): Promise<string | null> {
  return getOrCreateProfileId(await getAuthUserIdFromRequest(request));
}

export async function ensureLearnerCurriculumState(profileId: string, stageId: CurriculumStageId = 'a2-key'): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin
    .from('learner_curriculum_state')
    .upsert({
      user_profile_id: profileId,
      current_stage_id: stageId,
      unlocked_stage_ids: defaultUnlocked(stageId),
      recommended_task: { kind: 'placement', href: '/learn/placement' },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_profile_id', ignoreDuplicates: true });
}

export async function getLearnerCurriculumState(profileId: string): Promise<LearnerCurriculumState | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  await ensureLearnerCurriculumState(profileId);

  const extendedStateResult = await admin
    .from('learner_curriculum_state')
    .select('current_stage_id, unlocked_stage_ids, level_source, selected_level_at, level_changed_at, placement_attempt_id, last_checkpoint_at, next_checkpoint_due_at, recommended_task')
    .eq('user_profile_id', profileId)
    .maybeSingle();
  let state: Record<string, unknown> | null = extendedStateResult.data as Record<string, unknown> | null;
  const stateError = extendedStateResult.error;

  if (stateError && stateError.message?.includes('selected_level_at')) {
    const legacy = await admin
      .from('learner_curriculum_state')
      .select('current_stage_id, unlocked_stage_ids, placement_attempt_id, last_checkpoint_at, next_checkpoint_due_at, recommended_task')
      .eq('user_profile_id', profileId)
      .maybeSingle();
    state = legacy.data as Record<string, unknown> | null;
  }

  if (!state) return null;

  const currentStageId = normalizeStageId((state as { current_stage_id?: unknown }).current_stage_id) || 'a2-key';
  const unlockedStageIds = Array.isArray((state as { unlocked_stage_ids?: unknown }).unlocked_stage_ids)
    ? ((state as { unlocked_stage_ids: unknown[] }).unlocked_stage_ids.map(normalizeStageId).filter(Boolean) as CurriculumStageId[])
    : defaultUnlocked(currentStageId);

  const { data: masteryRows } = await admin
    .from('learner_skill_mastery')
    .select('skill_id, mastery_percent')
    .eq('user_profile_id', profileId)
    .eq('stage_id', currentStageId);

  const skillMastery = Object.fromEntries(
    ((masteryRows || []) as Array<{ skill_id: string; mastery_percent: number }>).map((row) => [row.skill_id, Number(row.mastery_percent) || 0]),
  );

  const { data: recent } = await admin
    .from('assessment_attempts')
    .select('id, kind, score_percent, passed, created_at')
    .eq('user_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    currentStageId,
    unlockedStageIds,
    levelSource: normalizeLevelSource((state as { level_source?: unknown }).level_source),
    selectedLevelAt: ((state as { selected_level_at?: string | null }).selected_level_at) || null,
    levelChangedAt: ((state as { level_changed_at?: string | null }).level_changed_at) || null,
    needsLevelSelection: !((state as { selected_level_at?: string | null }).selected_level_at),
    placementDone: Boolean((state as { placement_attempt_id?: unknown }).placement_attempt_id),
    lastCheckpointAt: ((state as { last_checkpoint_at?: string | null }).last_checkpoint_at) || null,
    nextCheckpointDueAt: ((state as { next_checkpoint_due_at?: string | null }).next_checkpoint_due_at) || null,
    recommendedTask: ((state as { recommended_task?: Record<string, unknown> }).recommended_task) || {},
    skillMastery,
    recentAttempt: recent ? {
      id: (recent as { id: string }).id,
      kind: (recent as { kind: AssessmentKind }).kind,
      scorePercent: Number((recent as { score_percent: number }).score_percent) || 0,
      passed: Boolean((recent as { passed: boolean }).passed),
      createdAt: (recent as { created_at: string }).created_at,
    } : null,
  };
}

export async function setLearnerLevel(
  profileId: string,
  stageId: CurriculumStageId,
  source: LearnerCurriculumState['levelSource'] = 'manual',
): Promise<LearnerCurriculumState | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const normalizedStageId = normalizeStageId(stageId) || 'a2-key';
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from('learner_curriculum_state')
    .select('selected_level_at')
    .eq('user_profile_id', profileId)
    .maybeSingle();

  await admin.from('learner_curriculum_state').upsert({
    user_profile_id: profileId,
    current_stage_id: normalizedStageId,
    unlocked_stage_ids: defaultUnlocked(normalizedStageId),
    level_source: normalizeLevelSource(source),
    selected_level_at: ((existing as { selected_level_at?: string | null } | null)?.selected_level_at) || now,
    level_changed_at: ((existing as { selected_level_at?: string | null } | null)?.selected_level_at) ? now : null,
    recommended_task: { kind: 'today', href: '/learn/today' },
    updated_at: now,
  }, { onConflict: 'user_profile_id' });

  return getLearnerCurriculumState(profileId);
}

function buildDistractors(target: WordPair, bank: WordPair[], count: number, mode: 'en' | 'vi'): string[] {
  const targetLower = target.en.toLowerCase();
  const pool = bank
    .filter((word) => word.en.toLowerCase() !== targetLower)
    .map((word) => mode === 'en' ? word.en.toLowerCase() : word.vi)
    .filter(Boolean);
  return [...new Set(pool)].sort(() => Math.random() - 0.5).slice(0, count);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blankExample(word: WordPair): string {
  const example = word.example || `I can see ${word.en.toLowerCase()}.`;
  const sentence = example.replace(new RegExp(`\\b${escapeRegExp(word.en)}\\b`, 'i'), '___');
  return sentence.includes('___') ? sentence : `I can see ___.`;
}

function itemFromWord(word: WordPair, bank: WordPair[], skillId: CurriculumSkillId, itemType: AssessmentItemType): Omit<AssessmentItemRow, 'id'> {
  const choicesMode = itemType === 'meaning-choice' ? 'vi' : 'en';
  const correct = choicesMode === 'vi' ? word.vi : word.en.toLowerCase();
  const choices = [correct, ...buildDistractors(word, bank, 3, choicesMode)].sort(() => Math.random() - 0.5);
  const stageId = normalizeStageId(word.level) || 'a2-key';

  if (itemType === 'meaning-choice') {
    return {
      stage_id: stageId,
      skill_id: skillId,
      topic: word.topic || 'general',
      item_type: itemType,
      prompt: `"${word.en}" means...`,
      prompt_vi: `Chon nghia tieng Viet cua "${word.en}"`,
      choices,
      correct_answer: correct,
      explanation_vi: `${word.en} = ${word.vi}`,
      source_word_en: word.en,
    };
  }

  if (itemType === 'fill-blank') {
    return {
      stage_id: stageId,
      skill_id: skillId,
      topic: word.topic || 'general',
      item_type: itemType,
      prompt: blankExample(word),
      prompt_vi: 'Dien tu con thieu trong cau.',
      choices,
      correct_answer: correct,
      explanation_vi: `${word.en} = ${word.vi}`,
      source_word_en: word.en,
    };
  }

  return {
    stage_id: stageId,
    skill_id: skillId,
    topic: word.topic || 'general',
    item_type: itemType,
    prompt: word.vi,
    prompt_vi: 'Chon tu tieng Anh phu hop.',
    choices,
    correct_answer: correct,
    explanation_vi: `${word.en} = ${word.vi}`,
    source_word_en: word.en,
  };
}

function publicItem(row: AssessmentItemRow): AssessmentItemPublic {
  return {
    id: row.id,
    stageId: row.stage_id,
    skillId: row.skill_id,
    topic: row.topic,
    itemType: row.item_type,
    prompt: row.prompt,
    promptVi: row.prompt_vi,
    choices: asStringArray(row.choices),
    explanationVi: row.explanation_vi,
  };
}

function itemPlanFor(kind: AssessmentKind): Array<{ skill: CurriculumSkillId; type: AssessmentItemType }> {
  if (kind === 'placement') {
    return [
      { skill: 'vocabulary', type: 'meaning-choice' },
      { skill: 'reading', type: 'word-choice' },
      { skill: 'grammar', type: 'fill-blank' },
      { skill: 'listening', type: 'word-choice' },
    ];
  }
  if (kind === 'stage-exit') {
    return [
      { skill: 'vocabulary', type: 'meaning-choice' },
      { skill: 'reading', type: 'word-choice' },
      { skill: 'grammar', type: 'fill-blank' },
      { skill: 'writing', type: 'fill-blank' },
    ];
  }
  return [
    { skill: 'vocabulary', type: 'meaning-choice' },
    { skill: 'reading', type: 'word-choice' },
    { skill: 'grammar', type: 'fill-blank' },
  ];
}

async function ensureAssessmentItems(kind: AssessmentKind, stageId: CurriculumStageId, count: number): Promise<AssessmentItemRow[] | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: existing, error: existingError } = await admin
    .from('assessment_items')
    .select('id, stage_id, skill_id, topic, item_type, prompt, prompt_vi, choices, correct_answer, explanation_vi, source_word_en')
    .eq('stage_id', stageId)
    .eq('active', true)
    .limit(count);

  if (!existingError && Array.isArray(existing) && existing.length >= count) return existing as AssessmentItemRow[];
  if (existingError && !missingTable(existingError, 'assessment_items')) console.warn('Assessment items fallback:', existingError.message);

  const fullBank = await getWordBank().catch(() => DEFAULT_WORD_BANK);
  const stageBank = filterWordBank(fullBank, { level: stageId, min: count }).map(enrichWordPair);
  const plan = itemPlanFor(kind);
  const generated = stageBank.slice(0, Math.max(count, 12)).map((word, index) => {
    const next = plan[index % plan.length];
    return itemFromWord(word, stageBank, next.skill, next.type);
  });

  if (generated.length === 0) return null;

  const { error: upsertError } = await admin
    .from('assessment_items')
    .upsert(generated.map((item, index) => ({ ...item, sort_order: index + 1, active: true })), {
      onConflict: 'stage_id,skill_id,item_type,source_word_en',
    });

  if (upsertError && missingTable(upsertError, 'assessment_items')) return null;

  const { data } = await admin
    .from('assessment_items')
    .select('id, stage_id, skill_id, topic, item_type, prompt, prompt_vi, choices, correct_answer, explanation_vi, source_word_en')
    .eq('stage_id', stageId)
    .eq('active', true)
    .limit(count);

  return Array.isArray(data) ? (data as AssessmentItemRow[]) : null;
}

function buildFallbackAssessmentRows(kind: AssessmentKind, stageId: CurriculumStageId, count: number): AssessmentItemRow[] {
  const fallbackBank = filterWordBank(DEFAULT_WORD_BANK, { level: stageId, min: count }).map(enrichWordPair);
  const plan = itemPlanFor(kind);
  return fallbackBank.slice(0, count).map((word, index) => {
    const next = plan[index % plan.length];
    const item = itemFromWord(word, fallbackBank, next.skill, next.type);
    return { id: `${word.en}-${index}`, ...item };
  });
}

export async function getAssessment(kind: AssessmentKind, stageId?: CurriculumStageId): Promise<{ blueprint: AssessmentBlueprint; items: AssessmentItemPublic[] }> {
  const catalog = await getCurriculumCatalog();
  const blueprint = catalog.blueprints.find((item) => item.kind === kind && (!item.stageId || item.stageId === stageId))
    || DEFAULT_BLUEPRINTS.find((item) => item.kind === kind)
    || DEFAULT_BLUEPRINTS[0];
  const resolvedStage = stageId || blueprint.stageId || 'a2-key';
  const items = await ensureAssessmentItems(kind, resolvedStage, blueprint.itemCount);

  if (items && items.length > 0) {
    return { blueprint, items: items.slice(0, blueprint.itemCount).map(publicItem) };
  }

  return { blueprint, items: buildFallbackAssessmentRows(kind, resolvedStage, blueprint.itemCount).map(publicItem) };
}

function recommendStageFromScore(kind: AssessmentKind, stageId: CurriculumStageId, score: number): CurriculumStageId {
  if (kind === 'placement') {
    if (score >= 92) return 'c1-advanced';
    if (score >= 84) return 'b2-first';
    if (score >= 68) return 'b1-preliminary';
    return 'a2-key';
  }

  if (score >= 85) {
    const next = CURRICULUM_STAGES[stageIndex(stageId) + 1];
    return next?.id || stageId;
  }
  return stageId;
}

export async function saveAssessmentAttempt(profileId: string | null, input: AssessmentAttemptInput): Promise<AssessmentAttemptResult> {
  const stageId = input.stageId || 'a2-key';
  const assessment = await getAssessment(input.kind, stageId);
  const itemById = new Map<string, AssessmentItemRow>();

  for (const item of assessment.items) {
    itemById.set(item.id, {
      id: item.id,
      stage_id: item.stageId,
      skill_id: item.skillId,
      topic: item.topic,
      item_type: item.itemType,
      prompt: item.prompt,
      prompt_vi: item.promptVi,
      choices: item.choices,
      correct_answer: '',
      explanation_vi: item.explanationVi,
      source_word_en: null,
    });
  }

  const admin = getSupabaseAdmin();
  let fullRows: AssessmentItemRow[] = [];
  if (admin) {
    const ids = input.responses.map((response) => response.itemId).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length > 0) {
      const { data } = await admin
        .from('assessment_items')
        .select('id, stage_id, skill_id, topic, item_type, prompt, prompt_vi, choices, correct_answer, explanation_vi, source_word_en')
        .in('id', ids);
      fullRows = Array.isArray(data) ? (data as AssessmentItemRow[]) : [];
      for (const row of fullRows) itemById.set(row.id, row);
    }
  }

  const fallbackRows = buildFallbackAssessmentRows(input.kind, stageId, Math.max(assessment.blueprint.itemCount, input.responses.length));
  for (const row of fallbackRows) {
    if (!itemById.get(row.id)?.correct_answer) itemById.set(row.id, row);
  }

  const responseRows = input.responses.map((response) => {
    const item = itemById.get(response.itemId);
    const correctAnswer = item?.correct_answer || '';
    const normalizedAnswer = response.answer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    const isCorrect = Boolean(item && normalizedAnswer === normalizedCorrect);
    return { response, item, correctAnswer, isCorrect };
  }).filter((row) => row.item);

  const total = Math.max(responseRows.length, 1);
  const correct = responseRows.filter((row) => row.isCorrect).length;
  const scorePercent = Math.round((correct / total) * 10000) / 100;
  const blueprint = assessment.blueprint;
  const passed = scorePercent >= blueprint.passPercent;
  const recommendedStageId = recommendStageFromScore(input.kind, stageId, scorePercent);

  const skillBreakdown: AssessmentAttemptResult['skillBreakdown'] = {};
  for (const row of responseRows) {
    const skill = row.item!.skill_id;
    skillBreakdown[skill] ||= { correct: 0, total: 0, percent: 0 };
    skillBreakdown[skill].total += 1;
    if (row.isCorrect) skillBreakdown[skill].correct += 1;
  }
  for (const value of Object.values(skillBreakdown)) {
    value.percent = value.total > 0 ? Math.round((value.correct / value.total) * 10000) / 100 : 0;
  }

  // Wrong answers, surfaced to the client so it can add them to the local
  // mistakes-review queue. Never includes correct answers the child got right.
  const wrongItems = responseRows
    .filter((row) => !row.isCorrect)
    .map((row) => ({
      skillId: row.item!.skill_id,
      promptVi: row.item!.prompt_vi || '',
      questionEn: row.item!.prompt || '',
      yourAnswer: row.response.answer || '',
      correctAnswer: row.correctAnswer || '',
    }));

  if (!admin || !profileId) {
    return { attemptId: null, saved: false, scorePercent, passed, recommendedStageId, skillBreakdown, wrongItems };
  }

  const { data: attempt, error } = await admin
    .from('assessment_attempts')
    .insert({
      user_profile_id: profileId,
      blueprint_id: input.blueprintId || blueprint.id,
      kind: input.kind,
      stage_id: stageId,
      completed_at: new Date().toISOString(),
      score_percent: scorePercent,
      passed,
      recommended_stage_id: recommendedStageId,
      skill_breakdown: skillBreakdown,
      details: { total, correct },
    })
    .select('id')
    .single();

  if (error || !attempt) {
    return { attemptId: null, saved: false, scorePercent, passed, recommendedStageId, skillBreakdown, wrongItems };
  }

  const attemptId = (attempt as { id: string }).id;
  await admin.from('assessment_responses').insert(responseRows.map((row) => ({
    attempt_id: attemptId,
    item_id: /^[0-9a-f-]{36}$/i.test(row.response.itemId) ? row.response.itemId : null,
    skill_id: row.item!.skill_id,
    user_answer: row.response.answer,
    correct_answer: row.correctAnswer,
    is_correct: row.isCorrect,
    response_ms: row.response.responseMs || null,
  })));

  for (const [skillId, value] of Object.entries(skillBreakdown)) {
    await admin.from('learner_skill_mastery').upsert({
      user_profile_id: profileId,
      stage_id: stageId,
      skill_id: skillId,
      mastery_percent: value.percent,
      attempts: value.total,
      correct: value.correct,
      last_practiced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_profile_id,stage_id,skill_id' });
  }

  const unlocked = defaultUnlocked(recommendedStageId);
  const { data: existingState } = await admin
    .from('learner_curriculum_state')
    .select('selected_level_at')
    .eq('user_profile_id', profileId)
    .maybeSingle();
  const existingSelectedAt = (existingState as { selected_level_at?: string | null } | null)?.selected_level_at || null;
  const statePatch: Record<string, unknown> = {
    user_profile_id: profileId,
    current_stage_id: recommendedStageId,
    unlocked_stage_ids: unlocked,
    recommended_task: passed
      ? { kind: 'today', href: '/learn/today' }
      : { kind: 'review', href: '/progress/review' },
    updated_at: new Date().toISOString(),
  };
  if (input.kind === 'placement') {
    statePatch.placement_attempt_id = attemptId;
    statePatch.level_source = 'placement';
    statePatch.selected_level_at = existingSelectedAt || new Date().toISOString();
    if (existingSelectedAt) statePatch.level_changed_at = new Date().toISOString();
  }
  if (input.kind === 'weekly-checkpoint' || input.kind === 'stage-exit') {
    statePatch.last_checkpoint_at = new Date().toISOString();
    const next = new Date();
    next.setDate(next.getDate() + 7);
    statePatch.next_checkpoint_due_at = next.toISOString().slice(0, 10);
  }

  await admin.from('learner_curriculum_state').upsert(statePatch, { onConflict: 'user_profile_id' });

  return { attemptId, saved: true, scorePercent, passed, recommendedStageId, skillBreakdown, wrongItems };
}


