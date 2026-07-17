import { CURRICULUM_STAGES, normalizeStageId, stageForDifficulty, type CurriculumStageId } from './curriculum';

// ============================================
// SHARED WORD BANK
// ============================================
// A single editable list of English/Vietnamese word pairs that powers all
// vocabulary games and the farm/pet practice loops. The built-in seed follows
// a CEFR + Cambridge Young Learners progression, but it is not a verbatim copy
// of any official wordlist. Admins can edit or replace it from the dashboard.

export type ViReviewStatus = 'approved' | 'needs-review' | 'blocked' | 'translation_pending';

export interface WordPair {
  en: string;
  vi: string;
  level?: CurriculumStageId | string;
  topic?: string;
  example?: string;
  qualityStatus?: 'approved' | 'needs-review' | 'blocked' | string;
  viReviewStatus?: ViReviewStatus | string;
  viSourceId?: string;
  viSourceUrl?: string;
  viLicenseName?: string;
  viLicenseUrl?: string;
  viAttribution?: string;
  viConfidence?: number;
}

export interface WordBankFilter {
  level?: CurriculumStageId | string;
  topic?: string;
  min?: number;
}

export interface WordBankStats {
  total: number;
  fiveLetterCount: number;
  exampleCount: number;
  byLevel: Record<CurriculumStageId, number>;
  byTopic: Record<string, number>;
}

type WordTuple = [en: string, vi: string, example: string];

