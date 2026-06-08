import { CURRICULUM_STAGES, normalizeStageId, stageForDifficulty, type CurriculumStageId } from './curriculum';

// ============================================
// SHARED WORD BANK
// ============================================
// A single editable list of English/Vietnamese word pairs that powers all the
// vocabulary games (memory-match, word-burst, word-puzzle, tower-word,
// rpg-world, tower-climb). Admins edit one list; each game adapts it to its own
// mechanics. Falls back to DEFAULT_WORD_BANK so games never break.

export interface WordPair {
  en: string;
  vi: string;
  level?: CurriculumStageId;
  topic?: string;
  example?: string;
}

export interface WordBankFilter {
  level?: CurriculumStageId | string;
  topic?: string;
  min?: number;
}

export const DEFAULT_WORD_BANK: WordPair[] = [
  { en: 'Apple', vi: 'Quả táo' },
  { en: 'Ocean', vi: 'Đại dương' },
  { en: 'Cloud', vi: 'Đám mây' },
  { en: 'Flame', vi: 'Ngọn lửa' },
  { en: 'Magic', vi: 'Ma thuật' },
  { en: 'Sword', vi: 'Thanh kiếm' },
  { en: 'Frost', vi: 'Băng giá' },
  { en: 'Eagle', vi: 'Đại bàng' },
  { en: 'Stone', vi: 'Hòn đá' },
  { en: 'Crown', vi: 'Vương miện' },
  { en: 'Dream', vi: 'Giấc mơ' },
  { en: 'Light', vi: 'Ánh sáng' },
  { en: 'Music', vi: 'Âm nhạc' },
  { en: 'Honey', vi: 'Mật ong' },
  { en: 'River', vi: 'Con sông' },
  { en: 'Tower', vi: 'Tòa tháp' },
  { en: 'Plant', vi: 'Cây cối' },
  { en: 'Storm', vi: 'Cơn bão' },
  { en: 'Pearl', vi: 'Ngọc trai' },
  { en: 'Earth', vi: 'Trái đất' },
  { en: 'Sun', vi: 'Mặt trời' },
  { en: 'Moon', vi: 'Mặt trăng' },
  { en: 'Star', vi: 'Ngôi sao' },
  { en: 'Rain', vi: 'Mưa' },
  { en: 'Fire', vi: 'Lửa' },
  { en: 'Tree', vi: 'Cái cây' },
  { en: 'Flower', vi: 'Bông hoa' },
  { en: 'Bird', vi: 'Con chim' },
  { en: 'Fish', vi: 'Con cá' },
  { en: 'Heart', vi: 'Trái tim' },
  { en: 'Dragon', vi: 'Con rồng' },
  { en: 'Castle', vi: 'Lâu đài' },
  { en: 'Forest', vi: 'Khu rừng' },
  { en: 'Cat', vi: 'Con mèo' },
  { en: 'Dog', vi: 'Con chó' },
  { en: 'House', vi: 'Ngôi nhà' },
  { en: 'Water', vi: 'Nước' },
  { en: 'Book', vi: 'Cuốn sách' },
  { en: 'Car', vi: 'Chiếc xe' },
  { en: 'Mountain', vi: 'Ngọn núi' },
];

const TOPIC_HINTS: Array<{ topic: string; words: string[] }> = [
  { topic: 'food', words: ['apple', 'honey', 'milk', 'bread', 'cake', 'banana', 'water'] },
  { topic: 'animals', words: ['cat', 'dog', 'bird', 'fish', 'dragon', 'eagle'] },
  { topic: 'nature', words: ['ocean', 'cloud', 'river', 'plant', 'tree', 'flower', 'forest', 'mountain', 'rain', 'storm', 'earth', 'stone'] },
  { topic: 'space', words: ['sun', 'moon', 'star', 'light'] },
  { topic: 'home', words: ['house', 'book', 'car'] },
  { topic: 'fantasy', words: ['magic', 'sword', 'crown', 'tower', 'castle', 'pearl', 'frost', 'flame'] },
  { topic: 'feelings', words: ['heart', 'dream', 'music'] },
];

function inferTopic(en: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim().toLowerCase();
  const key = en.trim().toLowerCase();
  return TOPIC_HINTS.find((group) => group.words.includes(key))?.topic ?? 'general';
}

function inferStage(en: string, explicit?: unknown): CurriculumStageId {
  const normalized = normalizeStageId(explicit);
  if (normalized) return normalized;
  const len = en.replace(/[^a-z]/gi, '').length;
  if (len >= 9) return 'a2-flyers';
  if (len >= 7) return 'a1-movers';
  return 'pre-a1-starters';
}

export function enrichWordPair(word: WordPair): Required<Pick<WordPair, 'en' | 'vi' | 'level' | 'topic'>> & Pick<WordPair, 'example'> {
  return {
    en: word.en.trim(),
    vi: word.vi.trim(),
    level: inferStage(word.en, word.level),
    topic: inferTopic(word.en, word.topic),
    example: word.example?.trim() || `I can see ${word.en.trim().toLowerCase()}.`,
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

export function toMatchingPairs(bank: WordPair[], difficulty: 'easy' | 'medium' | 'hard', count: number): Array<{ id: number; en: string; vi: string; level: 'easy' | 'medium' | 'hard' }> {
  const stage = stageForDifficulty(difficulty);
  return filterWordBank(bank, { level: stage, min: count }).slice(0, Math.max(count, 1)).map((word, index) => ({
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
    const sentence = word.example?.replace(new RegExp(`\\b${escapeRegExp(word.en)}\\b`, 'i'), '___') || `I can see a ___.`;
    return { sentence: sentence.includes('___') ? sentence : `I can see a ___.`, answer, options, hint: word.vi };
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

// ---- Game-specific adapters ----

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build N wrong-answer distractors for a target word from the bank.
export function buildDistractors(bank: WordPair[], answerEn: string, count: number): string[] {
  const source = bank.length > count ? bank : [...bank, ...DEFAULT_WORD_BANK];
  const pool = shuffle(source.filter((w) => w.en.toLowerCase() !== answerEn.toLowerCase()));
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
  if (five.length >= 5) return five.map((w) => ({ en: w.en.toUpperCase(), vi: w.vi }));
  const fallback = DEFAULT_WORD_BANK.filter((w) => /^[a-zA-Z]{5}$/.test(w.en));
  return fallback.map((w) => ({ en: w.en.toUpperCase(), vi: w.vi }));
}

// memory-match shape: { en, vi, emoji } (emoji = 2-letter label)
export function toMemoryPairs(bank: WordPair[]): Array<{ en: string; vi: string; emoji: string }> {
  return filterWordBank(bank).map((w) => ({ en: w.en, vi: w.vi, emoji: w.en.slice(0, 2).toUpperCase() }));
}

// Fetch the bank from the API (client-side), falling back to defaults.
export async function loadWordBank(opts?: WordBankFilter): Promise<WordPair[]> {
  try {
    const res = await fetch('/api/games/word-bank', { cache: 'no-store' });
    if (!res.ok) return opts ? filterWordBank(DEFAULT_WORD_BANK, opts) : DEFAULT_WORD_BANK.map(enrichWordPair);
    const json = await res.json();
    const normalized = normalizeWordBank(json?.data);
    const bank = normalized || DEFAULT_WORD_BANK.map(enrichWordPair);
    return opts ? filterWordBank(bank, opts) : bank;
  } catch {
    return opts ? filterWordBank(DEFAULT_WORD_BANK, opts) : DEFAULT_WORD_BANK.map(enrichWordPair);
  }
}
