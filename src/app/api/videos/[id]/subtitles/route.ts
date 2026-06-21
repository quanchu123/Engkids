import { NextRequest, NextResponse } from 'next/server';
import { getVideoById, saveVideoSubtitles } from '@/services/video';
import { SubtitleCue } from '@/types';
import { checkAdminAuth } from '@/lib/api-auth';

// GET /api/videos/[id]/subtitles - Get subtitles for a video
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
    
    return NextResponse.json({ subtitles: video.subtitles });
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtitles' },
      { status: 500 }
    );
  }
}

// PUT /api/videos/[id]/subtitles - Update all subtitles for a video
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
    const { subtitles } = body as { subtitles: SubtitleCue[] };
    
    if (!Array.isArray(subtitles)) {
      return NextResponse.json(
        { error: 'Subtitles must be an array' },
        { status: 400 }
      );
    }
    
    // Validate subtitle format
    for (const cue of subtitles) {
      if (typeof cue.startTime !== 'number' || typeof cue.endTime !== 'number') {
        return NextResponse.json(
          { error: 'Each subtitle must have startTime and endTime (numbers in seconds)' },
          { status: 400 }
        );
      }
      if (!cue.textEn) {
        return NextResponse.json(
          { error: 'Each subtitle must have textEn' },
          { status: 400 }
        );
      }
    }
    
    await saveVideoSubtitles(id, subtitles);
    
    return NextResponse.json({ success: true, count: subtitles.length });
  } catch (error) {
    console.error('Error saving subtitles:', error);
    return NextResponse.json(
      { error: 'Failed to save subtitles' },
      { status: 500 }
    );
  }
}
