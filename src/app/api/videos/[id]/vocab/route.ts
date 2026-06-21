import { NextRequest, NextResponse } from 'next/server';
import { getVideoById } from '@/services/video';
import { checkAdminAuth } from '@/lib/api-auth';
import { extractVocabFromSubtitles } from '@/services/ai-vocab';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/videos/[id]/vocab
// Admin-only. Extracts learn-worthy vocabulary (WordPair[]) from the video's
// English subtitles using AI. Does NOT persist — the admin reviews and chooses
// to add the words to the shared word-bank. Per-IP rate limiting via middleware.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const video = await getVideoById(id);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const subtitles = Array.isArray(video.subtitles) ? video.subtitles : [];
    if (subtitles.length === 0) {
      return NextResponse.json(
        { error: 'Video chưa có phụ đề. Hãy thêm/lưu phụ đề trước khi trích từ vựng.' },
        { status: 400 },
      );
    }

    let count = 15;
    try {
      const body = await request.json();
      if (typeof body?.count === 'number') count = body.count;
    } catch {
      // use default
    }

    const { words, reason } = await extractVocabFromSubtitles(subtitles, {
      count,
      level: video.level,
    });

    if (words.length === 0) {
      return NextResponse.json({ error: reason || 'Không trích được từ vựng.' }, { status: 502 });
    }

    return NextResponse.json({ words, count: words.length });
  } catch (error) {
    console.error('Vocab extraction route error:', error);
    return NextResponse.json({ error: 'Failed to extract vocabulary' }, { status: 500 });
  }
}
