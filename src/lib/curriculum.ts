import type { GameScore, UserProgress } from '@/types';

export type CurriculumStageId =
  | 'a2-key'
  | 'b1-preliminary'
  | 'b2-first'
  | 'c1-advanced';

export type LegacyCurriculumStageId =
  | 'sound-play'
  | 'pre-a1-starters'
  | 'a1-movers'
  | 'a2-flyers'
  | 'a2-bridge';

export interface CurriculumStage {
  id: CurriculumStageId;
  cefr: string;
  titleVi: string;
  objectiveVi: string;
  ageVi: string;
  weeksVi: string;
  targetWords: number;
  targetStories: number;
  targetGames: number;
  topics: string[];
  focus: string[];
  canDo: string[];
  dailyLoop: string[];
  weeklyPlan: string[];
  assessment: string[];
  exitCriteria: string[];
  engkids: string[];
}

export interface LearnerStageProgress {
  stage: CurriculumStage;
  stageIndex: number;
  percent: number;
  nextStage: CurriculumStage | null;
  stats: {
    masteredWords: number;
    completedStories: number;
    strongGameScores: number;
  };
  missing: string[];
}

export const LEGACY_STAGE_IDS: LegacyCurriculumStageId[] = [
  'sound-play',
  'pre-a1-starters',
  'a1-movers',
  'a2-flyers',
  'a2-bridge',
];

