import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CURRICULUM_STAGES, getStageById, normalizeStageId, type CurriculumStageId } from '@/lib/curriculum';
import { getLearnerCurriculumState, type LearnerCurriculumState } from '@/services/curriculum-content';

export type LearningMode = 'kid' | 'teen';
export type CefrSkill = 'reading' | 'listening' | 'speaking' | 'writing' | 'vocabulary' | 'use-of-english';
export type NextActionKind = 'placement' | 'review' | 'lesson' | 'story' | 'video' | 'game' | 'checkpoint';
export type LessonEventType = 'step-complete' | 'quiz-result' | 'output-submit' | 'reflection' | 'reward';

export interface NextLearningAction {
  kind: NextActionKind;
  title: string;
  description: string;
  href: string;
  priority: number;
  reason: string;
  stageId: CurriculumStageId;
  learningMode: LearningMode;
  weakSkill: CefrSkill | null;
}

export interface ParentProgressSummary {
  stageId: CurriculumStageId;
  cefr: string;
  learningMode: LearningMode;
  dueWords: number;
  wordsMastered: number;
  lessonsCompleted: number;
  totalLessons: number;
  weeklyActivity: Array<{ date: string; count: number }>;
  skillMastery: Record<string, number>;
  strongestSkill: string | null;
  weakestSkill: string | null;
  nextAction: NextLearningAction;
}

export interface StandardsCoverageRow {
  stageId: CurriculumStageId;
  cefr: string;
  skill: CefrSkill | 'all';
  words: number;
  lessons: number;
  assessments: number;
  missingCefrReason: number;
  missingCanDo: number;
  translationPending: number;
  blocked: number;
  qualityNeedsReview: number;
  status: 'healthy' | 'watch' | 'needs-work';
}

export interface StandardsCoverageSummary {
  rows: StandardsCoverageRow[];
  totals: {
    words: number;
    lessons: number;
    assessments: number;
    blocked: number;
    qualityNeedsReview: number;
    translationPending: number;
  };
}

export interface LessonEventInput {
  lessonId: string;
  stepId?: string | null;
  eventType: LessonEventType;
  skillId?: CefrSkill | string | null;
  payload?: Record<string, unknown>;
  scorePercent?: number | null;
}

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function modeForStage(stageId: CurriculumStageId): LearningMode {
  return stageId === 'b2-first' || stageId === 'c1-advanced' ? 'teen' : 'kid';
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function weekWindow(): string[] {
  const days: string[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    days.push(todayKey(date));
  }
  return days;
}

async function countWhere(table: string, configure: (query: any) => any): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;
  const query = configure(admin.from(table).select('id', { count: 'exact', head: true }));
  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}

async function getDueWords(profileId: string | null): Promise<number> {
  if (!profileId) return 0;
  return countWhere('vocabulary_items', (query) => query.eq('user_profile_id', profileId).lte('next_review_date', todayKey()));
}

async function getNextLesson(profileId: string | null, stageId: CurriculumStageId): Promise<{ id: string; title: string } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: lessons } = await admin
    .from('lessons')
    .select('id,title_vi,title_en,sort_order')
    .eq('stage_id', stageId)
    .eq('active', true)
    .eq('review_status', 'approved')
    .neq('quality_status', 'blocked')
    .neq('safety_status', 'blocked')
    .order('sort_order', { ascending: true })
    .limit(80);
  const rows = (lessons || []) as Array<{ id: string; title_vi?: string; title_en?: string }>;
  if (rows.length === 0) return null;
  if (!profileId) return { id: rows[0].id, title: rows[0].title_vi || rows[0].title_en || rows[0].id };

  const { data: progress } = await admin
    .from('lesson_progress')
    .select('lesson_id,status')
    .eq('user_profile_id', profileId)
    .in('lesson_id', rows.map((lesson) => lesson.id));
  const done = new Set((progress || []).filter((row: any) => row.status === 'done').map((row: any) => row.lesson_id));
  const next = rows.find((lesson) => !done.has(lesson.id)) || rows[0];
  return { id: next.id, title: next.title_vi || next.title_en || next.id };
}

