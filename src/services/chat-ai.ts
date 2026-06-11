// ============================================================
// AI CHAT PROVIDER (server-only)
// ============================================================
// Powers the kid-friendly English conversation room. Tries Groq first
// (llama-3.3-70b, fast + free), then rotates across the 8 Gemini keys as
// fallback when Groq errors or is rate-limited. Never throws to the route:
// returns { reply } on success or { error } with a safe Vietnamese message.

type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const ALIBABA_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
const ALIBABA_MODEL = 'qwen-turbo';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// Round-robin cursor for Gemini keys, persisted across requests in this worker.
let geminiCursor = 0;

function geminiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i += 1) {
    const k = (process.env[`gemini_key${i}`] || '').trim();
    if (k) keys.push(k);
  }
  return keys;
}

async function callGroq(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 600,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    return typeof reply === 'string' && reply.trim() ? reply.trim() : null;
  } catch {
    return null;
  }
}

// Gemini uses a different shape: a single systemInstruction + contents[] with
// roles 'user'/'model'. Convert our OpenAI-style messages accordingly.
async function callGeminiOnce(key: string, messages: ChatMessage[]): Promise<string | null> {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 600 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim();
    return reply ? reply : null;
  } catch {
    return null;
  }
}

// Try each Gemini key once, starting from the round-robin cursor, until one works.
async function callGemini(messages: ChatMessage[]): Promise<string | null> {
  const keys = geminiKeys();
  if (keys.length === 0) return null;
  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const key = keys[(geminiCursor + attempt) % keys.length];
    const reply = await callGeminiOnce(key, messages);
    if (reply) {
      geminiCursor = (geminiCursor + attempt + 1) % keys.length; // advance past the working key
      return reply;
    }
  }
  return null;
}

// Generic OpenAI-compatible chat endpoint (Alibaba DashScope + DeepSeek both
// speak this dialect). Returns trimmed reply or null on any error.
async function callOpenAICompatible(url: string, apiKey: string | undefined, model: string, messages: ChatMessage[]): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 600 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    return typeof reply === 'string' && reply.trim() ? reply.trim() : null;
  } catch {
    return null;
  }
}

export interface ChatResult {
  reply?: string;
  provider?: 'groq' | 'alibaba' | 'gemini' | 'deepseek';
  error?: string;
}

// Fallback chain: Groq (fast/free) -> Alibaba qwen -> Gemini rotation ->
// DeepSeek (wired but may be out of balance). First non-null wins.
export async function generateChatReply(messages: ChatMessage[]): Promise<ChatResult> {
  const groq = await callGroq(messages);
  if (groq) return { reply: groq, provider: 'groq' };

  const alibaba = await callOpenAICompatible(ALIBABA_API_URL, (process.env.alibabacloud || '').trim(), ALIBABA_MODEL, messages);
  if (alibaba) return { reply: alibaba, provider: 'alibaba' };

  const gemini = await callGemini(messages);
  if (gemini) return { reply: gemini, provider: 'gemini' };

  const deepseek = await callOpenAICompatible(DEEPSEEK_API_URL, (process.env.deepseek_key || '').trim(), DEEPSEEK_MODEL, messages);
  if (deepseek) return { reply: deepseek, provider: 'deepseek' };

  return { error: 'Trợ lý AI đang bận, bé thử lại sau một chút nhé!' };
}
