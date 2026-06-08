import type { GameScore, UserProgress } from '@/types';

export type CurriculumStageId =
  | 'sound-play'
  | 'pre-a1-starters'
  | 'a1-movers'
  | 'a2-flyers'
  | 'a2-bridge';

export interface CurriculumStage {
  id: CurriculumStageId;
  cefr: string;
  titleVi: string;
  ageVi: string;
  weeksVi: string;
  targetWords: number;
  targetStories: number;
  targetGames: number;
  topics: string[];
  focus: string[];
  canDo: string[];
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

export const CURRICULUM_STAGES: CurriculumStage[] = [
  {
    id: 'sound-play',
    cefr: 'Pre-A1 readiness',
    titleVi: 'Làm quen âm thanh',
    ageVi: '4-6 tuổi hoặc mới bắt đầu',
    weeksVi: '4-8 tuần',
    targetWords: 50,
    targetStories: 1,
    targetGames: 3,
    topics: ['greetings', 'colors', 'numbers', 'animals', 'family', 'toys'],
    focus: ['Nghe hiểu chỉ dẫn ngắn', 'Bắt chước âm và nhịp câu', 'Nhận diện từ quen thuộc'],
    canDo: ['Hiểu lời chào và chỉ dẫn 1 bước.', 'Nhắc lại từ đơn/cụm 2-3 từ.', 'Chọn đúng tranh hoặc từ khi nghe.'],
    engkids: ['Bài hát và video ngắn', 'Memory Match', 'Pet: chăm sóc bằng câu hỏi 1 từ'],
  },
  {
    id: 'pre-a1-starters',
    cefr: 'Pre A1 Starters',
    titleVi: 'Nền tảng từ và câu ngắn',
    ageVi: '6-8 tuổi',
    weeksVi: '3-5 tháng',
    targetWords: 150,
    targetStories: 5,
    targetGames: 8,
    topics: ['family', 'animals', 'school', 'food', 'body', 'weather'],
    focus: ['Từ vựng đời sống gần bé', 'Câu mẫu I like..., This is..., Where is...?', 'Đọc từ/câu rất ngắn'],
    canDo: ['Trả lời câu hỏi cá nhân rất đơn giản.', 'Ghép Anh-Việt và đọc câu ngắn có tranh hỗ trợ.', 'Điền hoặc kéo thả được từ đơn đúng ngữ cảnh.'],
    engkids: ['Truyện cấp dễ', 'Word Burst, Word Puzzle', 'Progress review để ôn từ đã lưu'],
  },
  {
    id: 'a1-movers',
    cefr: 'A1 Movers',
    titleVi: 'Giao tiếp câu đơn',
    ageVi: '7-10 tuổi',
    weeksVi: '5-8 tháng',
    targetWords: 350,
    targetStories: 12,
    targetGames: 18,
    topics: ['daily routines', 'places', 'hobbies', 'transport', 'nature', 'feelings'],
    focus: ['Hỏi đáp về thói quen, sở thích, nơi chốn', 'Đọc truyện ngắn 80-150 từ', 'Viết cụm và câu đơn'],
    canDo: ['Hiểu đoạn hội thoại ngắn có chủ đề quen thuộc.', 'Kể lại nội dung truyện bằng 2-4 câu đơn.', 'Dùng được hiện tại đơn và mệnh lệnh quen thuộc.'],
    engkids: ['English Farm để học từ theo vòng lặp', 'RPG World, Tower Climb', 'Story games sau mỗi truyện'],
  },
  {
    id: 'a2-flyers',
    cefr: 'A2 Flyers',
    titleVi: 'Đọc hiểu và kể chuyện',
    ageVi: '9-12 tuổi',
    weeksVi: '8-12 tháng',
    targetWords: 700,
    targetStories: 24,
    targetGames: 32,
    topics: ['adventure', 'science', 'environment', 'technology', 'health', 'community'],
    focus: ['Đọc đoạn 150-300 từ', 'Nghe chi tiết chính trong video/truyện', 'Viết 4-6 câu có trình tự'],
    canDo: ['Nắm ý chính và chi tiết trong truyện/video ngắn.', 'Mô tả tranh, nhân vật, sự kiện bằng câu nối tiếp.', 'Dùng quá khứ đơn cơ bản và từ nối như because, then, first.'],
    engkids: ['Fill Blanks, Sentence Scramble', 'Video quiz và Story vocab', 'SRS review theo ngày đến hạn'],
  },
  {
    id: 'a2-bridge',
    cefr: 'A2 bridge',
    titleVi: 'Tự học có hướng dẫn',
    ageVi: '10+ hoặc đã hoàn thành Flyers',
    weeksVi: '3-6 tháng',
    targetWords: 1000,
    targetStories: 36,
    targetGames: 48,
    topics: ['culture', 'projects', 'opinions', 'future plans', 'problem solving', 'media'],
    focus: ['Đọc nhiều chủ đề hơn', 'Nói/viết ý kiến đơn giản', 'Tự theo dõi lỗi và mục tiêu tuần'],
    canDo: ['Đọc email, tin nhắn, truyện ngắn đời thường.', 'Nói về kế hoạch, trải nghiệm, sở thích bằng đoạn ngắn.', 'Biết ôn lại từ yếu và chọn hoạt động phù hợp.'],
    engkids: ['Progress dashboard', 'Today plan', 'Game luyện phản xạ và từ vựng nâng cao'],
  },
];

export function normalizeStageId(value: unknown): CurriculumStageId | undefined {
  if (typeof value !== 'string') return undefined;
  return CURRICULUM_STAGES.find((stage) => stage.id === value)?.id;
}

export function getStageById(id: CurriculumStageId | string | undefined): CurriculumStage {
  return CURRICULUM_STAGES.find((stage) => stage.id === id) ?? CURRICULUM_STAGES[1];
}

export function stageForStoryLevel(level: string | undefined): CurriculumStageId {
  if (level === 'Intermediate') return 'a2-flyers';
  if (level === 'Elementary') return 'a1-movers';
  return 'pre-a1-starters';
}

export function stageForDifficulty(level: string | undefined): CurriculumStageId {
  if (level === 'advanced' || level === 'hard') return 'a2-flyers';
  if (level === 'intermediate' || level === 'medium') return 'a1-movers';
  return 'pre-a1-starters';
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
  const wordPct = Math.min(masteredWords / stage.targetWords, 1);
  const storyPct = Math.min(completedStories / stage.targetStories, 1);
  const gamePct = Math.min(strongGameScores / stage.targetGames, 1);
  const percent = Math.round(((wordPct + storyPct + gamePct) / 3) * 100);
  const missing: string[] = [];
  if (masteredWords < stage.targetWords) missing.push(`${stage.targetWords - masteredWords} từ nhớ tốt`);
  if (completedStories < stage.targetStories) missing.push(`${stage.targetStories - completedStories} truyện hoàn thành`);
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
