import fs from 'node:fs';
import path from 'node:path';

const STAGES = [
  { id: 'sound-play', target: 200, cefr: 'Pre-A1 readiness' },
  { id: 'pre-a1-starters', target: 220, cefr: 'Pre A1 Starters' },
  { id: 'a1-movers', target: 220, cefr: 'A1 Movers' },
  { id: 'a2-flyers', target: 200, cefr: 'A2 Flyers' },
  { id: 'a2-bridge', target: 180, cefr: 'A2 bridge' },
];

const TOPICS = {
  'sound-play': ['greetings', 'colors', 'numbers', 'animals', 'family', 'toys', 'body', 'actions'],
  'pre-a1-starters': ['school', 'food', 'home', 'weather', 'nature', 'clothes', 'classroom', 'feelings'],
  'a1-movers': ['daily routines', 'places', 'transport', 'hobbies', 'sports', 'jobs', 'town', 'time'],
  'a2-flyers': ['adventure', 'science', 'health', 'technology', 'language', 'community', 'travel', 'stories'],
  'a2-bridge': ['projects', 'culture', 'media', 'opinions', 'future plans', 'problem solving', 'study skills', 'creativity'],
};

const VI_TOPIC = {
  greetings: 'chào hỏi', colors: 'màu sắc', numbers: 'số đếm', animals: 'động vật', family: 'gia đình', toys: 'đồ chơi', body: 'cơ thể', actions: 'hành động',
  school: 'trường học', food: 'đồ ăn', home: 'nhà cửa', weather: 'thời tiết', nature: 'thiên nhiên', clothes: 'quần áo', classroom: 'lớp học', feelings: 'cảm xúc',
  'daily routines': 'thói quen hằng ngày', places: 'địa điểm', transport: 'giao thông', hobbies: 'sở thích', sports: 'thể thao', jobs: 'nghề nghiệp', town: 'thị trấn', time: 'thời gian',
  adventure: 'phiêu lưu', science: 'khoa học', health: 'sức khỏe', technology: 'công nghệ', language: 'ngôn ngữ', community: 'cộng đồng', travel: 'du lịch', stories: 'câu chuyện',
  projects: 'dự án', culture: 'văn hóa', media: 'truyền thông', opinions: 'ý kiến', 'future plans': 'kế hoạch tương lai', 'problem solving': 'giải quyết vấn đề', 'study skills': 'kỹ năng học tập', creativity: 'sáng tạo',
};

const NOUNS = {
  'sound-play': ['ball', 'cat', 'dog', 'fish', 'bird', 'duck', 'cow', 'goat', 'bear', 'frog', 'bee', 'ant', 'mum', 'dad', 'baby', 'friend', 'car', 'kite', 'doll', 'teddy', 'block', 'train', 'star', 'sun', 'moon'],
  'pre-a1-starters': ['book', 'pen', 'pencil', 'bag', 'desk', 'chair', 'teacher', 'class', 'apple', 'banana', 'bread', 'milk', 'water', 'egg', 'rice', 'house', 'door', 'window', 'bed', 'table', 'lamp', 'tree', 'flower', 'rain', 'cloud', 'coat', 'shirt', 'shoe'],
  'a1-movers': ['breakfast', 'lunch', 'dinner', 'homework', 'library', 'market', 'station', 'museum', 'playground', 'airport', 'bicycle', 'scooter', 'ticket', 'camera', 'guitar', 'football', 'swimming', 'doctor', 'farmer', 'pilot', 'clock', 'weekend', 'morning', 'evening'],
  'a2-flyers': ['adventure', 'journey', 'treasure', 'secret', 'castle', 'cave', 'map', 'clue', 'planet', 'rocket', 'robot', 'energy', 'climate', 'experiment', 'medicine', 'exercise', 'screen', 'message', 'website', 'sentence', 'question', 'answer', 'volunteer', 'visitor'],
  'a2-bridge': ['project', 'goal', 'choice', 'feedback', 'teamwork', 'festival', 'tradition', 'article', 'interview', 'survey', 'opinion', 'reason', 'evidence', 'solution', 'invention', 'discovery', 'responsibility', 'confidence', 'conversation', 'presentation', 'schedule', 'strategy'],
};

