import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { translateLinesToVietnamese } from '@/services/ai-translate';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/videos/[id]/subtitles/translate
// Admin-only. Translates an array of English subtitle lines to Vietnamese using
// AI and returns the translations aligned by index. Does NOT persist anything —
// the admin reviews/edits in the SubtitleEditor and then saves via PUT.
// Per-IP rate limiting is handled by middleware.
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const lines = body?.lines;
    if (!Array.isArray(lines)) {
      return NextResponse.json({ error: 'lines must be an array of strings' }, { status: 400 });
    }

    const stringLines = lines.map((l) => (typeof l === 'string' ? l : String(l ?? '')));
    const { translations, reason } = await translateLinesToVietnamese(stringLines);

    if (translations.every((t) => !t)) {
      return NextResponse.json({ error: reason || 'Không dịch được.' }, { status: 502 });
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error('Subtitle translate route error:', error);
    return NextResponse.json({ error: 'Failed to translate subtitles' }, { status: 500 });
  }
}
