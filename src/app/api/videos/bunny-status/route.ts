import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';

const BUNNY_API_KEY = process.env.BUNNY_API_KEY!;
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID!;

export const dynamic = 'force-dynamic';

/**
 * GET /api/videos/bunny-status?videoId=xxx
 * 
 * Check video status directly from Bunny.net API
 * Returns Bunny's native status (0-10)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    
    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }
    
    // Fetch video details from Bunny.net
    const response = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          exists: false,
          status: -1,
          message: 'Video not found on Bunny.net',
        });
      }
      throw new Error(`Bunny API error: ${response.status}`);
    }
    
    const video = await response.json();
    
    // Bunny video status:
    // 0 = Queued, 1 = Processing, 2 = Encoding, 3 = Finished
    // 4 = Resolution finished, 5 = Failed
    
    return NextResponse.json({
      exists: true,
      videoId: video.guid,
      status: video.status,
      title: video.title,
      length: video.length,
      width: video.width,
      height: video.height,
      thumbnailUrl: video.thumbnailFileName 
        ? `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net/${video.guid}/${video.thumbnailFileName}`
        : null,
      isReady: video.status >= 3 && video.status !== 5,
      isFailed: video.status === 5,
      encodeProgress: video.encodeProgress,
      availableResolutions: video.availableResolutions,
    });
    
  } catch (error) {
    console.error('[BUNNY-STATUS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
