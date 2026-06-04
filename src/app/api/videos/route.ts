import { NextRequest, NextResponse } from 'next/server';
import { createVideo, getAllVideos, getAllVideosAdmin } from '@/services/video';
import { checkAdminAuth } from '@/lib/api-auth';
import { apiCache } from '@/lib/cache';
import { createVideoSchema } from '@/lib/validations/video';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
};

// GET /api/videos - List videos
// Public: only ready videos | Admin with ?all=true: all statuses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';
    const category = searchParams.get('category') as 'video' | 'music' | null;

    // Admin request - get all videos including processing/error
    if (showAll) {
      const isAuthed = await checkAdminAuth(request);
      if (!isAuthed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const videos = await getAllVideosAdmin();
      return NextResponse.json({ videos });
    }

    // Public request - only ready videos. Read live so uploads appear immediately.
    const videos = await getAllVideos(category || undefined);
    return NextResponse.json(
      { videos },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

// POST /api/videos - Record metadata after the browser streams the file to
// /api/videos/upload, where it is saved on the droplet SSD.
export async function POST(request: NextRequest) {
  try {
    // Check admin auth using JWT or Supabase session
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate metadata with Zod.
    const validated = createVideoSchema.parse(body);

    const objectKey = String(body?.objectKey || '').trim();
    if (!objectKey) {
      return NextResponse.json(
        { error: 'objectKey is required (upload the file first)' },
        { status: 400 },
      );
    }

    const video = await createVideo({
      title: validated.title,
      titleVi: validated.titleVi,
      objectKey,
      description: validated.description,
      thumbnailUrl: validated.thumbnailUrl,
      level: validated.level,
      topics: validated.topics,
      ageGroup: validated.ageGroup,
      category: validated.category,
      feature: validated.feature,
      duration: typeof body?.duration === 'number' ? body.duration : 0,
    });

    // Invalidate videos list cache (all and category-specific)
    apiCache.invalidatePattern('videos:list');
    revalidatePath('/');
    revalidatePath('/videos');
    revalidatePath('/music');

    return NextResponse.json(
      { video },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues.map(e => e.message) },
        { status: 400 }
      );
    }
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: 'Failed to create video' },
      { status: 500 }
    );
  }
}
