// ============================================
// AI BATCH TRANSLATION SERVICE (Groq)
// ============================================
// Translates an array of English subtitle lines into Vietnamese in a single
// Groq call. Reuses the same GROQ_API_KEY and calling pattern as
// src/app/api/translate/route.ts. Never throws: on any failure it returns the
// original lines with empty translations and a reason.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Bound the batch to keep cost/latency reasonable.
const MAX_LINES = 200;
const MAX_TOTAL_CHARS = 8000;

export interface BatchTranslateResult {
  /** Vietnamese translations, aligned by index with the input lines. */
  translations: string[];
  reason?: string;
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

/**
 * Translate English subtitle lines to Vietnamese. Returns an array aligned with
 * the input (same length); entries the model failed to translate are ''.
 */
export async function translateLinesToVietnamese(lines: string[]): Promise<BatchTranslateResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { translations: lines.map(() => ''), reason: 'GROQ_API_KEY chưa được cấu hình trên server.' };
  }

  const clean = (lines || []).map((l) => (typeof l === 'string' ? l.trim() : ''));
  if (clean.length === 0) {
    return { translations: [], reason: 'Không có dòng nào để dịch.' };
  }
  if (clean.length > MAX_LINES) {
    return { translations: clean.map(() => ''), reason: `Quá nhiều dòng (tối đa ${MAX_LINES}).` };
  }
  const totalChars = clean.reduce((sum, l) => sum + l.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return { translations: clean.map(() => ''), reason: `Nội dung quá dài (tối đa ${MAX_TOTAL_CHARS} ký tự).` };
  }

  const systemPrompt = `Bạn là dịch giả Anh-Việt cho nội dung học tiếng Anh dành cho trẻ em. Dịch từng dòng phụ đề tiếng Anh sang tiếng Việt tự nhiên, ngắn gọn, hợp lứa tuổi. Giữ NGUYÊN thứ tự và SỐ LƯỢNG dòng.
Trả về DUY NHẤT một JSON, không kèm văn bản khác, dạng:
{ "translations": ["bản dịch dòng 1", "bản dịch dòng 2", ...] }
Mảng "translations" phải có đúng số phần tử bằng số dòng đầu vào.`;

  const userPrompt = `Dịch ${clean.length} dòng sau (giữ đúng thứ tự):\n${JSON.stringify(clean)}`;

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
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq batch translate error:', errorText);
      return { translations: clean.map(() => ''), reason: 'Dịch vụ AI tạm thời lỗi, thử lại sau.' };
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    let parsed: unknown;
    try {
      parsed = extractJson(content);
    } catch {
      console.error('Failed to parse Groq translate JSON:', content.slice(0, 500));
      return { translations: clean.map(() => ''), reason: 'AI trả về dữ liệu không hợp lệ, thử lại.' };
    }

    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { translations?: unknown })?.translations)
        ? (parsed as { translations: unknown[] }).translations
        : [];

    // Align to input length: pad/truncate so callers can map by index safely.
    const translations = clean.map((_, i) =>
      typeof rawList[i] === 'string' ? (rawList[i] as string).trim() : '',
    );

    if (translations.every((t) => !t)) {
      return { translations, reason: 'AI không dịch được nội dung, thử lại.' };
    }

    return { translations };
  } catch (error) {
    console.error('Batch translate request failed:', error);
    return { translations: clean.map(() => ''), reason: 'Không gọi được dịch vụ AI (mạng/timeout).' };
  }
}
