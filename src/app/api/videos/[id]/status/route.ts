import { NextRequest, NextResponse } from 'next/server';
import { getVideoById } from '@/services/video';

// GET /api/videos/[id]/status - Report stored video status.
// Spaces uploads are immediately playable, so this simply returns the DB status.
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

    return NextResponse.json({
      videoId: id,
      status: video.status,
    });
  } catch (error) {
    console.error('Error fetching video status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video status' },
      { status: 500 }
    );
  }
}
