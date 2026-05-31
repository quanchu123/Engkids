import { NextRequest, NextResponse } from 'next/server';
import { deleteBunnyVideo, getBunnyVideoStatus } from '@/services/bunny';
import { getVideoById, updateVideo, deleteVideo } from '@/services/video';
import { checkAdminAuth } from '@/lib/api-auth';
import { apiCache, CACHE_KEYS } from '@/lib/cache';

// GET /api/videos/[id] - Get single video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let video = await getVideoById(id);
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Self-heal stale DB status when a user opens the video directly.
    if (video.status !== 'ready') {
      try {
        const bunnyStatus = await getBunnyVideoStatus(video.bunnyVideoId);
        if (bunnyStatus.status !== video.status) {
          const updates: Parameters<typeof updateVideo>[1] = {
            status: bunnyStatus.status,
          };

          if (bunnyStatus.status === 'ready') {
            updates.duration = Math.floor(bunnyStatus.duration || 0);
            updates.thumbnailUrl = bunnyStatus.thumbnailUrl;
            updates.hlsUrl = bunnyStatus.hlsUrl;
            updates.dashUrl = bunnyStatus.dashUrl;
          }

          await updateVideo(id, updates);
          video = await getVideoById(id);
        }
      } catch (statusError) {
        console.warn(`Failed to refresh video status for ${id}:`, statusError);
      }
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
    const allowedFields = ['title', 'titleVi', 'description', 'level', 'topics', 'ageGroup', 'status'];
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
    const video = await getVideoById(id);
    
    // Invalidate caches
    apiCache.invalidate(CACHE_KEYS.VIDEOS_LIST);
    apiCache.invalidate(CACHE_KEYS.VIDEO_BY_ID(id));
    
    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error updating video:', error);
    return NextResponse.json(
      { error: 'Failed to update video' },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - Delete video
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
    const video = await getVideoById(id);
    
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const isLocal = video.sourceType === 'local' || video.bunnyVideoId?.startsWith('local-');
    const isStorage = video.bunnyVideoId?.startsWith('storage-');

    if (isStorage) {
      // Remove the object from Supabase Storage (hls_url holds the storage path)
      const storagePath = video.hlsUrl;
      if (storagePath && !storagePath.startsWith('http') && !storagePath.startsWith('/')) {
        try {
          const { deleteVideoFromStorage } = await import('@/services/storage');
          await deleteVideoFromStorage(storagePath);
        } catch (storageError) {
          console.warn('Failed to delete storage object (may already be gone):', storageError);
        }
      }
    } else if (isLocal) {
      // Remove the locally-stored file from public/uploads
      const localPath = video.externalUrl || video.hlsUrl;
      if (localPath && localPath.startsWith('/uploads/')) {
        try {
          const { unlink } = await import('fs/promises');
          const path = await import('path');
          await unlink(path.join(process.cwd(), 'public', localPath));
        } catch (fileError) {
          console.warn('Failed to delete local video file (may already be gone):', fileError);
        }
      }
    } else {
      // Delete from Bunny.net Stream first
      try {
        await deleteBunnyVideo(video.bunnyVideoId);
      } catch (bunnyError) {
        console.warn('Failed to delete from Bunny.net (may already be deleted):', bunnyError);
      }
    }
    
    // Delete from Supabase
    await deleteVideo(id);
    
    // Invalidate caches
    apiCache.invalidate(CACHE_KEYS.VIDEOS_LIST);
    apiCache.invalidate(CACHE_KEYS.VIDEO_BY_ID(id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
