import { NextRequest, NextResponse } from 'next/server';
import { generateChatReply, type ChatMessage } from '@/services/chat-ai';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_CHARS = 1500;

// Per-stage expectation so feedback matches the child's CEFR level.
const LEVEL_GUIDE: Record<string, string> = {
  'a2-key': 'CEFR A1-A2: expect short simple sentences with common words and present/past simple. Be very gentle.',
  'b1-preliminary': 'CEFR B1: expect a short paragraph with everyday vocabulary, reasons, and basic connectors.',
  'b2-first': 'CEFR B2: expect a structured paragraph with richer vocabulary, some complex sentences, and clear opinions.',
  'c1-advanced': 'CEFR C1: expect a well-organised response with varied structures, precise vocabulary, and coherent argument.',
};

function buildSystemPrompt(level: string, prompt: string): string {
  const guide = LEVEL_GUIDE[level] || LEVEL_GUIDE['a2-key'];
  return [
    'You are a kind, encouraging English writing teacher for a Vietnamese child.',
    `The writing task was: "${prompt}".`,
    guide,
    'Grade the child\'s writing and return ONLY a JSON object, no other text, in this exact shape:',
    '{',
    '"score": <integer 0-100>,',
    '"praise": "<one short encouraging sentence in Vietnamese about what they did well>",',
    '"corrections": [ { "original": "<the child\'s phrase with a mistake>", "fixed": "<the corrected version>", "why": "<short reason in Vietnamese>" } ],',
    '"improved": "<a corrected, level-appropriate version of their whole text in English>",',
    '"tip": "<one short actionable tip in Vietnamese for next time>"',
    '}',
    'Include at most 4 corrections (the most important). If the writing is already good, return an empty corrections array and a high score.',
    'Never invent content the child did not write. Never use emojis.',
  ].join(' ');
}

function sanitize(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ').trim();
}

function extractJson(content: string): unknown {
  let s = content.trim();
  if (s.includes('```')) {
    const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) s = m[1].trim();
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = sanitize(body?.text).slice(0, MAX_CHARS);
    const prompt = sanitize(body?.prompt).slice(0, 300) || 'Write a few sentences in English.';
    const level = typeof body?.level === 'string' ? body.level : 'a2-key';

    if (text.length < 3) {
      return NextResponse.json({ error: 'Bé viết một câu tiếng Anh trước nhé!' }, { status: 400 });
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(level, prompt) },
      { role: 'user', content: text },
    ];

    const result = await generateChatReply(messages);
    if (result.error || !result.reply) {
      return NextResponse.json({ error: result.error || 'Trợ lý AI đang bận, bé thử lại sau nhé!' }, { status: 503 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = extractJson(result.reply) as Record<string, unknown>;
    } catch {
      // Fallback: return the raw reply as a single tip so the child still sees feedback.
      return NextResponse.json(
        { score: null, praise: '', corrections: [], improved: '', tip: result.reply, raw: true, provider: result.provider },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } },
      );
    }

    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null;
    const corrections = Array.isArray(parsed.corrections)
      ? parsed.corrections.slice(0, 4).map((c) => ({
          original: sanitize((c as Record<string, unknown>)?.original),
          fixed: sanitize((c as Record<string, unknown>)?.fixed),
          why: sanitize((c as Record<string, unknown>)?.why),
        })).filter((c) => c.original || c.fixed)
      : [];

    return NextResponse.json(
      {
        score,
        praise: sanitize(parsed.praise),
        corrections,
        improved: sanitize(parsed.improved),
        tip: sanitize(parsed.tip),
        provider: result.provider,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Writing feedback error:', error);
    return NextResponse.json({ error: 'Trợ lý AI gặp sự cố, bé thử lại sau nhé!' }, { status: 500 });
  }
}
