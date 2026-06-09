import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { normalizeStageId, type CurriculumStageId } from '@/lib/curriculum';
import { getProfileIdFromRequest } from '@/services/curriculum-content';

export type LessonStepType = 'warmup' | 'vocab' | 'reading' | 'listening' | 'grammar' | 'speaking' | 'writing' | 'quiz' | 'review';
export type LessonProgressStatus = 'open' | 'in_progress' | 'done' | 'skipped';

export interface CurriculumUnitPublic {
  id: string;
  stageId: CurriculumStageId;
  titleVi: string;
  theme: string;
  targetSkills: string[];
  sortOrder: number;
}

export interface LessonSummaryPublic {
  id: string;
  unitId: string;
  stageId: CurriculumStageId;
  titleVi: string;
  titleEn: string;
  objectiveVi: string;
  cefr: string;
  estimatedMinutes: number;
  coverAssetUrl: string | null;
  skillFocus: string[];
  learningMode: 'kid' | 'teen';
  canDoStatement: string;
  expectedOutput: string;
  rubric: string[];
  difficultyScore: number;
  ageBand: string;
  qualityStatus: 'approved' | 'needs-review' | 'blocked';
  cefrReason: string;
  sortOrder: number;
  unit?: CurriculumUnitPublic | null;
  progress?: LessonProgressPublic | null;
}

export interface LessonStepPublic {
  id: string;
  lessonId: string;
  stepType: LessonStepType;
  titleVi: string;
  instructionVi: string;
  payload: Record<string, unknown>;
  cefrSkill: string | null;
  canDoStatement: string;
  expectedOutput: string;
  sortOrder: number;
}

export interface LessonAssetPublic {
  id: string;
  lessonId: string | null;
  assetKind: 'image' | 'audio' | 'video' | 'document';
  originalUrl: string;
  optimizedUrl: string | null;
  derivativeFormat: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  optimizedBytes: number | null;
}

