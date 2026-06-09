import { CURRICULUM_STAGES, normalizeStageId, stageForDifficulty, type CurriculumStageId } from './curriculum';

// ============================================
// SHARED WORD BANK
// ============================================
// A single editable list of English/Vietnamese word pairs that powers all
// vocabulary games and the farm/pet practice loops. The built-in seed follows
// a CEFR + Cambridge Young Learners progression, but it is not a verbatim copy
// of any official wordlist. Admins can edit or replace it from the dashboard.

export interface WordPair {
  en: string;
  vi: string;
  level?: CurriculumStageId | string;
  topic?: string;
  example?: string;
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
    ['Hello', 'Xin chÃ o', 'Hello, teacher.'],
    ['Goodbye', 'Táº¡m biá»‡t', 'Goodbye, my friend.'],
    ['Please', 'LÃ m Æ¡n', 'Please sit down.'],
    ['Thank', 'Cáº£m Æ¡n', 'Thank you, Mum.'],
    ['Yes', 'CÃ³ / Ä‘Ãºng', 'Yes, I can.'],
    ['No', 'KhÃ´ng', 'No, thank you.'],
    ['Sorry', 'Xin lá»—i', 'Sorry, Dad.'],
    ['Great', 'Tuyá»‡t vá»i', 'Great job today.'],
  ]),
  ...makeWords('sound-play', 'colors', [
    ['Red', 'MÃ u Ä‘á»', 'The ball is red.'],
    ['Blue', 'MÃ u xanh dÆ°Æ¡ng', 'The bag is blue.'],
    ['Green', 'MÃ u xanh lÃ¡', 'The leaf is green.'],
    ['Yellow', 'MÃ u vÃ ng', 'The sun is yellow.'],
    ['Black', 'MÃ u Ä‘en', 'The cat is black.'],
    ['White', 'MÃ u tráº¯ng', 'The cloud is white.'],
    ['Pink', 'MÃ u há»“ng', 'The doll is pink.'],
    ['Brown', 'MÃ u nÃ¢u', 'The dog is brown.'],
  ]),
  ...makeWords('sound-play', 'numbers', [
    ['One', 'Sá»‘ má»™t', 'One bird is here.'],
    ['Two', 'Sá»‘ hai', 'Two cats are sleeping.'],
    ['Three', 'Sá»‘ ba', 'Three apples are red.'],
    ['Four', 'Sá»‘ bá»‘n', 'Four ducks are swimming.'],
    ['Five', 'Sá»‘ nÄƒm', 'Five stars are bright.'],
    ['Ten', 'Sá»‘ mÆ°á»i', 'Ten fingers are clean.'],
  ]),
  ...makeWords('sound-play', 'family', [
    ['Mum', 'Máº¹', 'Mum is smiling.'],
    ['Dad', 'Bá»‘', 'Dad is reading.'],
    ['Baby', 'Em bÃ©', 'The baby is happy.'],
    ['Friend', 'Báº¡n bÃ¨', 'My friend can sing.'],
  ]),
  ...makeWords('sound-play', 'toys', [
    ['Ball', 'Quáº£ bÃ³ng', 'The ball can roll.'],
    ['Doll', 'BÃºp bÃª', 'The doll is on the bed.'],
    ['Teddy', 'Gáº¥u bÃ´ng', 'Teddy is soft.'],
    ['Kite', 'Con diá»u', 'The kite is high.'],
    ['Toy', 'Äá»“ chÆ¡i', 'This toy is fun.'],
    ['Car', 'Xe Ã´ tÃ´', 'The car is small.'],
  ]),
  ...makeWords('sound-play', 'animals', [
    ['Cat', 'Con mÃ¨o', 'The cat is cute.'],
    ['Dog', 'Con chÃ³', 'The dog can run.'],
    ['Fish', 'Con cÃ¡', 'The fish is orange.'],
    ['Bird', 'Con chim', 'The bird can fly.'],
    ['Cow', 'Con bÃ²', 'The cow is big.'],
    ['Duck', 'Con vá»‹t', 'The duck is yellow.'],
  ]),

  ...makeWords('pre-a1-starters', 'school', [
    ['Book', 'Quyá»ƒn sÃ¡ch', 'The book is open.'],
    ['Pen', 'CÃ¢y bÃºt', 'The pen is blue.'],
    ['Pencil', 'BÃºt chÃ¬', 'The pencil is sharp.'],
    ['Bag', 'Cáº·p sÃ¡ch', 'The bag is under the desk.'],
    ['Desk', 'BÃ n há»c', 'The desk is tidy.'],
    ['Chair', 'CÃ¡i gháº¿', 'The chair is near the desk.'],
    ['Class', 'Lá»›p há»c', 'The class is quiet.'],
    ['Teacher', 'GiÃ¡o viÃªn', 'The teacher is kind.'],
    ['School', 'TrÆ°á»ng há»c', 'School starts today.'],
    ['Crayon', 'BÃºt sÃ¡p mÃ u', 'The crayon is red.'],
  ]),
  ...makeWords('pre-a1-starters', 'food', [
    ['Apple', 'Quáº£ tÃ¡o', 'I eat an apple.'],
    ['Banana', 'Quáº£ chuá»‘i', 'The banana is yellow.'],
    ['Bread', 'BÃ¡nh mÃ¬', 'Bread is on the plate.'],
    ['Cake', 'BÃ¡nh ngá»t', 'The cake is sweet.'],
    ['Milk', 'Sá»¯a', 'I drink milk.'],
    ['Water', 'NÆ°á»›c', 'Water is in the cup.'],
    ['Rice', 'CÆ¡m / gáº¡o', 'Rice is hot.'],
    ['Egg', 'Quáº£ trá»©ng', 'The egg is white.'],
    ['Soup', 'MÃ³n sÃºp', 'The soup is warm.'],
    ['Juice', 'NÆ°á»›c Ã©p', 'The juice is cold.'],
  ]),
  ...makeWords('pre-a1-starters', 'body', [
    ['Head', 'CÃ¡i Ä‘áº§u', 'My head is big.'],
    ['Hand', 'BÃ n tay', 'Raise your hand.'],
    ['Foot', 'BÃ n chÃ¢n', 'My foot is small.'],
    ['Eye', 'Máº¯t', 'My eye is brown.'],
    ['Ear', 'Tai', 'My ear can hear.'],
    ['Nose', 'MÅ©i', 'My nose is small.'],
    ['Mouth', 'Miá»‡ng', 'My mouth can smile.'],
    ['Hair', 'TÃ³c', 'Her hair is long.'],
  ]),
  ...makeWords('pre-a1-starters', 'home', [
    ['House', 'NgÃ´i nhÃ ', 'The house is big.'],
    ['Door', 'CÃ¡nh cá»­a', 'The door is open.'],
    ['Window', 'Cá»­a sá»•', 'The window is clean.'],
    ['Bed', 'GiÆ°á»ng', 'The bed is soft.'],
    ['Table', 'CÃ¡i bÃ n', 'The table is round.'],
    ['Lamp', 'ÄÃ¨n bÃ n', 'The lamp is bright.'],
    ['Room', 'CÄƒn phÃ²ng', 'My room is tidy.'],
    ['Garden', 'Khu vÆ°á»n', 'The garden has flowers.'],
  ]),
  ...makeWords('pre-a1-starters', 'weather', [
    ['Sun', 'Máº·t trá»i', 'The sun is hot.'],
    ['Moon', 'Máº·t trÄƒng', 'The moon is bright.'],
    ['Star', 'NgÃ´i sao', 'The star is small.'],
    ['Rain', 'MÆ°a', 'Rain falls today.'],
    ['Cloud', 'ÄÃ¡m mÃ¢y', 'The cloud is white.'],
    ['Snow', 'Tuyáº¿t', 'Snow is cold.'],
    ['Sunny', 'CÃ³ náº¯ng', 'It is sunny today.'],
    ['Windy', 'CÃ³ giÃ³', 'It is windy outside.'],
  ]),
  ...makeWords('pre-a1-starters', 'nature', [
    ['Tree', 'CÃ¡i cÃ¢y', 'The tree is tall.'],
    ['Flower', 'BÃ´ng hoa', 'The flower is pink.'],
    ['Beach', 'BÃ£i biá»ƒn', 'The beach is clean.'],
    ['River', 'Con sÃ´ng', 'The river is blue.'],
    ['Plant', 'CÃ¢y non', 'The plant needs water.'],
    ['Stone', 'HÃ²n Ä‘Ã¡', 'The stone is grey.'],
  ]),
  ...makeWords('pre-a1-starters', 'actions', [
    ['Happy', 'Vui váº»', 'I am happy.'],
    ['Sad', 'Buá»“n', 'The boy is sad.'],
    ['Smile', 'Má»‰m cÆ°á»i', 'Smile for the photo.'],
    ['Run', 'Cháº¡y', 'Run to the door.'],
    ['Jump', 'Nháº£y', 'Jump on the spot.'],
    ['Sing', 'HÃ¡t', 'Sing a short song.'],
    ['Draw', 'Váº½', 'Draw a blue fish.'],
    ['Read', 'Äá»c', 'Read the word.'],
  ]),

  ...makeWords('a1-movers', 'daily routines', [
    ['Breakfast', 'Bá»¯a sÃ¡ng', 'Breakfast is ready.'],
    ['Lunch', 'Bá»¯a trÆ°a', 'Lunch is at school.'],
    ['Dinner', 'Bá»¯a tá»‘i', 'Dinner is delicious.'],
    ['Shower', 'Táº¯m vÃ²i sen', 'Take a shower at night.'],
    ['Brush', 'ÄÃ¡nh rÄƒng', 'Brush your teeth.'],
    ['Wake', 'Thá»©c dáº­y', 'Wake up early.'],
    ['Homework', 'BÃ i táº­p vá» nhÃ ', 'Homework is on the desk.'],
    ['Today', 'HÃ´m nay', 'Today is Monday.'],
    ['Weekend', 'Cuá»‘i tuáº§n', 'The weekend is fun.'],
  ]),
  ...makeWords('a1-movers', 'places', [
    ['Park', 'CÃ´ng viÃªn', 'The park is near my house.'],
    ['Market', 'Chá»£', 'The market is busy.'],
    ['Library', 'ThÆ° viá»‡n', 'The library is quiet.'],
    ['Kitchen', 'NhÃ  báº¿p', 'The kitchen smells good.'],
    ['Hospital', 'Bá»‡nh viá»‡n', 'The hospital is clean.'],
    ['Station', 'NhÃ  ga', 'The station is crowded.'],
    ['Museum', 'Báº£o tÃ ng', 'The museum has old pictures.'],
    ['Playground', 'SÃ¢n chÆ¡i', 'The playground is safe.'],
    ['Zoo', 'Sá»Ÿ thÃº', 'The zoo has a zebra.'],
    ['Cinema', 'Ráº¡p chiáº¿u phim', 'The cinema is dark.'],
  ]),
  ...makeWords('a1-movers', 'transport', [
    ['Train', 'TÃ u há»a', 'The train is fast.'],
    ['Plane', 'MÃ¡y bay', 'The plane is in the sky.'],
    ['Boat', 'Thuyá»n', 'The boat is on the lake.'],
    ['Bike', 'Xe Ä‘áº¡p', 'My bike is green.'],
    ['Scooter', 'Xe trÆ°á»£t / xe tay ga', 'The scooter is small.'],
    ['Taxi', 'Xe taxi', 'The taxi stops here.'],
    ['Airport', 'SÃ¢n bay', 'The airport is far away.'],
  ]),
  ...makeWords('a1-movers', 'hobbies', [
    ['Music', 'Ã‚m nháº¡c', 'Music makes me happy.'],
    ['Dance', 'Nháº£y mÃºa', 'Dance with your friends.'],
    ['Football', 'BÃ³ng Ä‘Ã¡', 'Football is my hobby.'],
    ['Painting', 'Váº½ tranh', 'Painting is relaxing.'],
    ['Camera', 'MÃ¡y áº£nh', 'The camera takes a photo.'],
    ['Guitar', 'ÄÃ n ghi-ta', 'The guitar is loud.'],
    ['Swimming', 'BÆ¡i lá»™i', 'Swimming is fun.'],
    ['Reading', 'Äá»c sÃ¡ch', 'Reading helps me learn.'],
    ['Cooking', 'Náº¥u Äƒn', 'Cooking takes time.'],
  ]),
  ...makeWords('a1-movers', 'nature', [
    ['Mountain', 'Ngá»n nÃºi', 'The mountain is high.'],
    ['Ocean', 'Äáº¡i dÆ°Æ¡ng', 'The ocean is deep.'],
    ['Forest', 'Khu rá»«ng', 'The forest is green.'],
    ['Island', 'HÃ²n Ä‘áº£o', 'The island is quiet.'],
    ['Rainbow', 'Cáº§u vá»“ng', 'The rainbow has many colors.'],
    ['Butterfly', 'Con bÆ°á»›m', 'The butterfly is beautiful.'],
    ['Elephant', 'Con voi', 'The elephant is huge.'],
    ['Monkey', 'Con khá»‰', 'The monkey climbs a tree.'],
    ['Tiger', 'Con há»•', 'The tiger is strong.'],
    ['Zebra', 'Con ngá»±a váº±n', 'The zebra has stripes.'],
  ]),
  ...makeWords('a1-movers', 'feelings', [
    ['Tired', 'Má»‡t', 'I am tired after running.'],
    ['Hungry', 'ÄÃ³i', 'The girl is hungry.'],
    ['Thirsty', 'KhÃ¡t nÆ°á»›c', 'The boy is thirsty.'],
    ['Kind', 'Tá»‘t bá»¥ng', 'My teacher is kind.'],
    ['Brave', 'DÅ©ng cáº£m', 'The brave child helps.'],
    ['Quiet', 'YÃªn láº·ng', 'The room is quiet.'],
    ['Loud', 'To / á»“n', 'The music is loud.'],
    ['Fast', 'Nhanh', 'The bike is fast.'],
  ]),

  ...makeWords('a2-flyers', 'adventure', [
    ['Adventure', 'Cuá»™c phiÃªu lÆ°u', 'The adventure starts today.'],
    ['Journey', 'HÃ nh trÃ¬nh', 'The journey is long.'],
    ['Treasure', 'Kho bÃ¡u', 'The treasure is under the tree.'],
    ['Secret', 'BÃ­ máº­t', 'The secret is in the box.'],
    ['Explorer', 'NhÃ  thÃ¡m hiá»ƒm', 'The explorer finds a cave.'],
    ['Castle', 'LÃ¢u Ä‘Ã i', 'The castle is on the hill.'],
    ['Dragon', 'Con rá»“ng', 'The dragon guards the gate.'],
    ['Cave', 'Hang Ä‘á»™ng', 'The cave is dark.'],
    ['Map', 'Báº£n Ä‘á»“', 'The map shows the river.'],
    ['Clue', 'Manh má»‘i', 'The clue is on the wall.'],
  ]),
  ...makeWords('a2-flyers', 'science', [
    ['Planet', 'HÃ nh tinh', 'The planet is far away.'],
    ['Space', 'KhÃ´ng gian', 'Space is full of stars.'],
    ['Rocket', 'TÃªn lá»­a', 'The rocket flies high.'],
    ['Robot', 'NgÆ°á»i mÃ¡y', 'The robot can help.'],
    ['Energy', 'NÄƒng lÆ°á»£ng', 'Energy makes things move.'],
    ['Forecast', 'Dá»± bÃ¡o thá»i tiáº¿t', 'The forecast says it will rain.'],
    ['Climate', 'KhÃ­ háº­u', 'The climate is changing.'],
    ['Recycle', 'TÃ¡i cháº¿', 'Recycle paper and bottles.'],
    ['Ecosystem', 'Há»‡ sinh thÃ¡i', 'The ecosystem needs balance.'],
    ['Experiment', 'ThÃ­ nghiá»‡m', 'The experiment is simple.'],
  ]),
  ...makeWords('a2-flyers', 'health', [
    ['Doctor', 'BÃ¡c sÄ©', 'The doctor checks my arm.'],
    ['Nurse', 'Y tÃ¡', 'The nurse is helpful.'],
    ['Medicine', 'Thuá»‘c', 'Medicine helps me feel better.'],
    ['Exercise', 'Táº­p thá»ƒ dá»¥c', 'Exercise keeps us healthy.'],
    ['Healthy', 'Khá»e máº¡nh', 'Healthy food gives energy.'],
    ['Safety', 'Sá»± an toÃ n', 'Safety comes first.'],
    ['Visitor', 'KhÃ¡ch thÄƒm', 'The visitor asks a question.'],
    ['Volunteer', 'TÃ¬nh nguyá»‡n viÃªn', 'The volunteer cleans the park.'],
  ]),
  ...makeWords('a2-flyers', 'technology', [
    ['Computer', 'MÃ¡y tÃ­nh', 'The computer is on the table.'],
    ['Internet', 'Máº¡ng internet', 'The internet helps us search.'],
    ['Message', 'Tin nháº¯n', 'The message is short.'],
    ['Screen', 'MÃ n hÃ¬nh', 'The screen is bright.'],
    ['Search', 'TÃ¬m kiáº¿m', 'Search for the answer.'],
    ['Video', 'Äoáº¡n phim', 'The video teaches a new word.'],
    ['Program', 'ChÆ°Æ¡ng trÃ¬nh', 'The program opens quickly.'],
    ['Password', 'Máº­t kháº©u', 'Keep your password safe.'],
    ['Speaker', 'Loa', 'The speaker is loud.'],
    ['Website', 'Trang web', 'The website has games.'],
  ]),
  ...makeWords('a2-flyers', 'language', [
    ['Sentence', 'CÃ¢u', 'The sentence is clear.'],
    ['Question', 'CÃ¢u há»i', 'The question is easy.'],
    ['Answer', 'CÃ¢u tráº£ lá»i', 'The answer is correct.'],
    ['Describe', 'MiÃªu táº£', 'Describe the picture.'],
    ['Explain', 'Giáº£i thÃ­ch', 'Explain your idea.'],
    ['Compare', 'So sÃ¡nh', 'Compare the two animals.'],
    ['Opinion', 'Ã kiáº¿n', 'My opinion is different.'],
    ['Reason', 'LÃ½ do', 'Give one reason.'],
    ['Because', 'Bá»Ÿi vÃ¬', 'I drink water because I am thirsty.'],
    ['Suddenly', 'Báº¥t ngá»', 'Suddenly, the door opens.'],
  ]),

  ...makeWords('a2-bridge', 'projects', [
    ['Project', 'Dá»± Ã¡n', 'The project has three steps.'],
    ['Plan', 'Káº¿ hoáº¡ch', 'Make a plan before you start.'],
    ['Goal', 'Má»¥c tiÃªu', 'My goal is to read a story.'],
    ['Choice', 'Lá»±a chá»n', 'The choice is yours.'],
    ['Improve', 'Cáº£i thiá»‡n', 'Improve your answer each time.'],
    ['Create', 'Táº¡o ra', 'Create a short comic.'],
    ['Design', 'Thiáº¿t káº¿', 'Design a poster.'],
    ['Present', 'TrÃ¬nh bÃ y', 'Present your project to the class.'],
    ['Teamwork', 'LÃ m viá»‡c nhÃ³m', 'Teamwork makes the project easier.'],
    ['Feedback', 'Pháº£n há»“i', 'Feedback helps us improve.'],
  ]),
  ...makeWords('a2-bridge', 'culture', [
    ['Culture', 'VÄƒn hÃ³a', 'Culture shapes how people live.'],
    ['Festival', 'Lá»… há»™i', 'The festival starts in spring.'],
    ['Tradition', 'Truyá»n thá»‘ng', 'The tradition is important.'],
    ['News', 'Tin tá»©c', 'The news tells us what happened.'],
    ['Article', 'BÃ i viáº¿t', 'The article is about animals.'],
    ['Interview', 'Phá»ng váº¥n', 'The interview has five questions.'],
    ['Survey', 'Kháº£o sÃ¡t', 'The survey asks about hobbies.'],
  ]),
  ...makeWords('a2-bridge', 'problem solving', [
    ['Problem', 'Váº¥n Ä‘á»', 'The problem needs a solution.'],
    ['Solution', 'Giáº£i phÃ¡p', 'The solution works well.'],
    ['Evidence', 'Báº±ng chá»©ng', 'Evidence supports the idea.'],
    ['Invention', 'PhÃ¡t minh', 'The invention saves time.'],
    ['Discovery', 'KhÃ¡m phÃ¡', 'The discovery is exciting.'],
    ['Responsibility', 'TrÃ¡ch nhiá»‡m', 'Responsibility means doing your part.'],
    ['Confidence', 'Sá»± tá»± tin', 'Confidence grows with practice.'],
    ['Conversation', 'Cuá»™c trÃ² chuyá»‡n', 'The conversation is friendly.'],
    ['Pronunciation', 'PhÃ¡t Ã¢m', 'Pronunciation improves with listening.'],
    ['Imagination', 'TrÃ­ tÆ°á»Ÿng tÆ°á»£ng', 'Imagination makes stories fun.'],
    ['Collaboration', 'Sá»± há»£p tÃ¡c', 'Collaboration helps the team finish.'],
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

export function enrichWordPair(word: WordPair): Required<Pick<WordPair, 'en' | 'vi' | 'topic'>> & { level: CurriculumStageId; example?: string } {
  const en = word.en.trim();
  const builtIn = WORD_LOOKUP.get(en.toLowerCase());
  return {
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
    if (en && vi) pairs.push(enrichWordPair({ en, vi, level, topic, example }));
  }
  return pairs.length > 0 ? pairs : null;
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
    return { q: `"${word.en}" nghÄ©a lÃ  gÃ¬?`, choices, correct: choices.indexOf(word.vi) };
  });
}