export const DEFAULT_WORD_BANK: WordPair[] = [
  ...makeWords('sound-play', 'greetings', [
    ['Hello', 'Xin chào', 'Hello, teacher.'],
    ['Goodbye', 'Tạm biệt', 'Goodbye, my friend.'],
    ['Please', 'Làm ơn', 'Please sit down.'],
    ['Thank', 'Cảm ơn', 'Thank you, Mum.'],
    ['Yes', 'Có / đúng', 'Yes, I can.'],
    ['No', 'Không', 'No, thank you.'],
    ['Sorry', 'Xin lỗi', 'Sorry, Dad.'],
    ['Great', 'Tuyệt vời', 'Great job today.'],
  ]),
  ...makeWords('sound-play', 'colors', [
    ['Red', 'Màu đỏ', 'The ball is red.'],
    ['Blue', 'Màu xanh dương', 'The bag is blue.'],
    ['Green', 'Màu xanh lá', 'The leaf is green.'],
    ['Yellow', 'Màu vàng', 'The sun is yellow.'],
    ['Black', 'Màu đen', 'The cat is black.'],
    ['White', 'Màu trắng', 'The cloud is white.'],
    ['Pink', 'Màu hồng', 'The doll is pink.'],
    ['Brown', 'Màu nâu', 'The dog is brown.'],
  ]),
  ...makeWords('sound-play', 'numbers', [
    ['One', 'Số một', 'One bird is here.'],
    ['Two', 'Số hai', 'Two cats are sleeping.'],
    ['Three', 'Số ba', 'Three apples are red.'],
    ['Four', 'Số bốn', 'Four ducks are swimming.'],
    ['Five', 'Số năm', 'Five stars are bright.'],
    ['Ten', 'Số mười', 'Ten fingers are clean.'],
  ]),
  ...makeWords('sound-play', 'family', [
    ['Mum', 'Mẹ', 'Mum is smiling.'],
    ['Dad', 'Bố', 'Dad is reading.'],
    ['Baby', 'Em bé', 'The baby is happy.'],
    ['Friend', 'Bạn bè', 'My friend can sing.'],
  ]),
  ...makeWords('sound-play', 'toys', [
    ['Ball', 'Quả bóng', 'The ball can roll.'],
    ['Doll', 'Búp bê', 'The doll is on the bed.'],
    ['Teddy', 'Gấu bông', 'Teddy is soft.'],
    ['Kite', 'Con diều', 'The kite is high.'],
    ['Toy', 'Đồ chơi', 'This toy is fun.'],
    ['Car', 'Xe ô tô', 'The car is small.'],
  ]),
  ...makeWords('sound-play', 'animals', [
    ['Cat', 'Con mèo', 'The cat is cute.'],
    ['Dog', 'Con chó', 'The dog can run.'],
    ['Fish', 'Con cá', 'The fish is orange.'],
    ['Bird', 'Con chim', 'The bird can fly.'],
    ['Cow', 'Con bò', 'The cow is big.'],
    ['Duck', 'Con vịt', 'The duck is yellow.'],
  ]),

  ...makeWords('pre-a1-starters', 'school', [
    ['Book', 'Quyển sách', 'The book is open.'],
    ['Pen', 'Cây bút', 'The pen is blue.'],
    ['Pencil', 'Bút chì', 'The pencil is sharp.'],
    ['Bag', 'Cặp sách', 'The bag is under the desk.'],
    ['Desk', 'Bàn học', 'The desk is tidy.'],
    ['Chair', 'Cái ghế', 'The chair is near the desk.'],
    ['Class', 'Lớp học', 'The class is quiet.'],
    ['Teacher', 'Giáo viên', 'The teacher is kind.'],
    ['School', 'Trường học', 'School starts today.'],
    ['Crayon', 'Bút sáp màu', 'The crayon is red.'],
  ]),
  ...makeWords('pre-a1-starters', 'food', [
    ['Apple', 'Quả táo', 'I eat an apple.'],
    ['Banana', 'Quả chuối', 'The banana is yellow.'],
    ['Bread', 'Bánh mì', 'Bread is on the plate.'],
    ['Cake', 'Bánh ngọt', 'The cake is sweet.'],
    ['Milk', 'Sữa', 'I drink milk.'],
    ['Water', 'Nước', 'Water is in the cup.'],
    ['Rice', 'Cơm / gạo', 'Rice is hot.'],
    ['Egg', 'Quả trứng', 'The egg is white.'],
    ['Soup', 'Món súp', 'The soup is warm.'],
    ['Juice', 'Nước ép', 'The juice is cold.'],
  ]),
  ...makeWords('pre-a1-starters', 'body', [
    ['Head', 'Cái đầu', 'My head is big.'],
    ['Hand', 'Bàn tay', 'Raise your hand.'],
    ['Foot', 'Bàn chân', 'My foot is small.'],
    ['Eye', 'Mắt', 'My eye is brown.'],
    ['Ear', 'Tai', 'My ear can hear.'],
    ['Nose', 'Mũi', 'My nose is small.'],
    ['Mouth', 'Miệng', 'My mouth can smile.'],
    ['Hair', 'Tóc', 'Her hair is long.'],
  ]),
  ...makeWords('pre-a1-starters', 'home', [
    ['House', 'Ngôi nhà', 'The house is big.'],
    ['Door', 'Cánh cửa', 'The door is open.'],
    ['Window', 'Cửa sổ', 'The window is clean.'],
    ['Bed', 'Giường', 'The bed is soft.'],
    ['Table', 'Cái bàn', 'The table is round.'],
    ['Lamp', 'Đèn bàn', 'The lamp is bright.'],
    ['Room', 'Căn phòng', 'My room is tidy.'],
    ['Garden', 'Khu vườn', 'The garden has flowers.'],
  ]),
  ...makeWords('pre-a1-starters', 'weather', [
    ['Sun', 'Mặt trời', 'The sun is hot.'],
    ['Moon', 'Mặt trăng', 'The moon is bright.'],
    ['Star', 'Ngôi sao', 'The star is small.'],
    ['Rain', 'Mưa', 'Rain falls today.'],
    ['Cloud', 'Đám mây', 'The cloud is white.'],
    ['Snow', 'Tuyết', 'Snow is cold.'],
    ['Sunny', 'Có nắng', 'It is sunny today.'],
    ['Windy', 'Có gió', 'It is windy outside.'],
  ]),
  ...makeWords('pre-a1-starters', 'nature', [
    ['Tree', 'Cái cây', 'The tree is tall.'],
    ['Flower', 'Bông hoa', 'The flower is pink.'],
    ['Beach', 'Bãi biển', 'The beach is clean.'],
    ['River', 'Con sông', 'The river is blue.'],
    ['Plant', 'Cây non', 'The plant needs water.'],
    ['Stone', 'Hòn đá', 'The stone is grey.'],
  ]),
  ...makeWords('pre-a1-starters', 'actions', [
    ['Happy', 'Vui vẻ', 'I am happy.'],
    ['Sad', 'Buồn', 'The boy is sad.'],
    ['Smile', 'Mỉm cười', 'Smile for the photo.'],
    ['Run', 'Chạy', 'Run to the door.'],
    ['Jump', 'Nhảy', 'Jump on the spot.'],
    ['Sing', 'Hát', 'Sing a short song.'],
    ['Draw', 'Vẽ', 'Draw a blue fish.'],
    ['Read', 'Đọc', 'Read the word.'],
  ]),

  ...makeWords('a1-movers', 'daily routines', [
    ['Breakfast', 'Bữa sáng', 'Breakfast is ready.'],
    ['Lunch', 'Bữa trưa', 'Lunch is at school.'],
    ['Dinner', 'Bữa tối', 'Dinner is delicious.'],
    ['Shower', 'Tắm vòi sen', 'Take a shower at night.'],
    ['Brush', 'Đánh răng', 'Brush your teeth.'],
    ['Wake', 'Thức dậy', 'Wake up early.'],
    ['Homework', 'Bài tập về nhà', 'Homework is on the desk.'],
    ['Today', 'Hôm nay', 'Today is Monday.'],
    ['Weekend', 'Cuối tuần', 'The weekend is fun.'],
  ]),
  ...makeWords('a1-movers', 'places', [
    ['Park', 'Công viên', 'The park is near my house.'],
    ['Market', 'Chợ', 'The market is busy.'],
    ['Library', 'Thư viện', 'The library is quiet.'],
    ['Kitchen', 'Nhà bếp', 'The kitchen smells good.'],
    ['Hospital', 'Bệnh viện', 'The hospital is clean.'],
    ['Station', 'Nhà ga', 'The station is crowded.'],
    ['Museum', 'Bảo tàng', 'The museum has old pictures.'],
    ['Playground', 'Sân chơi', 'The playground is safe.'],
    ['Zoo', 'Sở thú', 'The zoo has a zebra.'],
    ['Cinema', 'Rạp chiếu phim', 'The cinema is dark.'],
  ]),
  ...makeWords('a1-movers', 'transport', [
    ['Train', 'Tàu hỏa', 'The train is fast.'],
    ['Plane', 'Máy bay', 'The plane is in the sky.'],
    ['Boat', 'Thuyền', 'The boat is on the lake.'],
    ['Bike', 'Xe đạp', 'My bike is green.'],
    ['Scooter', 'Xe trượt / xe tay ga', 'The scooter is small.'],
    ['Taxi', 'Xe taxi', 'The taxi stops here.'],
    ['Airport', 'Sân bay', 'The airport is far away.'],
  ]),
  ...makeWords('a1-movers', 'hobbies', [
    ['Music', 'Âm nhạc', 'Music makes me happy.'],
    ['Dance', 'Nhảy múa', 'Dance with your friends.'],
    ['Football', 'Bóng đá', 'Football is my hobby.'],
    ['Painting', 'Vẽ tranh', 'Painting is relaxing.'],
    ['Camera', 'Máy ảnh', 'The camera takes a photo.'],
    ['Guitar', 'Đàn ghi-ta', 'The guitar is loud.'],
    ['Swimming', 'Bơi lội', 'Swimming is fun.'],
    ['Reading', 'Đọc sách', 'Reading helps me learn.'],
    ['Cooking', 'Nấu ăn', 'Cooking takes time.'],
  ]),
  ...makeWords('a1-movers', 'nature', [
    ['Mountain', 'Ngọn núi', 'The mountain is high.'],
    ['Ocean', 'Đại dương', 'The ocean is deep.'],
    ['Forest', 'Khu rừng', 'The forest is green.'],
    ['Island', 'Hòn đảo', 'The island is quiet.'],
    ['Rainbow', 'Cầu vồng', 'The rainbow has many colors.'],
    ['Butterfly', 'Con bướm', 'The butterfly is beautiful.'],
    ['Elephant', 'Con voi', 'The elephant is huge.'],
    ['Monkey', 'Con khỉ', 'The monkey climbs a tree.'],
    ['Tiger', 'Con hổ', 'The tiger is strong.'],
    ['Zebra', 'Con ngựa vằn', 'The zebra has stripes.'],
  ]),
  ...makeWords('a1-movers', 'feelings', [
    ['Tired', 'Mệt', 'I am tired after running.'],
    ['Hungry', 'Đói', 'The girl is hungry.'],
    ['Thirsty', 'Khát nước', 'The boy is thirsty.'],
    ['Kind', 'Tốt bụng', 'My teacher is kind.'],
    ['Brave', 'Dũng cảm', 'The brave child helps.'],
    ['Quiet', 'Yên lặng', 'The room is quiet.'],
    ['Loud', 'To / ồn', 'The music is loud.'],
    ['Fast', 'Nhanh', 'The bike is fast.'],
  ]),

  ...makeWords('a2-flyers', 'adventure', [
    ['Adventure', 'Cuộc phiêu lưu', 'The adventure starts today.'],
    ['Journey', 'Hành trình', 'The journey is long.'],
    ['Treasure', 'Kho báu', 'The treasure is under the tree.'],
    ['Secret', 'Bí mật', 'The secret is in the box.'],
    ['Explorer', 'Nhà thám hiểm', 'The explorer finds a cave.'],
    ['Castle', 'Lâu đài', 'The castle is on the hill.'],
    ['Dragon', 'Con rồng', 'The dragon guards the gate.'],
    ['Cave', 'Hang động', 'The cave is dark.'],
    ['Map', 'Bản đồ', 'The map shows the river.'],
    ['Clue', 'Manh mối', 'The clue is on the wall.'],
  ]),
  ...makeWords('a2-flyers', 'science', [
    ['Planet', 'Hành tinh', 'The planet is far away.'],
    ['Space', 'Không gian', 'Space is full of stars.'],
    ['Rocket', 'Tên lửa', 'The rocket flies high.'],
    ['Robot', 'Người máy', 'The robot can help.'],
    ['Energy', 'Năng lượng', 'Energy makes things move.'],
    ['Forecast', 'Dự báo thời tiết', 'The forecast says it will rain.'],
    ['Climate', 'Khí hậu', 'The climate is changing.'],
    ['Recycle', 'Tái chế', 'Recycle paper and bottles.'],
    ['Ecosystem', 'Hệ sinh thái', 'The ecosystem needs balance.'],
    ['Experiment', 'Thí nghiệm', 'The experiment is simple.'],
  ]),
  ...makeWords('a2-flyers', 'health', [
    ['Doctor', 'Bác sĩ', 'The doctor checks my arm.'],
    ['Nurse', 'Y tá', 'The nurse is helpful.'],
    ['Medicine', 'Thuốc', 'Medicine helps me feel better.'],
    ['Exercise', 'Tập thể dục', 'Exercise keeps us healthy.'],
    ['Healthy', 'Khỏe mạnh', 'Healthy food gives energy.'],
    ['Safety', 'Sự an toàn', 'Safety comes first.'],
    ['Visitor', 'Khách thăm', 'The visitor asks a question.'],
    ['Volunteer', 'Tình nguyện viên', 'The volunteer cleans the park.'],
  ]),
  ...makeWords('a2-flyers', 'technology', [
    ['Computer', 'Máy tính', 'The computer is on the table.'],
    ['Internet', 'Mạng internet', 'The internet helps us search.'],
    ['Message', 'Tin nhắn', 'The message is short.'],
    ['Screen', 'Màn hình', 'The screen is bright.'],
    ['Search', 'Tìm kiếm', 'Search for the answer.'],
    ['Video', 'Đoạn phim', 'The video teaches a new word.'],
    ['Program', 'Chương trình', 'The program opens quickly.'],
    ['Password', 'Mật khẩu', 'Keep your password safe.'],
    ['Speaker', 'Loa', 'The speaker is loud.'],
    ['Website', 'Trang web', 'The website has games.'],
  ]),
  ...makeWords('a2-flyers', 'language', [
    ['Sentence', 'Câu', 'The sentence is clear.'],
    ['Question', 'Câu hỏi', 'The question is easy.'],
    ['Answer', 'Câu trả lời', 'The answer is correct.'],
    ['Describe', 'Miêu tả', 'Describe the picture.'],
    ['Explain', 'Giải thích', 'Explain your idea.'],
    ['Compare', 'So sánh', 'Compare the two animals.'],
    ['Opinion', 'Ý kiến', 'My opinion is different.'],
    ['Reason', 'Lý do', 'Give one reason.'],
    ['Because', 'Bởi vì', 'I drink water because I am thirsty.'],
    ['Suddenly', 'Bất ngờ', 'Suddenly, the door opens.'],
  ]),

  ...makeWords('a2-bridge', 'projects', [
    ['Project', 'Dự án', 'The project has three steps.'],
    ['Plan', 'Kế hoạch', 'Make a plan before you start.'],
    ['Goal', 'Mục tiêu', 'My goal is to read a story.'],
    ['Choice', 'Lựa chọn', 'The choice is yours.'],
    ['Improve', 'Cải thiện', 'Improve your answer each time.'],
    ['Create', 'Tạo ra', 'Create a short comic.'],
    ['Design', 'Thiết kế', 'Design a poster.'],
    ['Present', 'Trình bày', 'Present your project to the class.'],
    ['Teamwork', 'Làm việc nhóm', 'Teamwork makes the project easier.'],
    ['Feedback', 'Phản hồi', 'Feedback helps us improve.'],
  ]),
  ...makeWords('a2-bridge', 'culture', [
    ['Culture', 'Văn hóa', 'Culture shapes how people live.'],
    ['Festival', 'Lễ hội', 'The festival starts in spring.'],
    ['Tradition', 'Truyền thống', 'The tradition is important.'],
    ['News', 'Tin tức', 'The news tells us what happened.'],
    ['Article', 'Bài viết', 'The article is about animals.'],
    ['Interview', 'Phỏng vấn', 'The interview has five questions.'],
    ['Survey', 'Khảo sát', 'The survey asks about hobbies.'],
  ]),
  ...makeWords('a2-bridge', 'problem solving', [
    ['Problem', 'Vấn đề', 'The problem needs a solution.'],
    ['Solution', 'Giải pháp', 'The solution works well.'],
    ['Evidence', 'Bằng chứng', 'Evidence supports the idea.'],
    ['Invention', 'Phát minh', 'The invention saves time.'],
    ['Discovery', 'Khám phá', 'The discovery is exciting.'],
    ['Responsibility', 'Trách nhiệm', 'Responsibility means doing your part.'],
    ['Confidence', 'Sự tự tin', 'Confidence grows with practice.'],
    ['Conversation', 'Cuộc trò chuyện', 'The conversation is friendly.'],
    ['Pronunciation', 'Phát âm', 'Pronunciation improves with listening.'],
    ['Imagination', 'Trí tưởng tượng', 'Imagination makes stories fun.'],
    ['Collaboration', 'Sự hợp tác', 'Collaboration helps the team finish.'],
  ]),
];

