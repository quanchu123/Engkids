import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { generateVideoThumbnailObject, normalizeExtension, saveVideoStream } from '@/services/storage';

// Large uploads stream straight to disk; allow a long duration and Node runtime.
export const runtime = 'nodejs';
export const maxDuration = 900; // 15 minutes
export const dynamic = 'force-dynamic';

// POST /api/videos/upload?ext=mp4
// Streams an uploaded video file to the droplet disk and returns its object key.
// The browser sends the raw file as the request body (not multipart) so we can
// stream it without buffering the whole file in memory.
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ext = normalizeExtension(searchParams.get('ext') || 'mp4');
    if (!ext) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: mp4, webm, mov, ogg' },
        { status: 400 },
      );
    }

    if (!request.body) {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
    }

    const objectKey = await saveVideoStream(request.body, ext);
    const thumbnail = await generateVideoThumbnailObject(objectKey);

    return NextResponse.json({
      objectKey,
      thumbnailUrl: thumbnail?.url,
      thumbnailObjectKey: thumbnail?.objectKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const tooLarge = /too large/i.test(message);
    console.error('Video upload error:', error);
    return NextResponse.json({ error: message }, { status: tooLarge ? 413 : 500 });
  }
}