export function toFillBlankQuestions(bank: WordPair[], count = 20): Array<{ sentence: string; answer: string; options: string[]; hint: string }> {
  const source = filterWordBank(bank, { min: 4 });
  return shuffle(source).slice(0, Math.min(count, source.length)).map((word) => {
    const answer = word.en.toLowerCase();
    const options = shuffle([answer, ...buildDistractors(source, word.en, 3).map((item) => item.toLowerCase())]);
    const sentence = word.example?.replace(new RegExp(`\\b${escapeRegExp(word.en)}\\b`, 'i'), '___') || `I can see ___.`;
    return { sentence: sentence.includes('___') ? sentence : `I can see ___.`, answer, options, hint: word.vi };
  });
}

export function toSentenceScrambles(bank: WordPair[], count = 20): Array<{ id: number; text: string; hint: string }> {
  const source = filterWordBank(bank, { min: 4 });
  return shuffle(source).slice(0, Math.min(count, source.length)).map((word, index) => ({
    id: index + 1,
    text: word.example || `I can see ${word.en.toLowerCase()}`,
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
    const bank = normalized || DEFAULT_WORD_BANK.map(enrichWordPair);
    return opts ? filterWordBank(bank, opts) : bank;
  } catch {
    return opts ? filterWordBank(DEFAULT_WORD_BANK, opts) : DEFAULT_WORD_BANK.map(enrichWordPair);
  }
}