function weakSkillFromState(state: LearnerCurriculumState | null): CefrSkill | null {
  const entries = Object.entries(state?.skillMastery || {})
    .map(([skill, value]) => [skill === 'grammar' ? 'use-of-english' : skill, Number(value) || 0] as const)
    .filter(([skill]) => ['reading', 'listening', 'speaking', 'writing', 'vocabulary', 'use-of-english'].includes(skill));
  if (entries.length === 0) return null;
  const [skill, score] = entries.sort((a, b) => a[1] - b[1])[0];
  return score < 60 ? (skill as CefrSkill) : null;
}

export async function getNextLearningAction(profileId: string | null): Promise<{ action: NextLearningAction; learnerState: LearnerCurriculumState | null; dueWords: number }> {
  const learnerState = profileId ? await getLearnerCurriculumState(profileId) : null;
  const stageId = learnerState?.currentStageId || 'a2-key';
  const learningMode = modeForStage(stageId);
  const dueWords = await getDueWords(profileId);
  const weakSkill = weakSkillFromState(learnerState);
  const nextLesson = await getNextLesson(profileId, stageId);
  const checkpointDue = Boolean(learnerState?.placementDone && learnerState.nextCheckpointDueAt && learnerState.nextCheckpointDueAt <= todayKey());

  if (learnerState?.needsLevelSelection || learnerState?.placementDone === false) {
    return {
      learnerState,
      dueWords,
      action: {
        kind: 'placement',
        title: 'Friendly placement check',
        description: 'Start with a short check-in so Engkids can set the right CEFR stage.',
        href: '/learn/placement',
        priority: 100,
        reason: 'No saved placement result yet.',
        stageId,
        learningMode,
        weakSkill,
      },
    };
  }

  if (dueWords >= 8 || weakSkill) {
    return {
      learnerState,
      dueWords,
      action: {
        kind: 'review',
        title: weakSkill ? `Boost ${weakSkill}` : 'Review due words',
        description: weakSkill ? 'Do a short scaffold review before new content.' : `Review ${dueWords} due words with SRS practice.`,
        href: '/progress/review',
        priority: 90,
        reason: weakSkill ? 'A skill is below the 60% mastery guardrail.' : 'SRS due count is high enough to review first.',
        stageId,
        learningMode,
        weakSkill,
      },
    };
  }

  if (checkpointDue) {
    return {
      learnerState,
      dueWords,
      action: {
        kind: 'checkpoint',
        title: 'Friendly checkpoint',
        description: 'A short progress check updates mastery and recommends the next step.',
        href: `/learn/checkpoint?stage=${encodeURIComponent(stageId)}`,
        priority: 80,
        reason: 'The saved checkpoint date is due.',
        stageId,
        learningMode,
        weakSkill,
      },
    };
  }

  if (nextLesson) {
    return {
      learnerState,
      dueWords,
      action: {
        kind: 'lesson',
        title: nextLesson.title,
        description: learningMode === 'kid' ? 'A short playful lesson with practice and a small reward.' : 'A focused teen lesson with output practice.',
        href: `/learn/lessons/${encodeURIComponent(nextLesson.id)}`,
        priority: 70,
        reason: 'Next unfinished lesson in the current CEFR stage.',
        stageId,
        learningMode,
        weakSkill,
      },
    };
  }

  return {
    learnerState,
    dueWords,
    action: {
      kind: 'game',
      title: 'Practice game',
      description: 'Keep momentum with a short word-bank game.',
      href: `/games?stage=${encodeURIComponent(stageId)}`,
      priority: 40,
      reason: 'No unfinished lesson was found for this stage.',
      stageId,
      learningMode,
      weakSkill,
    },
  };
}