export interface LessonProgressPublic {
  status: LessonProgressStatus;
  completedSteps: number;
  totalSteps: number;
  scorePercent: number;
  lastStepId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface LessonDetailPublic extends LessonSummaryPublic {
  steps: LessonStepPublic[];
  assets: LessonAssetPublic[];
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapUnit(row: Record<string, unknown> | null | undefined): CurriculumUnitPublic | null {
  if (!row) return null;
  const stageId = normalizeStageId(row.stage_id);
  if (!stageId) return null;
  return {
    id: String(row.id || ''),
    stageId,
    titleVi: String(row.title_vi || ''),
    theme: String(row.theme || 'general'),
    targetSkills: asStringArray(row.target_skills),
    sortOrder: Number(row.sort_order) || 0,
  };
}

function mapProgress(row: Record<string, unknown> | null | undefined): LessonProgressPublic | null {
  if (!row) return null;
  return {
    status: (row.status === 'done' || row.status === 'skipped' || row.status === 'in_progress') ? row.status : 'open',
    completedSteps: Number(row.completed_steps) || 0,
    totalSteps: Number(row.total_steps) || 0,
    scorePercent: Number(row.score_percent) || 0,
    lastStepId: typeof row.last_step_id === 'string' ? row.last_step_id : null,
    startedAt: typeof row.started_at === 'string' ? row.started_at : null,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

function mapLesson(row: Record<string, unknown>, progress?: LessonProgressPublic | null): LessonSummaryPublic | null {
  const stageId = normalizeStageId(row.stage_id);
  if (!stageId) return null;
  return {
    id: String(row.id || ''),
    unitId: String(row.unit_id || ''),
    stageId,
    titleVi: String(row.title_vi || ''),
    titleEn: String(row.title_en || ''),
    objectiveVi: String(row.objective_vi || ''),
    cefr: String(row.cefr || ''),
    estimatedMinutes: Number(row.estimated_minutes) || 15,
    coverAssetUrl: typeof row.cover_asset_url === 'string' ? row.cover_asset_url : null,
    skillFocus: asStringArray(row.skill_focus),
    learningMode: row.learning_mode === 'teen' ? 'teen' : 'kid',
    canDoStatement: String(row.can_do_statement || ''),
    expectedOutput: String(row.expected_output || ''),
    rubric: asStringArray(row.rubric),
    difficultyScore: Number(row.difficulty_score) || 0,
    ageBand: String(row.age_band || ''),
    qualityStatus: row.quality_status === 'blocked' || row.quality_status === 'needs-review' ? row.quality_status : 'approved',
    cefrReason: String(row.cefr_reason || ''),
    sortOrder: Number(row.sort_order) || 0,
    unit: mapUnit(row.curriculum_units as Record<string, unknown> | null),
    progress: progress || null,
  };
}

function mapStep(row: Record<string, unknown>): LessonStepPublic {
  return {
    id: String(row.id || ''),
    lessonId: String(row.lesson_id || ''),
    stepType: String(row.step_type || 'review') as LessonStepType,
    titleVi: String(row.title_vi || ''),
    instructionVi: String(row.instruction_vi || ''),
    payload: (row.payload && typeof row.payload === 'object' ? row.payload : {}) as Record<string, unknown>,
    cefrSkill: typeof row.cefr_skill === 'string' ? row.cefr_skill : null,
    canDoStatement: String(row.can_do_statement || ''),
    expectedOutput: String(row.expected_output || ''),
    sortOrder: Number(row.sort_order) || 0,
  };
}

function mapAsset(row: Record<string, unknown>): LessonAssetPublic {
  return {
    id: String(row.id || ''),
    lessonId: typeof row.lesson_id === 'string' ? row.lesson_id : null,
    assetKind: String(row.asset_kind || 'image') as LessonAssetPublic['assetKind'],
    originalUrl: String(row.original_url || ''),
    optimizedUrl: typeof row.optimized_url === 'string' ? row.optimized_url : null,
    derivativeFormat: typeof row.derivative_format === 'string' ? row.derivative_format : null,
    width: typeof row.width === 'number' ? row.width : null,
    height: typeof row.height === 'number' ? row.height : null,
    bytes: typeof row.bytes === 'number' ? row.bytes : null,
    optimizedBytes: typeof row.optimized_bytes === 'number' ? row.optimized_bytes : null,
  };
}

async function getProgressMap(profileId: string | null, lessonIds: string[]): Promise<Map<string, LessonProgressPublic>> {
  const admin = getSupabaseAdmin();
  const map = new Map<string, LessonProgressPublic>();
  if (!admin || !profileId || lessonIds.length === 0) return map;
  const { data } = await admin
    .from('lesson_progress')
    .select('lesson_id,status,completed_steps,total_steps,score_percent,last_step_id,started_at,completed_at,updated_at')
    .eq('user_profile_id', profileId)
    .in('lesson_id', lessonIds);
  for (const row of (data || []) as Array<Record<string, unknown>>) {
    const progress = mapProgress(row);
    const lessonId = String(row.lesson_id || '');
    if (lessonId && progress) map.set(lessonId, progress);
  }
  return map;
}

export async function listLessons(request: NextRequest): Promise<{ lessons: LessonSummaryPublic[]; units: CurriculumUnitPublic[] }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { lessons: [], units: [] };

  const stageId = normalizeStageId(request.nextUrl.searchParams.get('stage') || undefined);
  const unitId = request.nextUrl.searchParams.get('unit') || undefined;
  const skill = request.nextUrl.searchParams.get('skill') || undefined;
  const profileId = await getProfileIdFromRequest(request);

  let query = admin
    .from('lessons')
    .select('id,unit_id,stage_id,title_vi,title_en,objective_vi,cefr,estimated_minutes,cover_asset_url,skill_focus,learning_mode,can_do_statement,expected_output,rubric,difficulty_score,age_band,quality_status,cefr_reason,sort_order,curriculum_units(id,stage_id,title_vi,theme,target_skills,sort_order)')
    .eq('active', true)
    .eq('review_status', 'approved')
    .neq('quality_status', 'blocked')
    .neq('safety_status', 'blocked')
    .order('stage_id', { ascending: true })
    .order('sort_order', { ascending: true });
  if (stageId) query = query.eq('stage_id', stageId);
  if (unitId) query = query.eq('unit_id', unitId);
  if (skill) query = query.contains('skill_focus', [skill]);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data || []) as Array<Record<string, unknown>>;
  const progress = await getProgressMap(profileId, rows.map((row) => String(row.id || '')).filter(Boolean));
  const lessons = rows.map((row) => mapLesson(row, progress.get(String(row.id || '')))).filter(Boolean) as LessonSummaryPublic[];

  const unitsById = new Map<string, CurriculumUnitPublic>();
  for (const lesson of lessons) if (lesson.unit) unitsById.set(lesson.unit.id, lesson.unit);
  return { lessons, units: [...unitsById.values()].sort((a, b) => a.sortOrder - b.sortOrder) };
}

export async function getLessonDetail(request: NextRequest, lessonId: string): Promise<LessonDetailPublic | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const profileId = await getProfileIdFromRequest(request);

  const { data: lessonRow, error } = await admin
    .from('lessons')
    .select('id,unit_id,stage_id,title_vi,title_en,objective_vi,cefr,estimated_minutes,cover_asset_url,skill_focus,learning_mode,can_do_statement,expected_output,rubric,difficulty_score,age_band,quality_status,cefr_reason,sort_order,curriculum_units(id,stage_id,title_vi,theme,target_skills,sort_order)')
    .eq('id', lessonId)
    .eq('active', true)
    .eq('review_status', 'approved')
    .neq('quality_status', 'blocked')
    .neq('safety_status', 'blocked')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lessonRow) return null;