export const CURRICULUM_STAGES: CurriculumStage[] = [
  {
    id: 'a2-key',
    cefr: 'A2 Key',
    titleVi: 'A2 Key - Nen tang giao tiep',
    objectiveVi: 'Be hieu noi dung quen thuoc, noi/viet cau ngan va tu tin trong cac tinh huong hang ngay.',
    ageVi: '9-13 tuoi hoac da co nen tang A1',
    weeksVi: '4-6 thang',
    targetWords: 1200,
    targetStories: 18,
    targetGames: 35,
    topics: ['daily life', 'school', 'travel', 'health', 'hobbies', 'stories', 'technology', 'community'],
    focus: ['Mo rong tu vung A2', 'Hoi dap ve trai nghiem va ke hoach gan', 'Doc/nghe doan ngan co chi tiet ro'],
    canDo: ['Hieu y chinh trong cau chuyen, video va hoi thoai ngan.', 'Viet tin nhan/email ngan ve chu de quen thuoc.', 'Dung thi hien tai, qua khu don va tu noi co ban.'],
    dailyLoop: ['Review tu den han', 'Mot lesson ngan', 'Game luyen phan xa', 'Checkpoint mini'],
    weeklyPlan: ['Vocabulary + listening', 'Reading story', 'Grammar in context', 'Speaking prompt', 'Writing mini task', 'Checkpoint'],
    assessment: ['Placement A2', 'Daily check 8 cau', 'Weekly checkpoint 16 cau', 'Stage exit 24 cau'],
    exitCriteria: ['1200 tu active', '18 lesson/story hoan thanh', '35 luot game dat 70%+', 'Checkpoint >= 70%'],
    engkids: ['Today queue', 'Word-bank games', 'Story/video lesson', 'Parent progress'],
  },
  {
    id: 'b1-preliminary',
    cefr: 'B1 Preliminary',
    titleVi: 'B1 Preliminary - Giao tiep doc lap',
    objectiveVi: 'Be giao tiep ve truong lop, so thich, y kien va su kien quen thuoc bang doan ngan co cau truc.',
    ageVi: '11-15 tuoi',
    weeksVi: '6-9 thang',
    targetWords: 2200,
    targetStories: 36,
    targetGames: 70,
    topics: ['teen life', 'environment', 'culture', 'media', 'science', 'problem solving', 'future plans'],
    focus: ['Doc bai 250-500 tu', 'Nghe chi tiet va suy luan don gian', 'Viet email/story/review ngan'],
    canDo: ['Giai thich ly do va y kien bang nhieu cau noi tiep.', 'Tom tat y chinh cua bai doc/video quen thuoc.', 'Tu sua loi co ban trong cau va doan ngan.'],
    dailyLoop: ['SRS', 'Reading/listening task', 'Skill drill', 'Writing or speaking output'],
    weeklyPlan: ['Theme input', 'Vocabulary depth', 'Grammar pattern', 'Listening detail', 'Writing task', 'Checkpoint'],
    assessment: ['B1 checkpoint theo skill', 'Stage exit voi writing/speaking prompt', 'Weak-skill review'],
    exitCriteria: ['2200 tu active', '36 lesson hoan thanh', '70 luot game dat 70%+', 'Skill thap nhat >= 60%'],
    engkids: ['Learning path', 'Review queue', 'Skill breakdown', 'Parent dashboard'],
  },
  {
    id: 'b2-first',
    cefr: 'B2 First',
    titleVi: 'B2 First - Tu tin dien dat',
    objectiveVi: 'Be hieu van ban dai hon, so sanh quan diem va trinh bay y tuong ro rang trong bai noi/viet co cau truc.',
    ageVi: '13-16 tuoi',
    weeksVi: '8-12 thang',
    targetWords: 3600,
    targetStories: 60,
    targetGames: 110,
    topics: ['global issues', 'education', 'technology', 'creativity', 'health', 'careers', 'literature'],
    focus: ['Doc bai 500-900 tu', 'Phan biet y chinh/chi tiet/thai do', 'Viet review/article/opinion paragraph'],
    canDo: ['Bao ve y kien bang vi du.', 'So sanh hai lua chon hoac hai quan diem.', 'Dung cau phuc, tu noi va paraphrase phu hop.'],
    dailyLoop: ['Advanced review', 'Input rich lesson', 'Analysis task', 'Output task'],
    weeklyPlan: ['Article/story', 'Listening viewpoint', 'Use of English', 'Writing workshop', 'Speaking cards', 'Checkpoint'],
    assessment: ['B2 mixed-skill checkpoint', 'Stage exit voi writing rubric', 'Targeted remediation'],
    exitCriteria: ['3600 tu active', '60 lesson hoan thanh', '110 luot game dat 70%+', 'Checkpoint >= 75%'],
    engkids: ['Dashboard path', 'Lesson workspace', 'Assessment report', 'Portfolio tasks'],
  },
  {
    id: 'c1-advanced',
    cefr: 'C1 Advanced',
    titleVi: 'C1 Advanced - Hoc thuat than thien',
    objectiveVi: 'Be/teen hieu y phuc tap, tom tat, tranh luan va viet/noi ro rang ve chu de hoc thuat vua suc.',
    ageVi: '14+ hoac da dat B2 vung',
    weeksVi: '9-15 thang',
    targetWords: 5200,
    targetStories: 90,
    targetGames: 160,
    topics: ['research', 'society', 'innovation', 'arts', 'ethics', 'communication', 'independent learning'],
    focus: ['Doc bai dai co lap luan', 'Nghe quan diem/ham y', 'Viet summary, proposal, presentation script'],
    canDo: ['Tom tat va danh gia y kien trong nguon doc/nghe.', 'Trinh bay lap luan co cau truc va vi du.', 'Dieu chinh van phong cho nguoi nghe/nguoi doc.'],
    dailyLoop: ['Precision vocab', 'Long-form input', 'Critical thinking task', 'Polished output'],
    weeklyPlan: ['Deep reading', 'Lecture-style listening', 'Vocabulary nuance', 'Discussion', 'Writing revision', 'Checkpoint'],
    assessment: ['C1 checkpoint theo rubric', 'Stage exit portfolio', 'Parent/learner review'],
    exitCriteria: ['5200 tu active', '90 lesson hoan thanh', '160 luot game dat 70%+', 'Portfolio task dat rubric'],
    engkids: ['Advanced lesson path', 'Portfolio', 'Skill radar', 'Parent summary'],
  },
];

const STAGE_IDS = new Set<string>(CURRICULUM_STAGES.map((stage) => stage.id));
const LEGACY_TO_ACTIVE: Record<LegacyCurriculumStageId, CurriculumStageId> = {
  'sound-play': 'a2-key',
  'pre-a1-starters': 'a2-key',
  'a1-movers': 'a2-key',
  'a2-flyers': 'a2-key',
  'a2-bridge': 'a2-key',
};

