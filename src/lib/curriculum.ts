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
    titleVi: 'A2 Key - Nền tảng giao tiếp',
    objectiveVi: 'Bé hiểu nội dung quen thuộc, nói/viết câu ngắn và tự tin trong các tình huống hằng ngày.',
    ageVi: '9-13 tuổi hoặc đã có nền tảng A1',
    weeksVi: '4-6 tháng',
    targetWords: 1200,
    targetStories: 18,
    targetGames: 35,
    topics: ['daily life', 'school', 'travel', 'health', 'hobbies', 'stories', 'technology', 'community'],
    focus: ['Mở rộng từ vựng A2', 'Hỏi đáp về trải nghiệm và kế hoạch gần', 'Đọc/nghe đoạn ngắn có chi tiết rõ'],
    canDo: ['Hiểu ý chính trong câu chuyện, video và hội thoại ngắn.', 'Viết tin nhắn/email ngắn về chủ đề quen thuộc.', 'Dùng thì hiện tại, quá khứ đơn và từ nối cơ bản.'],
    dailyLoop: ['Review từ đến hạn', 'Một lesson ngắn', 'Game luyện phản xạ', 'Checkpoint mini'],
    weeklyPlan: ['Vocabulary + listening', 'Reading story', 'Grammar in context', 'Speaking prompt', 'Writing mini task', 'Checkpoint'],
    assessment: ['Placement A2', 'Daily check 8 câu', 'Weekly checkpoint 16 câu', 'Stage exit 24 câu'],
    exitCriteria: ['1200 từ active', '18 lesson/story hoàn thành', '35 lượt game đạt 70%+', 'Checkpoint >= 70%'],
    engkids: ['Today queue', 'Word-bank games', 'Story/video lesson', 'Parent progress'],
  },
  {
    id: 'b1-preliminary',
    cefr: 'B1 Preliminary',
    titleVi: 'B1 Preliminary - Giao tiếp độc lập',
    objectiveVi: 'Bé giao tiếp về trường lớp, sở thích, ý kiến và sự kiện quen thuộc bằng đoạn ngắn có cấu trúc.',
    ageVi: '11-15 tuổi',
    weeksVi: '6-9 tháng',
    targetWords: 2200,
    targetStories: 36,
    targetGames: 70,
    topics: ['teen life', 'environment', 'culture', 'media', 'science', 'problem solving', 'future plans'],
    focus: ['Đọc bài 250-500 từ', 'Nghe chi tiết và suy luận đơn giản', 'Viết email/story/review ngắn'],
    canDo: ['Giải thích lý do và ý kiến bằng nhiều câu nối tiếp.', 'Tóm tắt ý chính của bài đọc/video quen thuộc.', 'Tự sửa lỗi cơ bản trong câu và đoạn ngắn.'],
    dailyLoop: ['SRS', 'Reading/listening task', 'Skill drill', 'Writing or speaking output'],
    weeklyPlan: ['Theme input', 'Vocabulary depth', 'Grammar pattern', 'Listening detail', 'Writing task', 'Checkpoint'],
    assessment: ['B1 checkpoint theo skill', 'Stage exit với writing/speaking prompt', 'Weak-skill review'],
    exitCriteria: ['2200 từ active', '36 lesson hoàn thành', '70 lượt game đạt 70%+', 'Skill thấp nhất >= 60%'],
    engkids: ['Learning path', 'Review queue', 'Skill breakdown', 'Parent dashboard'],
  },
  {
    id: 'b2-first',
    cefr: 'B2 First',
    titleVi: 'B2 First - Tự tin diễn đạt',
    objectiveVi: 'Bé hiểu văn bản dài hơn, so sánh quan điểm và trình bày ý tưởng rõ ràng trong bài nói/viết có cấu trúc.',
    ageVi: '13-16 tuổi',
    weeksVi: '8-12 tháng',
    targetWords: 3600,
    targetStories: 60,
    targetGames: 110,
    topics: ['global issues', 'education', 'technology', 'creativity', 'health', 'careers', 'literature'],
    focus: ['Đọc bài 500-900 từ', 'Phân biệt ý chính/chi tiết/thái độ', 'Viết review/article/opinion paragraph'],
    canDo: ['Bảo vệ ý kiến bằng ví dụ.', 'So sánh hai lựa chọn hoặc hai quan điểm.', 'Dùng câu phức, từ nối và paraphrase phù hợp.'],
    dailyLoop: ['Advanced review', 'Input rich lesson', 'Analysis task', 'Output task'],
    weeklyPlan: ['Article/story', 'Listening viewpoint', 'Use of English', 'Writing workshop', 'Speaking cards', 'Checkpoint'],
    assessment: ['B2 mixed-skill checkpoint', 'Stage exit với writing rubric', 'Targeted remediation'],
    exitCriteria: ['3600 từ active', '60 lesson hoàn thành', '110 lượt game đạt 70%+', 'Checkpoint >= 75%'],
    engkids: ['Dashboard path', 'Lesson workspace', 'Assessment report', 'Portfolio tasks'],
  },
  {
    id: 'c1-advanced',
    cefr: 'C1 Advanced',
    titleVi: 'C1 Advanced - Học thuật thân thiện',
    objectiveVi: 'Bé/teen hiểu ý phức tạp, tóm tắt, tranh luận và viết/nói rõ ràng về chủ đề học thuật vừa sức.',
    ageVi: '14+ hoặc đã đạt B2 vững',
    weeksVi: '9-15 tháng',
    targetWords: 5200,
    targetStories: 90,
    targetGames: 160,
    topics: ['research', 'society', 'innovation', 'arts', 'ethics', 'communication', 'independent learning'],
    focus: ['Đọc bài dài có lập luận', 'Nghe quan điểm/hàm ý', 'Viết summary, proposal, presentation script'],
    canDo: ['Tóm tắt và đánh giá ý kiến trong nguồn đọc/nghe.', 'Trình bày lập luận có cấu trúc và ví dụ.', 'Điều chỉnh văn phong cho người nghe/người đọc.'],
    dailyLoop: ['Precision vocab', 'Long-form input', 'Critical thinking task', 'Polished output'],
    weeklyPlan: ['Deep reading', 'Lecture-style listening', 'Vocabulary nuance', 'Discussion', 'Writing revision', 'Checkpoint'],
    assessment: ['C1 checkpoint theo rubric', 'Stage exit portfolio', 'Parent/learner review'],
    exitCriteria: ['5200 từ active', '90 lesson hoàn thành', '160 lượt game đạt 70%+', 'Portfolio task đạt rubric'],
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
  if (masteredWords < stage.targetWords) missing.push(`${stage.targetWords - masteredWords} từ active`);
  if (completedStories < stage.targetStories) missing.push(`${stage.targetStories - completedStories} lesson/story hoàn thành`);
  if (strongGameScores < stage.targetGames) missing.push(`${stage.targetGames - strongGameScores} lượt game đạt 70%+`);

  return {
    stage,
    stageIndex,
    percent,
    nextStage,
    stats: { masteredWords, completedStories, strongGameScores },
    missing,
  };
}