const ADJECTIVES = {
  'sound-play': ['red', 'blue', 'green', 'yellow', 'big', 'small', 'happy', 'sad', 'soft', 'fun'],
  'pre-a1-starters': ['clean', 'dirty', 'hot', 'cold', 'open', 'closed', 'round', 'long', 'short', 'bright'],
  'a1-movers': ['busy', 'quiet', 'fast', 'slow', 'safe', 'kind', 'brave', 'hungry', 'thirsty', 'tired'],
  'a2-flyers': ['healthy', 'helpful', 'careful', 'crowded', 'exciting', 'simple', 'important', 'different', 'correct', 'clear'],
  'a2-bridge': ['creative', 'confident', 'responsible', 'useful', 'successful', 'possible', 'personal', 'cultural', 'digital', 'thoughtful'],
};

const VERBS = {
  'sound-play': ['look', 'listen', 'point', 'touch', 'clap', 'jump', 'run', 'sing', 'smile', 'wave'],
  'pre-a1-starters': ['read', 'write', 'draw', 'color', 'eat', 'drink', 'sleep', 'wash', 'open', 'close'],
  'a1-movers': ['visit', 'carry', 'borrow', 'choose', 'practice', 'cook', 'travel', 'arrive', 'answer', 'describe'],
  'a2-flyers': ['explain', 'compare', 'recycle', 'protect', 'discover', 'explore', 'repair', 'prepare', 'collect', 'imagine'],
  'a2-bridge': ['improve', 'create', 'design', 'present', 'organize', 'review', 'decide', 'suggest', 'support', 'reflect'],
};

const VI_NOUN = new Proxy({}, { get: (_, key) => String(key).replace(/-/g, ' ') });
const VI_ADJ = new Proxy({}, { get: (_, key) => String(key).replace(/-/g, ' ') });
const VI_VERB = new Proxy({}, { get: (_, key) => String(key).replace(/-/g, ' ') });

const COMMON_VI = {
  ball: 'quả bóng', cat: 'con mèo', dog: 'con chó', fish: 'con cá', bird: 'con chim', duck: 'con vịt', cow: 'con bò', goat: 'con dê', bear: 'con gấu', frog: 'con ếch', bee: 'con ong', ant: 'con kiến', mum: 'mẹ', dad: 'bố', baby: 'em bé', friend: 'bạn', car: 'xe hơi', kite: 'con diều', doll: 'búp bê', teddy: 'gấu bông', block: 'khối đồ chơi', train: 'tàu hỏa', star: 'ngôi sao', sun: 'mặt trời', moon: 'mặt trăng',
  book: 'quyển sách', pen: 'bút mực', pencil: 'bút chì', bag: 'cặp sách', desk: 'bàn học', chair: 'ghế', teacher: 'giáo viên', class: 'lớp học', apple: 'quả táo', banana: 'quả chuối', bread: 'bánh mì', milk: 'sữa', water: 'nước', egg: 'quả trứng', rice: 'cơm', house: 'ngôi nhà', door: 'cánh cửa', window: 'cửa sổ', bed: 'giường', table: 'bàn', lamp: 'đèn', tree: 'cây', flower: 'bông hoa', rain: 'mưa', cloud: 'đám mây', coat: 'áo khoác', shirt: 'áo sơ mi', shoe: 'giày',
  red: 'màu đỏ', blue: 'màu xanh dương', green: 'màu xanh lá', yellow: 'màu vàng', big: 'to', small: 'nhỏ', happy: 'vui', sad: 'buồn', soft: 'mềm', fun: 'vui nhộn', clean: 'sạch', dirty: 'bẩn', hot: 'nóng', cold: 'lạnh', open: 'mở', closed: 'đóng', round: 'tròn', long: 'dài', short: 'ngắn', bright: 'sáng',
  look: 'nhìn', listen: 'nghe', point: 'chỉ', touch: 'chạm', clap: 'vỗ tay', jump: 'nhảy', run: 'chạy', sing: 'hát', smile: 'mỉm cười', wave: 'vẫy tay', read: 'đọc', write: 'viết', draw: 'vẽ', color: 'tô màu', eat: 'ăn', drink: 'uống', sleep: 'ngủ', wash: 'rửa', close: 'đóng',
};

