// ============================================
// AI VOCABULARY EXTRACTION SERVICE (Groq)
// ============================================
// Extracts learn-worthy English vocabulary (with Vietnamese meaning) from a
// video's English subtitles. Reuses the same GROQ_API_KEY and calling pattern
// as src/app/api/translate/route.ts. Output is validated into WordPair[]
// (the shared word-bank shape). Never throws.

import type { SubtitleCue } from '@/types';
import type { WordPair } from '@/lib/word-bank';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_TRANSCRIPT_CHARS = 6000;

export interface ExtractVocabOptions {
  /** Max number of words to extract (clamped 1..30). */
  count?: number;
  /** Difficulty hint. */
  level?: 'Beginner' | 'Elementary' | 'Intermediate';
}

export interface ExtractVocabResult {
  words: WordPair[];
  reason?: string;
}

function buildTranscript(cues: SubtitleCue[]): string {
  const text = (cues || [])
    .map((c) => (typeof c.textEn === 'string' ? c.textEn.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > MAX_TRANSCRIPT_CHARS ? text.slice(0, MAX_TRANSCRIPT_CHARS) : text;
}

function extractJson(content: string): unknown {
  let jsonStr = content.trim();
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();
  }
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    const arr = jsonStr.indexOf('[');
    const obj = jsonStr.indexOf('{');
    const start = arr === -1 ? obj : obj === -1 ? arr : Math.min(arr, obj);
    if (start > 0) jsonStr = jsonStr.slice(start);
  }
  return JSON.parse(jsonStr);
}

/** Validate + dedupe raw AI output into WordPair[]. */
export function sanitizeVocab(raw: unknown): WordPair[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { words?: unknown })?.words)
      ? (raw as { words: unknown[] }).words
      : [];

  const seen = new Set<string>();
  const result: WordPair[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const en = typeof o.en === 'string' ? o.en.trim() : '';
    const vi = typeof o.vi === 'string' ? o.vi.trim() : '';
    if (!en || !vi) continue;
    const key = en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ en, vi });
  }
  return result;
}

/** Extract vocabulary from subtitle cues. Returns words for admin review. */
export async function extractVocabFromSubtitles(
  cues: SubtitleCue[],
  options: ExtractVocabOptions = {},
): Promise<ExtractVocabResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { words: [], reason: 'GROQ_API_KEY chưa được cấu hình trên server.' };
  }

  const transcript = buildTranscript(cues);
  if (!transcript || transcript.length < 20) {
    return { words: [], reason: 'Phụ đề quá ngắn hoặc trống, không đủ để trích từ vựng.' };
  }

  const count = Math.min(Math.max(Math.round(options.count ?? 15), 1), 30);
  const level = options.level ?? 'Beginner';

  const systemPrompt = `Bạn là giáo viên tiếng Anh cho trẻ em Việt Nam (5-10 tuổi). Từ transcript tiếng Anh của một video, hãy chọn ra các TỪ/CỤM TỪ đáng học nhất cho lứa tuổi này. Yêu cầu:
- Chọn tối đa ${count} từ, ưu tiên danh từ/động từ/tính từ thông dụng, độ khó: ${level}.
- Bỏ qua từ quá đơn giản (the, a, is, you...) và tên riêng.
- "en": từ tiếng Anh ở dạng cơ bản (số ít, nguyên thể), viết hoa chữ cái đầu.
- "vi": nghĩa tiếng Việt ngắn gọn, phù hợp trẻ em.
Trả về DUY NHẤT một JSON, không kèm văn bản khác:
{ "words": [ { "en": "Apple", "vi": "Quả táo" } ] }`;

  const userPrompt = `Transcript tiếng Anh:\n${transcript}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq vocab extraction error:', errorText);
      return { words: [], reason: 'Dịch vụ AI tạm thời lỗi, thử lại sau.' };
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    let parsed: unknown;
    try {
      parsed = extractJson(content);
    } catch {
      console.error('Failed to parse Groq vocab JSON:', content.slice(0, 500));
      return { words: [], reason: 'AI trả về dữ liệu không hợp lệ, thử lại.' };
    }

    const words = sanitizeVocab(parsed);
    if (words.length === 0) {
      return { words: [], reason: 'AI không trích được từ vựng hợp lệ, thử lại.' };
    }
    return { words };
  } catch (error) {
    console.error('Vocab extraction request failed:', error);
    return { words: [], reason: 'Không gọi được dịch vụ AI (mạng/timeout).' };
  }
}
