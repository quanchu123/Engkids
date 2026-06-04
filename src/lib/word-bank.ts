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

// Normalize raw JSON into a safe WordPair[] (drops malformed entries).
export function normalizeWordBank(raw: unknown): WordPair[] | null {
  if (!Array.isArray(raw)) return null;
  const pairs: WordPair[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const en = typeof o.en === 'string' ? o.en.trim() : '';
    const vi = typeof o.vi === 'string' ? o.vi.trim() : '';
    if (en && vi) pairs.push({ en, vi });
  }
  return pairs.length > 0 ? pairs : null;
}

// ---- Game-specific adapters ----

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Build N wrong-answer distractors for a target word from the bank.
export function buildDistractors(bank: WordPair[], answerEn: string, count: number): string[] {
  const pool = shuffle(bank.filter((w) => w.en.toLowerCase() !== answerEn.toLowerCase()));
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
  return bank.map((w) => {
    const distractors = buildDistractors(bank, w.en, 3);
    return { vi: w.vi, en: w.en, choices: shuffle([w.en, ...distractors]) };
  });
}

// tower-climb shape: { vi, en, wrong[] }
export function toWrongQuestions(bank: WordPair[]): Array<{ vi: string; en: string; wrong: string[] }> {
  return bank.map((w) => ({ vi: w.vi, en: w.en, wrong: buildDistractors(bank, w.en, 3) }));
}

// word-puzzle needs exactly 5-letter words; fall back to defaults if too few.
export function toFiveLetterWords(bank: WordPair[]): WordPair[] {
  const five = bank.filter((w) => /^[a-zA-Z]{5}$/.test(w.en));
  if (five.length >= 5) return five.map((w) => ({ en: w.en.toUpperCase(), vi: w.vi }));
  const fallback = DEFAULT_WORD_BANK.filter((w) => /^[a-zA-Z]{5}$/.test(w.en));
  return fallback.map((w) => ({ en: w.en.toUpperCase(), vi: w.vi }));
}

// memory-match shape: { en, vi, emoji } (emoji = 2-letter label)
export function toMemoryPairs(bank: WordPair[]): Array<{ en: string; vi: string; emoji: string }> {
  return bank.map((w) => ({ en: w.en, vi: w.vi, emoji: w.en.slice(0, 2).toUpperCase() }));
}

// Fetch the bank from the API (client-side), falling back to defaults.
export async function loadWordBank(): Promise<WordPair[]> {
  try {
    const res = await fetch('/api/games/word-bank', { cache: 'no-store' });
    if (!res.ok) return DEFAULT_WORD_BANK;
    const json = await res.json();
    const normalized = normalizeWordBank(json?.data);
    return normalized || DEFAULT_WORD_BANK;
  } catch {
    return DEFAULT_WORD_BANK;
  }
}
