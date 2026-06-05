import { NextRequest, NextResponse } from 'next/server';
import { getVideoById } from '@/services/video';
import { checkAdminAuth } from '@/lib/api-auth';
import { generateQuizFromSubtitles } from '@/services/ai-quiz';

// AI calls can take several seconds; allow a longer duration and Node runtime.
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// POST /api/videos/[id]/quiz/generate
// Admin-only. Generates (but does NOT save) quiz questions from the video's
// English subtitles using AI. The admin reviews/edits, then saves via PUT
// /api/videos/[id]/quiz. Per-IP rate limiting is handled by middleware.
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
        { error: 'Video chưa có phụ đề. Hãy thêm/lưu phụ đề (SRT) trước khi tạo quiz.' },
        { status: 400 },
      );
    }

    // Optional knobs from the request body.
    let count = 5;
    try {
      const body = await request.json();
      if (typeof body?.count === 'number') count = body.count;
    } catch {
      // no body provided — use defaults
    }

    const { quiz, reason } = await generateQuizFromSubtitles(subtitles, {
      count,
      level: video.level,
      title: video.title,
    });

    if (quiz.length === 0) {
      return NextResponse.json(
        { error: reason || 'Không tạo được câu hỏi. Thử lại.' },
        { status: 502 },
      );
    }

    // Return for review only — saving is a separate explicit step.
    return NextResponse.json({ quiz, count: quiz.length });
  } catch (error) {
    console.error('Quiz generation route error:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}