export async function getParentProgressSummary(profileId: string | null): Promise<ParentProgressSummary> {
  const { action, learnerState, dueWords } = await getNextLearningAction(profileId);
  const stageId = learnerState?.currentStageId || action.stageId;
  const stage = getStageById(stageId);
  const admin = getSupabaseAdmin();
  const totalLessons = await countWhere('lessons', (query) => query.eq('stage_id', stageId).eq('active', true).eq('review_status', 'approved'));
  const lessonsCompleted = profileId ? await countWhere('lesson_progress', (query) => query.eq('user_profile_id', profileId).eq('status', 'done')) : 0;
  const wordsMastered = profileId ? await countWhere('vocabulary_items', (query) => query.eq('user_profile_id', profileId).gte('mastery_level', 3)) : 0;
  const days = weekWindow();
  const weekly = new Map(days.map((day) => [day, 0]));

  if (admin && profileId) {
    const since = `${days[0]}T00:00:00.000Z`;
    const [events, attempts, reviews] = await Promise.all([
      admin.from('lesson_events').select('created_at').eq('user_profile_id', profileId).gte('created_at', since),
      admin.from('assessment_attempts').select('created_at').eq('user_profile_id', profileId).gte('created_at', since),
      admin.from('vocabulary_items').select('last_reviewed_at').eq('user_profile_id', profileId).gte('last_reviewed_at', since),
    ]);
    for (const row of events.data || []) weekly.set(String(row.created_at).slice(0, 10), (weekly.get(String(row.created_at).slice(0, 10)) || 0) + 1);
    for (const row of attempts.data || []) weekly.set(String(row.created_at).slice(0, 10), (weekly.get(String(row.created_at).slice(0, 10)) || 0) + 1);
    for (const row of reviews.data || []) weekly.set(String(row.last_reviewed_at).slice(0, 10), (weekly.get(String(row.last_reviewed_at).slice(0, 10)) || 0) + 1);
  }

  const masteryEntries = Object.entries(learnerState?.skillMastery || {});
  const strongestSkill = masteryEntries.length ? masteryEntries.sort((a, b) => Number(b[1]) - Number(a[1]))[0][0] : null;
  const weakestSkill = masteryEntries.length ? masteryEntries.sort((a, b) => Number(a[1]) - Number(b[1]))[0][0] : null;

  return {
    stageId,
    cefr: stage.cefr,
    learningMode: modeForStage(stageId),
    dueWords,
    wordsMastered,
    lessonsCompleted,
    totalLessons,
    weeklyActivity: days.map((date) => ({ date, count: weekly.get(date) || 0 })),
    skillMastery: learnerState?.skillMastery || {},
    strongestSkill,
    weakestSkill,
    nextAction: action,
  };
}

function coverageStatus(row: Omit<StandardsCoverageRow, 'status'>): StandardsCoverageRow['status'] {
  if (row.blocked > 0 || row.missingCefrReason > 0 || row.missingCanDo > 0) return 'needs-work';
  if (row.qualityNeedsReview > 0 || row.translationPending > 0 || row.lessons < 40) return 'watch';
  return 'healthy';
}

