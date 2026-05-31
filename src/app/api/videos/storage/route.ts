import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { createStorageVideo } from '@/services/video';
import { apiCache } from '@/lib/cache';

// POST /api/videos/storage
// Finalize a Supabase Storage upload: record video metadata after the browser
// has uploaded the file directly to Storage.
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const storagePath = String(body?.storagePath || '').trim();
    const title = String(body?.title || '').trim();
    const titleVi = String(body?.titleVi || '').trim();
    const description = String(body?.description || '').trim();
    const level = (['Beginner', 'Elementary', 'Intermediate'].includes(body?.level)
      ? body.level
      : 'Beginner') as 'Beginner' | 'Elementary' | 'Intermediate';
    const category = (body?.category === 'music' ? 'music' : 'video') as 'video' | 'music';

    if (!storagePath) {
      return NextResponse.json({ error: 'storagePath is required' }, { status: 400 });
    }
    if (!title || !titleVi) {
      return NextResponse.json(
        { error: 'Title (English) and Title (Vietnamese) are required' },
        { status: 400 }
      );
    }

    const video = await createStorageVideo({
      title,
      titleVi,
      description,
      level,
      category,
      storagePath,
    });

    apiCache.invalidatePattern('videos:list');

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Finalize storage video error:', error);
    return NextResponse.json({ error: 'Failed to save video' }, { status: 500 });
  }
}