const TOPIC_HINTS: Array<{ topic: string; words: string[] }> = [
  { topic: 'greetings', words: ['hello', 'goodbye', 'please', 'thank', 'yes', 'no', 'sorry'] },
  { topic: 'colors', words: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink', 'brown'] },
  { topic: 'numbers', words: ['one', 'two', 'three', 'four', 'five', 'ten'] },
  { topic: 'animals', words: ['cat', 'dog', 'fish', 'bird', 'cow', 'duck', 'elephant', 'monkey', 'tiger', 'zebra', 'dragon'] },
  { topic: 'food', words: ['apple', 'banana', 'bread', 'cake', 'milk', 'water', 'rice', 'egg', 'soup', 'juice'] },
  { topic: 'school', words: ['book', 'pen', 'pencil', 'bag', 'desk', 'chair', 'class', 'teacher', 'school', 'crayon'] },
  { topic: 'home', words: ['house', 'door', 'window', 'bed', 'table', 'lamp', 'room', 'garden'] },
  { topic: 'weather', words: ['sun', 'moon', 'star', 'rain', 'cloud', 'snow', 'sunny', 'windy', 'forecast', 'climate'] },
  { topic: 'nature', words: ['tree', 'flower', 'beach', 'river', 'plant', 'stone', 'mountain', 'ocean', 'forest', 'island', 'rainbow'] },
  { topic: 'technology', words: ['computer', 'internet', 'message', 'screen', 'search', 'video', 'program', 'password', 'speaker', 'website'] },
];

const WORD_LOOKUP = new Map(
  DEFAULT_WORD_BANK.map((word) => [word.en.trim().toLowerCase(), enrichBuiltIn(word)]),
);

function makeWords(level: CurriculumStageId | string, topic: string, words: WordTuple[]): WordPair[] {
  return words.map(([en, vi, example]) => ({ en, vi, level, topic, example }));
}

function enrichBuiltIn(word: WordPair): Required<Pick<WordPair, 'en' | 'vi' | 'level' | 'topic'>> & Pick<WordPair, 'example'> {
  return {
    en: word.en.trim(),
    vi: word.vi.trim(),
    level: normalizeStageId(word.level) ?? 'a2-key',
    topic: word.topic?.trim().toLowerCase() || 'general',
    example: word.example?.trim() || `I can see ${word.en.trim().toLowerCase()}.`,
  };
}

function inferTopic(en: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim().toLowerCase();
  const key = en.trim().toLowerCase();
  const builtIn = WORD_LOOKUP.get(key)?.topic;
  if (builtIn) return builtIn;
  return TOPIC_HINTS.find((group) => group.words.includes(key))?.topic ?? 'general';
}

function inferStage(en: string, explicit?: unknown): CurriculumStageId {
  const normalized = normalizeStageId(explicit);
  if (normalized) return normalized;
  const builtIn = WORD_LOOKUP.get(en.trim().toLowerCase())?.level;
  if (builtIn) return normalizeStageId(builtIn) || 'a2-key';
  const len = en.replace(/[^a-z]/gi, '').length;
  if (len >= 10) return 'b2-first';
  if (len >= 8) return 'b1-preliminary';
  return 'a2-key';
}

export function enrichWordPair(word: WordPair): WordPair & Required<Pick<WordPair, 'en' | 'vi' | 'topic'>> & { level: CurriculumStageId; example?: string } {
  const en = word.en.trim();
  const builtIn = WORD_LOOKUP.get(en.toLowerCase());
  return {
    ...word,
    en,
    vi: word.vi.trim(),
    level: inferStage(en, word.level),
    topic: inferTopic(en, word.topic),
    example: word.example?.trim() || builtIn?.example || `I can see ${en.toLowerCase()}.`,
  };
}

// Normalize raw JSON into a safe WordPair[] (drops malformed entries).
export function normalizeWordBank(raw: unknown): WordPair[] | null {
  if (!Array.isArray(raw)) return null;
  const pairs: WordPair[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const en = typeof o.en === 'string' ? o.en.trim() : '';
    const vi = typeof o.vi === 'string' ? o.vi.trim() : '';
    const level = normalizeStageId(o.level);
    const topic = typeof o.topic === 'string' ? o.topic.trim().toLowerCase() : undefined;
    const example = typeof o.example === 'string' ? o.example.trim() : undefined;
    const qualityStatus = typeof o.qualityStatus === 'string' ? o.qualityStatus : typeof o.quality_status === 'string' ? o.quality_status : undefined;
    const viReviewStatus = typeof o.viReviewStatus === 'string' ? o.viReviewStatus : typeof o.vi_review_status === 'string' ? o.vi_review_status : undefined;
    const viSourceId = typeof o.viSourceId === 'string' ? o.viSourceId : typeof o.vi_source_id === 'string' ? o.vi_source_id : undefined;
    const viSourceUrl = typeof o.viSourceUrl === 'string' ? o.viSourceUrl : typeof o.vi_source_url === 'string' ? o.vi_source_url : undefined;
    const viLicenseName = typeof o.viLicenseName === 'string' ? o.viLicenseName : typeof o.vi_license_name === 'string' ? o.vi_license_name : undefined;
    const viLicenseUrl = typeof o.viLicenseUrl === 'string' ? o.viLicenseUrl : typeof o.vi_license_url === 'string' ? o.vi_license_url : undefined;
    const viAttribution = typeof o.viAttribution === 'string' ? o.viAttribution : typeof o.vi_attribution === 'string' ? o.vi_attribution : undefined;
    const viConfidenceRaw = typeof o.viConfidence === 'number' ? o.viConfidence : typeof o.vi_confidence === 'number' ? o.vi_confidence : undefined;
    const viConfidence = typeof viConfidenceRaw === 'number' && Number.isFinite(viConfidenceRaw) ? viConfidenceRaw : undefined;
    if (en && vi) pairs.push(enrichWordPair({ en, vi, level, topic, example, qualityStatus, viReviewStatus, viSourceId, viSourceUrl, viLicenseName, viLicenseUrl, viAttribution, viConfidence }));
  }
  return pairs.length > 0 ? pairs : null;
}

const BAD_VI_PREFIXES = ['tu ', 'tinh tu ', 'dong tu ', 't\u1eeb ', 't\u00ednh t\u1eeb ', '\u0111\u1ed9ng t\u1eeb '];
const SYNTHETIC_PHRASE_PREFIX_RE = /^(red|blue|green|yellow|black|white|pink|brown|big|small|hot|cold|open|closed|clean|dirty|quiet|fast|slow|brave|careful|creative|crowded|helpful|healthy|important|possible|responsible|successful|useful)\s+/i;

export function isPlayableWord(word: WordPair): boolean {
  const en = word.en.trim();
  const vi = word.vi.trim();
  const viLower = vi.toLowerCase();
  const status = String(word.viReviewStatus || '').toLowerCase();
  const quality = String(word.qualityStatus || '').toLowerCase();

  if (!en || !vi) return false;
  if (quality === 'blocked' || status === 'blocked' || status === 'translation_pending') return false;
  if (viLower === 'translation_pending' || viLower.includes('translation pending')) return false;
  const viNoMarks = vi.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  if (BAD_VI_PREFIXES.some((prefix) => viLower.startsWith(prefix) || viNoMarks.startsWith(prefix))) return false;
  if (!/[a-zA-Z]/.test(en)) return false;
  if (/^[a-zA-Z]{1,2}$/.test(en)) return false;
  if (SYNTHETIC_PHRASE_PREFIX_RE.test(en) && en.includes(' ')) return false;
  return true;
}

export function filterPlayableWordBank(bank: WordPair[]): WordPair[] {
  const source = (bank.length ? bank : DEFAULT_WORD_BANK).map(enrichWordPair);
  const playable = source.filter(isPlayableWord);
  return playable.length >= 4 ? playable : DEFAULT_WORD_BANK.map(enrichWordPair);
}
export function filterWordBank(
  bank: WordPair[],
  opts: WordBankFilter = {},
): WordPair[] {
  const enriched = (bank.length ? bank : DEFAULT_WORD_BANK).map(enrichWordPair);
  const level = normalizeStageId(opts.level);
  const topic = opts.topic?.trim().toLowerCase();
  let filtered = enriched;
  if (level) {
    const levelIndex = CURRICULUM_STAGES.findIndex((stage) => stage.id === level);
    filtered = filtered.filter((word) => {
      const wordIndex = CURRICULUM_STAGES.findIndex((stage) => stage.id === word.level);
      return wordIndex <= Math.max(levelIndex, 0);
    });
  }
  if (topic) filtered = filtered.filter((word) => word.topic === topic);
  const min = opts.min ?? 4;
  return filtered.length >= min ? filtered : enriched;
}

export function getWordBankStats(bank: WordPair[] = DEFAULT_WORD_BANK): WordBankStats {
  const byLevel = Object.fromEntries(CURRICULUM_STAGES.map((stage) => [stage.id, 0])) as Record<CurriculumStageId, number>;
  const byTopic: Record<string, number> = {};
  let fiveLetterCount = 0;
  let exampleCount = 0;

  for (const word of (bank.length ? bank : DEFAULT_WORD_BANK).map(enrichWordPair)) {
    byLevel[word.level] += 1;
    byTopic[word.topic] = (byTopic[word.topic] || 0) + 1;
    if (/^[a-zA-Z]{5}$/.test(word.en)) fiveLetterCount += 1;
    if (word.example) exampleCount += 1;
  }

  return {
    total: bank.length || DEFAULT_WORD_BANK.length,
    fiveLetterCount,
    exampleCount,
    byLevel,
    byTopic,
  };
}

export function getStageWordCount(stageId: CurriculumStageId, bank: WordPair[] = DEFAULT_WORD_BANK): number {
  return (bank.length ? bank : DEFAULT_WORD_BANK).map(enrichWordPair).filter((word) => word.level === stageId).length;
}

export function getWordBankTopics(bank: WordPair[] = DEFAULT_WORD_BANK): string[] {
  return Object.keys(getWordBankStats(bank).byTopic).sort((a, b) => a.localeCompare(b));
}

export function toMatchingPairs(bank: WordPair[], difficulty: 'easy' | 'medium' | 'hard', count: number): Array<{ id: number; en: string; vi: string; level: 'easy' | 'medium' | 'hard' }> {
  const stage = stageForDifficulty(difficulty);
  return shuffle(filterWordBank(bank, { level: stage, min: count })).slice(0, Math.max(count, 1)).map((word, index) => ({
    id: index + 1,
    en: word.en,
    vi: word.vi,
    level: difficulty,
  }));
}

export function toCoinQuestions(bank: WordPair[], count = 20): Array<{ vi: string; choices: string[]; correct: number }> {
  const source = filterWordBank(bank, { min: 4 });
  return shuffle(source).slice(0, Math.min(count, source.length)).map((word) => {
    const distractors = buildDistractors(source, word.en, 3);
    const choices = shuffle([word.en, ...distractors]);
    return { vi: word.vi, choices, correct: choices.indexOf(word.en) };
  });
}

export function toRpgQuestions(bank: WordPair[]): Array<{ q: string; choices: string[]; correct: number }> {
  const source = filterWordBank(bank, { min: 4 });
  return source.map((word) => {
    const distractors = shuffle(source.filter((item) => item.en.toLowerCase() !== word.en.toLowerCase()))
      .slice(0, 3)
      .map((item) => item.vi);
    const choices = shuffle([word.vi, ...distractors]);
    return { q: `"${word.en}" nghĩa là gì?`, choices, correct: choices.indexOf(word.vi) };
  });
}

export function toFillBlankQuestions(bank: WordPair[], count = 20): Array<{ sentence: string; answer: string; options: string[]; hint: string }> {
  const source = filterWordBank(bank, { min: 4 });
  return shuffle(source).slice(0, Math.min(count, source.length)).map((word) => {
    const answer = word.en.toLowerCase();
    const options = shuffle([answer, ...buildDistractors(source, word.en, 3).map((item) => item.toLowerCase())]);
    const curatedExample = WORD_LOOKUP.get(word.en.toLowerCase())?.example;
    const sentence = curatedExample?.replace(new RegExp(`\\b${escapeRegExp(word.en)}\\b`, 'i'), '___')
      || `The word for "${word.vi}" is ___.`;
    return { sentence, answer, options, hint: word.vi };
  });
}

export function toSentenceScrambles(bank: WordPair[], count = 20): Array<{ id: number; text: string; hint: string }> {
  const source = filterWordBank(bank, { min: 4 });
  return shuffle(source).slice(0, Math.min(count, source.length)).map((word, index) => ({
    id: index + 1,
    text: WORD_LOOKUP.get(word.en.toLowerCase())?.example || `I am learning the word ${word.en.toLowerCase()}.`,
    hint: word.vi,
  }));
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build N wrong-answer distractors for a target word from the bank.
export function buildDistractors(bank: WordPair[], answerEn: string, count: number): string[] {
  const source = bank.length > count ? bank : [...bank, ...DEFAULT_WORD_BANK];
  const pool = shuffle(source.map(enrichWordPair).filter((w) => w.en.toLowerCase() !== answerEn.toLowerCase()));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of pool) {
    if (seen.has(w.en.toLowerCase())) continue;
    seen.add(w.en.toLowerCase());
    result.push(w.en);
    if (result.length >= count) break;
  }
  return result;
}

// rpg-world shape: { vi, en, choices[] }
export function toChoiceQuestions(bank: WordPair[]): Array<{ vi: string; en: string; choices: string[] }> {
  const source = filterWordBank(bank, { min: 4 });
  return source.map((w) => {
    const distractors = buildDistractors(source, w.en, 3);
    return { vi: w.vi, en: w.en, choices: shuffle([w.en, ...distractors]) };
  });
}

// tower-climb shape: { vi, en, wrong[] }
export function toWrongQuestions(bank: WordPair[]): Array<{ vi: string; en: string; wrong: string[] }> {
  const source = filterWordBank(bank, { min: 4 });
  return source.map((w) => ({ vi: w.vi, en: w.en, wrong: buildDistractors(source, w.en, 3) }));
}

// word-puzzle needs exactly 5-letter words; fall back to defaults if too few.
export function toFiveLetterWords(bank: WordPair[]): WordPair[] {
  const five = filterWordBank(bank).filter((w) => /^[a-zA-Z]{5}$/.test(w.en));
  if (five.length >= 5) return five.map((w) => ({ en: w.en.toUpperCase(), vi: w.vi, level: w.level, topic: w.topic, example: w.example }));
  const fallback = DEFAULT_WORD_BANK.filter((w) => /^[a-zA-Z]{5}$/.test(w.en));
  return fallback.map((w) => ({ en: w.en.toUpperCase(), vi: w.vi, level: w.level, topic: w.topic, example: w.example }));
}

// memory-match shape: { en, vi, emoji } (emoji = 2-letter label)
export function toMemoryPairs(bank: WordPair[]): Array<{ en: string; vi: string; emoji: string }> {
  return filterWordBank(bank).map((w) => ({ en: w.en, vi: w.vi, emoji: w.en.slice(0, 2).toUpperCase() }));
}

// Fetch the bank from the API (client-side), falling back to defaults.
export async function loadWordBank(opts?: WordBankFilter): Promise<WordPair[]> {
  try {
    const params = new URLSearchParams();
    let stage = opts?.level ? String(opts.level) : '';
    if (!stage) {
      try {
        const levelRes = await fetch('/api/learner/level', { credentials: 'include', cache: 'no-store' });
        if (levelRes.ok) {
          const levelJson = await levelRes.json();
          stage = levelJson?.learnerState?.currentStageId || '';
        }
      } catch {
        stage = '';
      }
    }
    if (stage) params.set('stage', stage);
    if (opts?.topic) params.set('topic', opts.topic);
    const url = params.size > 0 ? `/api/games/word-bank?${params.toString()}` : '/api/games/word-bank';
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return opts ? filterWordBank(DEFAULT_WORD_BANK, opts) : DEFAULT_WORD_BANK.map(enrichWordPair);
    const json = await res.json();
    const normalized = normalizeWordBank(json?.data);
    const bank = filterPlayableWordBank(normalized || DEFAULT_WORD_BANK.map(enrichWordPair));
    return opts ? filterWordBank(bank, opts) : bank;
  } catch {
    return opts ? filterWordBank(DEFAULT_WORD_BANK, opts) : DEFAULT_WORD_BANK.map(enrichWordPair);
  }
}



