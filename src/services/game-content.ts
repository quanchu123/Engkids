// ============================================
// GAME CONTENT SERVICE
// ============================================
// Reads/writes admin-editable game content from the `game_content` table, with
// validation/normalization and fallback to built-in defaults so games never
// render empty or malformed data.
import { createClient } from '@supabase/supabase-js';
import type { MCContent, TFContent, MCQuestion, TFQuestion, GameDifficulty } from '@/types/games';
import { DIFFICULTIES } from '@/types/games';
import { DEFAULT_MULTIPLE_CHOICE, DEFAULT_TRUE_FALSE } from '@/data/game-defaults';
import { DEFAULT_WORD_BANK, normalizeWordBank, type WordPair } from '@/lib/word-bank';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase credentials not configured');
  return createClient(url, anonKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase credentials not configured');
  return createClient(url, serviceKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

function getSupabasePublicReader() {
  try {
    return getSupabaseAdmin();
  } catch {
    return getSupabaseClient();
  }
}

// ---- Normalizers: coerce raw JSON into safe, well-formed content ----

function normalizeMC(raw: unknown): MCContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result = {} as MCContent;
  let total = 0;

  for (const level of DIFFICULTIES) {
    const list = Array.isArray(obj[level]) ? (obj[level] as unknown[]) : [];
    const questions: MCQuestion[] = [];
    list.forEach((item, i) => {
      if (!item || typeof item !== 'object') return;
      const q = item as Record<string, unknown>;
      const question = typeof q.question === 'string' ? q.question.trim() : '';
      const options = Array.isArray(q.options)
        ? q.options.filter((o): o is string => typeof o === 'string' && o.trim() !== '')
        : [];
      const answer = typeof q.answer === 'string' ? q.answer : '';
      if (!question || options.length < 2 || !options.includes(answer)) return;
      questions.push({
        id: typeof q.id === 'number' ? q.id : i + 1,
        question,
        options,
        answer,
        explanation: typeof q.explanation === 'string' ? q.explanation : '',
      });
    });
    result[level] = questions;
    total += questions.length;
  }

  return total > 0 ? result : null;
}

function normalizeTF(raw: unknown): TFContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const result = {} as TFContent;
  let total = 0;

  for (const level of DIFFICULTIES) {
    const list = Array.isArray(obj[level]) ? (obj[level] as unknown[]) : [];
    const questions: TFQuestion[] = [];
    list.forEach((item, i) => {
      if (!item || typeof item !== 'object') return;
      const q = item as Record<string, unknown>;
      const text = typeof q.text === 'string' ? q.text.trim() : '';
      if (!text || typeof q.answer !== 'boolean') return;
      questions.push({
        id: typeof q.id === 'number' ? q.id : i + 1,
        text,
        answer: q.answer,
        explanation: typeof q.explanation === 'string' ? q.explanation : '',
      });
    });
    result[level] = questions;
    total += questions.length;
  }

  return total > 0 ? result : null;
}

async function fetchRaw(gameType: string): Promise<unknown | null> {
  try {
    const supabase = getSupabasePublicReader();
    const { data, error } = await supabase
      .from('game_content')
      .select('data')
      .eq('game_type', gameType)
      .single();
    if (error || !data) return null;
    return data.data;
  } catch {
    return null;
  }
}

// ---- Public read APIs (used by game pages, with fallback) ----

export async function getMultipleChoiceContent(): Promise<MCContent> {
  return normalizeMC(await fetchRaw('multiple-choice')) || DEFAULT_MULTIPLE_CHOICE;
}

export async function getTrueFalseContent(): Promise<TFContent> {
  return normalizeTF(await fetchRaw('true-false')) || DEFAULT_TRUE_FALSE;
}

// ---- Admin write APIs (validate then persist) ----

export async function saveMultipleChoiceContent(raw: unknown): Promise<MCContent> {
  const normalized = normalizeMC(raw);
  if (!normalized) {
    throw new Error('Nội dung không hợp lệ: cần ít nhất 1 câu hỏi hợp lệ.');
  }
  await upsert('multiple-choice', normalized);
  return normalized;
}

export async function saveTrueFalseContent(raw: unknown): Promise<TFContent> {
  const normalized = normalizeTF(raw);
  if (!normalized) {
    throw new Error('Nội dung không hợp lệ: cần ít nhất 1 câu hỏi hợp lệ.');
  }
  await upsert('true-false', normalized);
  return normalized;
}

async function upsert(gameType: string, data: unknown): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('game_content')
    .upsert({ game_type: gameType, data, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save game content: ${error.message}`);
}

// ---- Admin read (returns current content = override or defaults) ----

export async function getMultipleChoiceForAdmin(): Promise<MCContent> {
  return normalizeMC(await fetchRaw('multiple-choice')) || DEFAULT_MULTIPLE_CHOICE;
}

export async function getTrueFalseForAdmin(): Promise<TFContent> {
  return normalizeTF(await fetchRaw('true-false')) || DEFAULT_TRUE_FALSE;
}

// ---- Word bank (shared by the 6 vocabulary games) ----

export async function getWordBank(): Promise<WordPair[]> {
  return normalizeWordBank(await fetchRaw('word-bank')) || DEFAULT_WORD_BANK;
}

export async function saveWordBank(raw: unknown): Promise<WordPair[]> {
  const normalized = normalizeWordBank(raw);
  if (!normalized) {
    throw new Error('Nội dung không hợp lệ: cần ít nhất 1 từ có cả tiếng Anh và tiếng Việt.');
  }
  await upsert('word-bank', normalized);
  return normalized;
}