export function normalizeStageId(value: unknown): CurriculumStageId | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (STAGE_IDS.has(trimmed)) return trimmed as CurriculumStageId;
  if (trimmed in LEGACY_TO_ACTIVE) return LEGACY_TO_ACTIVE[trimmed as LegacyCurriculumStageId];
  return undefined;
}

export function isActiveStageId(value: unknown): value is CurriculumStageId {
  return typeof value === 'string' && STAGE_IDS.has(value);
}

export function mapLegacyStageId(value: unknown): CurriculumStageId {
  return normalizeStageId(value) || 'a2-key';
}

export function getStageById(id: CurriculumStageId | string | undefined): CurriculumStage {
  const normalized = normalizeStageId(id);
  return CURRICULUM_STAGES.find((stage) => stage.id === normalized) ?? CURRICULUM_STAGES[0];
}

export function getStageIndex(stageId: CurriculumStageId | string | undefined): number {
  const normalized = normalizeStageId(stageId);
  const index = CURRICULUM_STAGES.findIndex((stage) => stage.id === normalized);
  return Math.max(index, 0);
}

export function stageForStoryLevel(level: string | undefined): CurriculumStageId {
  if (level === 'Intermediate' || level === 'Elementary' || level === 'Beginner') return 'a2-key';
  return normalizeStageId(level) || 'a2-key';
}

export function stageForDifficulty(level: string | undefined): CurriculumStageId {
  if (level === 'advanced' || level === 'hard') return 'b2-first';
  if (level === 'intermediate' || level === 'medium') return 'b1-preliminary';
  return 'a2-key';
}

function countMasteredWords(progress: UserProgress): number {
  return progress.savedWords.filter((word) => (word.masteryLevel ?? 0) >= 3).length;
}

function countCompletedStories(progress: UserProgress): number {
  return Object.values(progress.storiesProgress).filter((story) => story.completed).length;
}

function scoreAccuracy(score: GameScore): number {
  return score.totalQuestions > 0 ? score.score / score.totalQuestions : 0;
}

function countStrongGames(progress: UserProgress): number {
  return progress.gameScores.filter((score) => scoreAccuracy(score) >= 0.7 || score.score >= 70).length;
}

export function getLearnerStageProgress(progress: UserProgress): LearnerStageProgress {
  const masteredWords = countMasteredWords(progress);
  const completedStories = countCompletedStories(progress);
  const strongGameScores = countStrongGames(progress);

  let stageIndex = 0;
  for (let i = 0; i < CURRICULUM_STAGES.length; i += 1) {
    const stage = CURRICULUM_STAGES[i];
    const meetsWords = masteredWords >= stage.targetWords;
    const meetsStories = completedStories >= stage.targetStories;
    const meetsGames = strongGameScores >= stage.targetGames;
    if (meetsWords && meetsStories && meetsGames) stageIndex = Math.min(i + 1, CURRICULUM_STAGES.length - 1);
  }

  const stage = CURRICULUM_STAGES[stageIndex];
  const nextStage = CURRICULUM_STAGES[stageIndex + 1] ?? null;
  const wordPct = Math.min(masteredWords / Math.max(stage.targetWords, 1), 1);
  const storyPct = Math.min(completedStories / Math.max(stage.targetStories, 1), 1);
  const gamePct = Math.min(strongGameScores / Math.max(stage.targetGames, 1), 1);
  const percent = Math.round(((wordPct + storyPct + gamePct) / 3) * 100);
  const missing: string[] = [];
  if (masteredWords < stage.targetWords) missing.push(`${stage.targetWords - masteredWords} tu active`);
  if (completedStories < stage.targetStories) missing.push(`${stage.targetStories - completedStories} lesson/story hoan thanh`);
  if (strongGameScores < stage.targetGames) missing.push(`${stage.targetGames - strongGameScores} luot game dat 70%+`);

  return {
    stage,
    stageIndex,
    percent,
    nextStage,
    stats: { masteredWords, completedStories, strongGameScores },
    missing,
  };
}
