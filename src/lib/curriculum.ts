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

export const CURRICULUM_STAGES: CurriculumStage[] = [
  {
    id: 'sound-play',
    cefr: 'Pre-A1 readiness',
    titleVi: 'Làm quen âm thanh',
    objectiveVi: 'Bé nhận ra âm, từ đơn và phản xạ với chỉ dẫn rất ngắn trước khi học câu.',
    ageVi: '4-6 tuổi hoặc mới bắt đầu',
    weeksVi: '4-8 tuần',
    targetWords: 40,
    targetStories: 1,
    targetGames: 3,
    topics: ['greetings', 'colors', 'numbers', 'animals', 'family', 'toys'],
    focus: ['Nghe và bắt chước âm quen thuộc', 'Nhận diện tranh, màu, số, người thân', 'Trả lời yes/no và lặp lại cụm 1-3 từ'],
    canDo: ['Hiểu lời chào và chỉ dẫn 1 bước như listen, point, choose.', 'Chọn đúng tranh hoặc từ khi nghe tiếng Anh.', 'Nói lại từ đơn/cụm ngắn với phát âm gần đúng.'],
    dailyLoop: ['5 phút nghe bài hát/video rất ngắn', '5 phút ghép tranh-từ', '5 phút chơi game phản xạ 1 từ'],
    weeklyPlan: ['3 buổi nghe + nhắc lại', '2 buổi màu/số/đồ vật', '1 buổi truyện tranh siêu ngắn', '1 buổi ôn bằng game'],
    assessment: ['Bé chọn đúng 8/10 tranh khi nghe.', 'Bé nói được tối thiểu 20 từ quen thuộc.', 'Bé làm game dễ với trợ giúp ít dần.'],
    exitCriteria: ['40 từ ở mức nhớ tốt', 'Hoàn thành 1 truyện rất ngắn', '3 lượt game đạt 70%+'],
    engkids: ['Video/bài hát ngắn', 'Memory Match, Matching Pairs dễ', 'Pet chăm sóc bằng câu hỏi 1 từ'],
  },
  {
    id: 'pre-a1-starters',
    cefr: 'Pre A1 Starters',
    titleVi: 'Nền tảng từ và câu ngắn',
    objectiveVi: 'Bé dùng từ quen thuộc để hiểu câu ngắn về bản thân, gia đình, lớp học và đồ vật quanh mình.',
    ageVi: '6-8 tuổi',
    weeksVi: '3-5 tháng',
    targetWords: 180,
    targetStories: 5,
    targetGames: 10,
    topics: ['family', 'animals', 'school', 'food', 'body', 'home', 'weather', 'nature'],
    focus: ['Từ vựng đời sống gần bé', 'Mẫu câu I like..., This is..., Where is...?', 'Đọc từ/câu rất ngắn có tranh hỗ trợ'],
    canDo: ['Trả lời câu hỏi cá nhân rất đơn giản.', 'Ghép Anh-Việt và đọc câu ngắn có tranh hỗ trợ.', 'Điền hoặc kéo thả được từ đơn đúng ngữ cảnh.'],
    dailyLoop: ['5 phút ôn từ cũ', '10 phút truyện/video', '10 phút game word_bank', '2 phút nói lại 1 câu mẫu'],
    weeklyPlan: ['2 buổi school/home', '2 buổi food/body/animals', '1 buổi weather/nature', '1 buổi truyện + vocab', '1 buổi review dashboard'],
    assessment: ['Bé hiểu câu hỏi What is it? Where is it? Do you like...?', 'Bé đọc được câu 3-6 từ.', 'Bé tự dùng I like/I can/This is trong ví dụ ngắn.'],
    exitCriteria: ['180 từ ở mức nhớ tốt', 'Hoàn thành 5 truyện', '10 lượt game đạt 70%+'],
    engkids: ['Stories cấp dễ', 'Word Burst, Word Puzzle, Matching Pairs', 'Progress Review để ôn từ đã lưu'],
  },
  {
    id: 'a1-movers',
    cefr: 'A1 Movers',
    titleVi: 'Giao tiếp câu đơn',
    objectiveVi: 'Bé hiểu và dùng câu đơn để nói về thói quen, sở thích, nơi chốn và trải nghiệm rất quen thuộc.',
    ageVi: '7-10 tuổi',
    weeksVi: '5-8 tháng',
    targetWords: 360,
    targetStories: 12,
    targetGames: 22,
    topics: ['daily routines', 'places', 'hobbies', 'transport', 'nature', 'feelings'],
    focus: ['Hỏi đáp về thói quen, sở thích, nơi chốn', 'Đọc truyện ngắn 80-150 từ', 'Viết cụm và câu đơn'],
    canDo: ['Hiểu đoạn hội thoại ngắn có chủ đề quen thuộc.', 'Kể lại nội dung truyện bằng 2-4 câu đơn.', 'Dùng được hiện tại đơn, mệnh lệnh và cụm chỉ thời gian quen thuộc.'],
    dailyLoop: ['5 phút SRS', '10 phút đọc/nghe', '10 phút English Farm hoặc game câu hỏi', '3 phút nói/viết 1-2 câu'],
    weeklyPlan: ['2 buổi routine/places', '1 buổi transport/hobbies', '1 buổi nature/feelings', '1 buổi story game', '1 buổi farm review', '1 buổi kiểm tra can-do'],
    assessment: ['Bé mô tả được ngày thường bằng 3 câu.', 'Bé trả lời Why/Where/When đơn giản.', 'Bé làm quiz có câu đầy đủ thay vì chỉ chọn từ đơn.'],
    exitCriteria: ['360 từ ở mức nhớ tốt', 'Hoàn thành 12 truyện', '22 lượt game đạt 70%+'],
    engkids: ['English Farm học từ theo vòng lặp', 'RPG Battle, Tower Climb', 'Story games sau mỗi truyện'],
  },
  {
    id: 'a2-flyers',
    cefr: 'A2 Flyers',
    titleVi: 'Đọc hiểu và kể chuyện',
    objectiveVi: 'Bé hiểu ý chính, chi tiết quen thuộc và bắt đầu diễn đạt ý kiến hoặc lý do bằng nhiều câu nối tiếp.',
    ageVi: '9-12 tuổi',
    weeksVi: '8-12 tháng',
    targetWords: 720,
    targetStories: 24,
    targetGames: 40,
    topics: ['adventure', 'science', 'health', 'technology', 'language', 'community'],
    focus: ['Đọc đoạn 150-300 từ', 'Nghe chi tiết chính trong video/truyện', 'Viết 4-6 câu có trình tự'],
    canDo: ['Nắm ý chính và chi tiết trong truyện/video ngắn.', 'Mô tả tranh, nhân vật, sự kiện bằng câu nối tiếp.', 'Dùng quá khứ đơn cơ bản và từ nối như because, then, first.'],
    dailyLoop: ['5 phút ôn từ đến hạn', '12 phút đọc/video', '10 phút fill blank/sentence scramble', '5 phút viết hoặc nói lại'],
    weeklyPlan: ['2 buổi adventure/story', '1 buổi science/health', '1 buổi technology/language', '1 buổi video quiz', '1 buổi sentence writing', '1 buổi progress review'],
    assessment: ['Bé trả lời được câu hỏi chi tiết sau truyện.', 'Bé viết được 4 câu theo tranh hoặc chủ đề.', 'Bé giải thích lựa chọn bằng because/then/first.'],
    exitCriteria: ['720 từ ở mức nhớ tốt', 'Hoàn thành 24 truyện', '40 lượt game đạt 70%+'],
    engkids: ['Fill Blanks, Sentence Scramble', 'Video quiz và Story vocab', 'SRS review theo ngày đến hạn'],
  },
  {
    id: 'a2-bridge',
    cefr: 'A2 bridge',
    titleVi: 'Tự học có hướng dẫn',
    objectiveVi: 'Bé tự theo dõi mục tiêu tuần, đọc nhiều chủ đề hơn và trình bày ý kiến/kế hoạch bằng đoạn ngắn.',
    ageVi: '10+ hoặc đã hoàn thành Flyers',
    weeksVi: '3-6 tháng',
    targetWords: 1000,
    targetStories: 36,
    targetGames: 60,
    topics: ['projects', 'culture', 'problem solving', 'media', 'opinions', 'future plans'],
    focus: ['Đọc nhiều chủ đề hơn', 'Nói/viết ý kiến đơn giản', 'Tự theo dõi lỗi và mục tiêu tuần'],
    canDo: ['Đọc email, tin nhắn, truyện ngắn đời thường.', 'Nói về kế hoạch, trải nghiệm, sở thích bằng đoạn ngắn.', 'Biết ôn lại từ yếu và chọn hoạt động phù hợp.'],
    dailyLoop: ['5 phút xem mục tiêu', '10 phút đọc/nghe tự chọn', '10 phút game hoặc viết', '5 phút tự đánh dấu lỗi cần ôn'],
    weeklyPlan: ['1 buổi project/culture', '1 buổi media/news', '1 buổi problem solving', '1 buổi opinion writing', '1 buổi presentation nhỏ', '1 buổi review tự chọn'],
    assessment: ['Bé lập kế hoạch học tuần.', 'Bé trình bày 5-6 câu về một chủ đề quen thuộc.', 'Bé tự nhận ra từ/cấu trúc cần ôn.'],
    exitCriteria: ['1000 từ ở mức nhớ tốt', 'Hoàn thành 36 truyện', '60 lượt game đạt 70%+'],
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