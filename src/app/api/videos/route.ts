import { NextRequest, NextResponse } from 'next/server';
import { createVideo, getAllVideos, getAllVideosAdmin } from '@/services/video';
import { checkAdminAuth } from '@/lib/api-auth';
import { apiCache, CACHE_KEYS } from '@/lib/cache';
import { createVideoSchema } from '@/lib/validations/video';
import { z } from 'zod';

// Cache TTL: 30 seconds - short enough for updates, long enough for performance
const VIDEOS_CACHE_TTL = 30 * 1000;

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

    // Public request - only ready videos, use cache
    const cacheKey = category
      ? CACHE_KEYS.VIDEOS_BY_CATEGORY(category)
      : CACHE_KEYS.VIDEOS_LIST;
    const cached = apiCache.get<unknown[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ videos: cached });
    }

    const videos = await getAllVideos(category || undefined);
    apiCache.set(cacheKey, videos, VIDEOS_CACHE_TTL);
    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

// POST /api/videos - Record a video after a direct browser-to-Spaces upload.
// The browser first gets a presigned URL from /api/videos/upload/sign, uploads
// the file to Spaces, then calls this endpoint with the returned object key.
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
      level: validated.level,
      topics: validated.topics,
      ageGroup: validated.ageGroup,
      category: validated.category,
      duration: typeof body?.duration === 'number' ? body.duration : 0,
    });

    // Invalidate videos list cache (all and category-specific)
    apiCache.invalidatePattern('videos:list');

    return NextResponse.json({ video });
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
