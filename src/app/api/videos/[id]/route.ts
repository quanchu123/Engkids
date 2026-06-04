import { NextRequest, NextResponse } from 'next/server';
import { getVideoById, updateVideo, deleteVideo } from '@/services/video';
import { deleteVideoObject } from '@/services/storage';
import { checkAdminAuth } from '@/lib/api-auth';
import { apiCache, CACHE_KEYS } from '@/lib/cache';
import { revalidatePath } from 'next/cache';

// GET /api/videos/[id] - Get single video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const includeUnavailable = request.nextUrl.searchParams.get('admin') === 'true';
    if (includeUnavailable) {
      const isAuthed = await checkAdminAuth(request);
      if (!isAuthed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const video = await getVideoById(id, includeUnavailable);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

// PATCH /api/videos/[id] - Update video metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Whitelist allowed fields to prevent mass assignment
    const allowedFields = ['title', 'titleVi', 'description', 'thumbnailUrl', 'level', 'topics', 'ageGroup', 'status', 'category', 'feature'];
    const sanitizedBody: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        sanitizedBody[key] = body[key];
      }
    }

    if (Object.keys(sanitizedBody).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await updateVideo(id, sanitizedBody);
    const video = await getVideoById(id, true);

    // Invalidate caches
    apiCache.invalidatePattern(CACHE_KEYS.VIDEOS_LIST);
    apiCache.invalidate(CACHE_KEYS.VIDEO_BY_ID(id));
    revalidatePath('/');
    revalidatePath('/videos');
    revalidatePath('/music');
    revalidatePath(`/videos/${id}`);

    return NextResponse.json(
      { video },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - Delete video (DB row + Spaces object)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const video = await getVideoById(id, true);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Remove the object from DigitalOcean Spaces.
    if (video.objectKey) {
      try {
        await deleteVideoObject(video.objectKey);
      } catch (storageError) {
        console.warn('Failed to delete Spaces object (may already be gone):', storageError);
      }
    }

    // Delete from Supabase
    await deleteVideo(id);

    // Invalidate caches
    apiCache.invalidatePattern(CACHE_KEYS.VIDEOS_LIST);
    apiCache.invalidate(CACHE_KEYS.VIDEO_BY_ID(id));
    revalidatePath('/');
    revalidatePath('/videos');
    revalidatePath('/music');
    revalidatePath(`/videos/${id}`);

    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