  const progressMap = await getProgressMap(profileId, [lessonId]);
  const lesson = mapLesson(lessonRow as Record<string, unknown>, progressMap.get(lessonId));
  if (!lesson) return null;

  const [{ data: stepRows }, { data: assetRows }] = await Promise.all([
    admin.from('lesson_steps').select('id,lesson_id,step_type,title_vi,instruction_vi,payload,cefr_skill,can_do_statement,expected_output,sort_order').eq('lesson_id', lessonId).eq('active', true).eq('review_status', 'approved').neq('quality_status', 'blocked').neq('safety_status', 'blocked').order('sort_order', { ascending: true }),
    admin.from('lesson_assets').select('id,lesson_id,asset_kind,original_url,optimized_url,derivative_format,width,height,bytes,optimized_bytes').eq('lesson_id', lessonId).eq('active', true).eq('review_status', 'approved'),
  ]);

  return {
    ...lesson,
    steps: ((stepRows || []) as Array<Record<string, unknown>>).map(mapStep),
    assets: ((assetRows || []) as Array<Record<string, unknown>>).map(mapAsset),
  };
}

export async function saveLessonProgress(request: NextRequest, lessonId: string, body: Record<string, unknown>): Promise<LessonProgressPublic | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const profileId = await getProfileIdFromRequest(request);
  if (!profileId) return null;

  const status = body.status === 'done' || body.status === 'skipped' || body.status === 'in_progress' ? body.status : 'in_progress';
  const now = new Date().toISOString();
  const completedSteps = Math.max(0, Number(body.completedSteps) || 0);
  const totalSteps = Math.max(0, Number(body.totalSteps) || 0);
  const scorePercent = Math.max(0, Math.min(100, Number(body.scorePercent) || 0));
  const lastStepId = typeof body.lastStepId === 'string' ? body.lastStepId : null;

  const payload = {
    user_profile_id: profileId,
    lesson_id: lessonId,
    status,
    completed_steps: completedSteps,
    total_steps: totalSteps,
    score_percent: scorePercent,
    last_step_id: lastStepId,
    started_at: now,
    completed_at: status === 'done' ? now : null,
    updated_at: now,
  };

  const { data, error } = await admin
    .from('lesson_progress')
    .upsert(payload, { onConflict: 'user_profile_id,lesson_id' })
    .select('status,completed_steps,total_steps,score_percent,last_step_id,started_at,completed_at,updated_at')
    .single();
  if (error) throw new Error(error.message);
  return mapProgress(data as Record<string, unknown>);
}
