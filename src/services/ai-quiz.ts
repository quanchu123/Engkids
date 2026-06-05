// ============================================
// AI QUIZ GENERATION SERVICE (Groq)
// ============================================
// Turns a video's English subtitle text into multiple-choice quiz questions
// using the Groq chat-completions API (OpenAI-compatible). Reuses the same
// GROQ_API_KEY and calling pattern as src/app/api/translate/route.ts.
//
// The output is validated/sanitized into VideoQuizQuestion[] before being
// returned. On any failure (missing key, API error, malformed JSON) it returns
// an empty list with a reason instead of throwing, so callers never crash.

import type { SubtitleCue, VideoQuizQuestion } from '@/types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Keep the transcript sent to the model bounded to control cost/latency.
const MAX_TRANSCRIPT_CHARS = 6000;

export interface GenerateQuizOptions {
  /** Number of questions to request (clamped 1..10). */
  count?: number;
  /** Difficulty hint for the model. */
  level?: 'Beginner' | 'Elementary' | 'Intermediate';
  /** Optional video title for extra context. */
  title?: string;
}

export interface GenerateQuizResult {
  quiz: VideoQuizQuestion[];
  /** Reason when quiz is empty (e.g. no transcript, AI unavailable). */
  reason?: string;
}

/** Join English subtitle lines into a single transcript, bounded in length. */
export function buildTranscript(cues: SubtitleCue[]): string {
  const text = (cues || [])
    .map((c) => (typeof c.textEn === 'string' ? c.textEn.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > MAX_TRANSCRIPT_CHARS ? text.slice(0, MAX_TRANSCRIPT_CHARS) : text;
}

/**
 * Validate and coerce a raw AI response object into VideoQuizQuestion[].
 * Drops any question that does not meet the constraints enforced by the
 * existing PUT /api/videos/[id]/quiz endpoint (2-4 options, valid correctIndex).
 */
export function sanitizeQuiz(raw: unknown): VideoQuizQuestion[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { questions?: unknown })?.questions)
      ? (raw as { questions: unknown[] }).questions
      : [];

  const result: VideoQuizQuestion[] = [];

  list.forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    const q = item as Record<string, unknown>;

    const question = typeof q.question === 'string' ? q.question.trim() : '';
    const options = Array.isArray(q.options)
      ? q.options.filter((o): o is string => typeof o === 'string' && o.trim() !== '').map((o) => o.trim())
      : [];

    if (!question || options.length < 2 || options.length > 4) return;

    // Determine correct index from either `correctIndex` or `answer` text.
    let correctIndex = 0;
    if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length) {
      correctIndex = q.correctIndex;
    } else if (typeof q.answer === 'string') {
      const idx = options.findIndex((o) => o.toLowerCase() === (q.answer as string).trim().toLowerCase());
      if (idx >= 0) correctIndex = idx;
    }

    result.push({
      id: typeof q.id === 'string' && q.id ? q.id : `quiz-ai-${Date.now()}-${i}`,
      question,
      questionVi: typeof q.questionVi === 'string' ? q.questionVi.trim() : undefined,
      options,
      correctIndex,
      explanation: typeof q.explanation === 'string' ? q.explanation.trim() : undefined,
    });
  });

  return result;
}

/** Extract a JSON payload from a model response that may wrap it in code fences. */
function extractJson(content: string): unknown {
  let jsonStr = content.trim();
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();
  }
  // If the model returned prose around the JSON, try to grab the array/object.
  if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
    const arr = jsonStr.indexOf('[');
    const obj = jsonStr.indexOf('{');
    const start = arr === -1 ? obj : obj === -1 ? arr : Math.min(arr, obj);
    if (start > 0) jsonStr = jsonStr.slice(start);
  }
  return JSON.parse(jsonStr);
}

/**
 * Generate quiz questions from subtitle cues. Returns sanitized questions ready
 * for the admin to review before saving. Never throws.
 */
export async function generateQuizFromSubtitles(
  cues: SubtitleCue[],
  options: GenerateQuizOptions = {},
): Promise<GenerateQuizResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { quiz: [], reason: 'GROQ_API_KEY chưa được cấu hình trên server.' };
  }

  const transcript = buildTranscript(cues);
  if (!transcript || transcript.length < 20) {
    return { quiz: [], reason: 'Phụ đề quá ngắn hoặc trống, không đủ nội dung để tạo câu hỏi.' };
  }

  const count = Math.min(Math.max(Math.round(options.count ?? 5), 1), 10);
  const level = options.level ?? 'Beginner';
  const title = options.title?.trim();

  const systemPrompt = `Bạn là giáo viên tiếng Anh cho trẻ em Việt Nam (5-10 tuổi). Dựa trên transcript tiếng Anh của một video, hãy tạo câu hỏi trắc nghiệm để kiểm tra hiểu biết và từ vựng. Yêu cầu:
- Tạo đúng ${count} câu hỏi, độ khó: ${level}.
- Mỗi câu có 3 hoặc 4 đáp án, chỉ 1 đáp án đúng.
- Câu hỏi (field "question") bằng tiếng Anh, đơn giản, hợp lứa tuổi.
- Kèm bản dịch tiếng Việt của câu hỏi ở field "questionVi".
- "explanation": giải thích ngắn gọn bằng tiếng Việt vì sao đáp án đúng.
- Chỉ hỏi nội dung có trong transcript.
Trả về DUY NHẤT một JSON đúng định dạng, không kèm văn bản khác:
{
  "questions": [
    {
      "question": "string (English)",
      "questionVi": "string (Tiếng Việt)",
      "options": ["A", "B", "C"],
      "correctIndex": 0,
      "explanation": "string (Tiếng Việt)"
    }
  ]
}`;

  const userPrompt = `${title ? `Tiêu đề video: ${title}\n\n` : ''}Transcript tiếng Anh:\n${transcript}`;

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
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq quiz generation error:', errorText);
      return { quiz: [], reason: 'Dịch vụ AI tạm thời lỗi, thử lại sau.' };
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    let parsed: unknown;
    try {
      parsed = extractJson(content);
    } catch {
      console.error('Failed to parse Groq quiz JSON:', content.slice(0, 500));
      return { quiz: [], reason: 'AI trả về dữ liệu không hợp lệ, thử lại.' };
    }

    const quiz = sanitizeQuiz(parsed);
    if (quiz.length === 0) {
      return { quiz: [], reason: 'AI không tạo được câu hỏi hợp lệ, thử lại hoặc thêm phụ đề.' };
    }

    return { quiz };
  } catch (error) {
    console.error('Quiz generation request failed:', error);
    return { quiz: [], reason: 'Không gọi được dịch vụ AI (mạng/timeout).' };
  }
}
