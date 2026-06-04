import { NextRequest, NextResponse } from 'next/server';
import { getVideoById, updateVideo } from '@/services/video';
import { VideoQuizQuestion } from '@/types';
import { checkAdminAuth } from '@/lib/api-auth';
import { apiCache, CACHE_KEYS } from '@/lib/cache';

// GET /api/videos/[id]/quiz - Get quiz questions for a video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await getVideoById(id);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ quiz: video.quiz ?? [] });
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}

// PUT /api/videos/[id]/quiz - Replace all quiz questions for a video (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const body = await request.json();
    const { quiz } = body as { quiz: unknown };

    if (!Array.isArray(quiz)) {
      return NextResponse.json({ error: 'Quiz must be an array' }, { status: 400 });
    }

    // Validate and sanitize each question
    const sanitized: VideoQuizQuestion[] = [];
    for (let i = 0; i < quiz.length; i++) {
      const item = quiz[i] as Record<string, unknown>;

      const question = typeof item?.question === 'string' ? item.question.trim() : '';
      const options = Array.isArray(item?.options)
        ? item.options.filter((o): o is string => typeof o === 'string').map((o) => o.trim())
        : [];

      if (!question) {
        return NextResponse.json(
          { error: `Question ${i + 1}: text is required` },
          { status: 400 }
        );
      }
      if (options.length < 2 || options.length > 4) {
        return NextResponse.json(
          { error: `Question ${i + 1}: must have between 2 and 4 options` },
          { status: 400 }
        );
      }
      if (options.some((o) => !o)) {
        return NextResponse.json(
          { error: `Question ${i + 1}: options cannot be empty` },
          { status: 400 }
        );
      }

      const correctIndexRaw = typeof item?.correctIndex === 'number' ? item.correctIndex : 0;
      if (correctIndexRaw < 0 || correctIndexRaw >= options.length) {
        return NextResponse.json(
          { error: `Question ${i + 1}: correctIndex is out of range` },
          { status: 400 }
        );
      }

      sanitized.push({
        id: typeof item?.id === 'string' ? item.id : `quiz-${Date.now()}-${i}`,
        question,
        questionVi: typeof item?.questionVi === 'string' ? item.questionVi.trim() : undefined,
        options,
        correctIndex: correctIndexRaw,
        explanation: typeof item?.explanation === 'string' ? item.explanation.trim() : undefined,
        timeCode: typeof item?.timeCode === 'number' ? item.timeCode : undefined,
      });
    }

    await updateVideo(id, { quiz: sanitized });

    // Invalidate caches so the public player picks up changes
    apiCache.invalidate(CACHE_KEYS.VIDEOS_LIST);
    apiCache.invalidate(CACHE_KEYS.VIDEO_BY_ID(id));

    return NextResponse.json({ success: true, count: sanitized.length });
  } catch (error) {
    console.error('Error saving quiz:', error);
    return NextResponse.json({ error: 'Failed to save quiz' }, { status: 500 });
  }
}