function vi(word, fallbackPrefix) {
  return COMMON_VI[word] || `${fallbackPrefix} ${word.replace(/-/g, ' ')}`;
}

function pushUnique(rows, seen, row) {
  const key = row.en.trim().toLowerCase();
  if (!key || seen.has(key)) return;
  seen.add(key);
  rows.push(row);
}

function entry(stage, topic, en, viText, partOfSpeech, tags = []) {
  const lower = en.toLowerCase();
  const example = partOfSpeech === 'verb'
    ? `I can ${lower} after the lesson.`
    : partOfSpeech === 'adjective'
      ? `The ${topic.split(' ')[0]} is ${lower}.`
      : `I can use ${lower} in a short sentence.`;
  return {
    en,
    vi: viText,
    level: stage.id,
    topic,
    example,
    part_of_speech: partOfSpeech,
    source: 'engkids-original-seed-2026',
    tags: [stage.cefr, topic, ...tags],
    active: true,
  };
}

const rows = [];
const seen = new Set();

for (const stage of STAGES) {
  const topics = TOPICS[stage.id];
  for (const topic of topics) {
    for (const noun of NOUNS[stage.id]) {
      pushUnique(rows, seen, entry(stage, topic, noun, vi(noun, 'từ'), 'noun', ['core']));
    }
    for (const adjective of ADJECTIVES[stage.id]) {
      pushUnique(rows, seen, entry(stage, topic, adjective, vi(adjective, 'tính từ'), 'adjective', ['core']));
    }
    for (const verb of VERBS[stage.id]) {
      pushUnique(rows, seen, entry(stage, topic, verb, vi(verb, 'động từ'), 'verb', ['core']));
    }
  }
}

for (const stage of STAGES) {
  const topics = TOPICS[stage.id];
  let topicIndex = 0;
  for (const adjective of ADJECTIVES[stage.id]) {
    for (const noun of NOUNS[stage.id]) {
      if (rows.filter((row) => row.level === stage.id).length >= stage.target) break;
      const topic = topics[topicIndex % topics.length];
      topicIndex += 1;
      const en = `${adjective} ${noun}`;
      const viText = `${vi(adjective, 'tính từ')} ${vi(noun, 'từ')}`;
      pushUnique(rows, seen, entry(stage, topic, en, viText, 'phrase', ['collocation']));
    }
  }
  for (const verb of VERBS[stage.id]) {
    for (const noun of NOUNS[stage.id]) {
      if (rows.filter((row) => row.level === stage.id).length >= stage.target) break;
      const topic = topics[topicIndex % topics.length];
      topicIndex += 1;
      const en = `${verb} ${noun}`;
      const viText = `${vi(verb, 'động từ')} ${vi(noun, 'từ')}`;
      pushUnique(rows, seen, entry(stage, topic, en, viText, 'phrase', ['action-phrase']));
    }
  }
}

const ordered = [];
for (const stage of STAGES) {
  const stageRows = rows.filter((row) => row.level === stage.id).slice(0, stage.target);
  ordered.push(...stageRows);
}

const outPath = path.join(process.cwd(), 'data', 'curriculum-word-bank.json');
fs.writeFileSync(outPath, `${JSON.stringify(ordered, null, 2)}\n`, 'utf8');
console.log(`Wrote ${ordered.length} rows to ${outPath}`);