export async function getStandardsCoverage(): Promise<StandardsCoverageSummary> {
  const admin = getSupabaseAdmin();
  if (!admin) return { rows: [], totals: { words: 0, lessons: 0, assessments: 0, blocked: 0, qualityNeedsReview: 0, translationPending: 0 } };

  const [wordResult, lessonResult, stepResult, assessmentResult] = await Promise.all([
    admin.from('word_bank_items').select('level,vi,cefr_reason,can_do_statement,quality_status,safety_status').eq('active', true),
    admin.from('lessons').select('stage_id,skill_focus,cefr_reason,can_do_statement,quality_status,safety_status').eq('active', true).eq('review_status', 'approved'),
    admin.from('lesson_steps').select('lesson_id,cefr_skill,quality_status,safety_status').eq('active', true),
    admin.from('assessment_items').select('stage_id,skill_id,cefr_reason,can_do_statement,quality_status,safety_status').eq('active', true),
  ]);

  const words = (wordResult.data || []) as any[];
  const lessons = (lessonResult.data || []) as any[];
  const assessments = (assessmentResult.data || []) as any[];
  const steps = (stepResult.data || []) as any[];
  const skills: Array<CefrSkill | 'all'> = ['all', 'vocabulary', 'reading', 'listening', 'speaking', 'writing', 'use-of-english'];
  const rows: StandardsCoverageRow[] = [];

  for (const stage of CURRICULUM_STAGES) {
    for (const skill of skills) {
      const stageWords = words.filter((word) => normalizeStageId(word.level) === stage.id && (skill === 'all' || skill === 'vocabulary'));
      const stageLessons = lessons.filter((lesson) => {
        const stageOk = normalizeStageId(lesson.stage_id) === stage.id;
        if (!stageOk) return false;
        if (skill === 'all') return true;
        return Array.isArray(lesson.skill_focus) && lesson.skill_focus.map((item: string) => item === 'grammar' ? 'use-of-english' : item).includes(skill);
      });
      const stageAssessments = assessments.filter((item) => normalizeStageId(item.stage_id) === stage.id && (skill === 'all' || (item.skill_id === skill || (item.skill_id === 'grammar' && skill === 'use-of-english'))));
      const relatedSteps = skill === 'all' ? steps : steps.filter((step) => step.cefr_skill === skill);
      const base = {
        stageId: stage.id,
        cefr: stage.cefr,
        skill,
        words: stageWords.length,
        lessons: stageLessons.length,
        assessments: stageAssessments.length,
        missingCefrReason: [...stageWords, ...stageLessons, ...stageAssessments].filter((item) => !String(item.cefr_reason || '').trim()).length,
        missingCanDo: [...stageWords, ...stageLessons, ...stageAssessments].filter((item) => !String(item.can_do_statement || '').trim()).length,
        translationPending: stageWords.filter((item) => String(item.vi || '') === 'translation_pending').length,
        blocked: [...stageWords, ...stageLessons, ...stageAssessments, ...relatedSteps].filter((item) => item.safety_status === 'blocked' || item.quality_status === 'blocked').length,
        qualityNeedsReview: [...stageWords, ...stageLessons, ...stageAssessments, ...relatedSteps].filter((item) => item.quality_status === 'needs-review' || item.safety_status === 'needs-review').length,
      };
      rows.push({ ...base, status: coverageStatus(base) });
    }
  }

  return {
    rows,
    totals: {
      words: words.length,
      lessons: lessons.length,
      assessments: assessments.length,
      blocked: rows.filter((row) => row.skill === 'all').reduce((sum, row) => sum + row.blocked, 0),
      qualityNeedsReview: rows.filter((row) => row.skill === 'all').reduce((sum, row) => sum + row.qualityNeedsReview, 0),
      translationPending: rows.filter((row) => row.skill === 'all').reduce((sum, row) => sum + row.translationPending, 0),
    },
  };
}

export async function saveLessonEvent(profileId: string | null, input: LessonEventInput): Promise<{ id: string } | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !profileId) return null;
  const eventType: LessonEventType = ['step-complete', 'quiz-result', 'output-submit', 'reflection', 'reward'].includes(input.eventType) ? input.eventType : 'step-complete';
  const score = input.scorePercent === null || input.scorePercent === undefined ? null : Math.max(0, Math.min(100, Number(input.scorePercent) || 0));
  const { data, error } = await admin
    .from('lesson_events')
    .insert({
      user_profile_id: profileId,
      lesson_id: input.lessonId,
      step_id: input.stepId || null,
      event_type: eventType,
      skill_id: input.skillId || null,
      payload: input.payload || {},
      score_percent: score,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to save lesson event');
  return { id: String((data as { id: string }).id) };
}
