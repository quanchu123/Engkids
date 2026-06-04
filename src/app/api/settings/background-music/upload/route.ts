import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { saveAudioStream, normalizeAudioExtension } from '@/services/storage';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/settings/background-music/upload?ext=mp3
// Streams an audio file to disk and returns its object key (admin only).
export async function POST(request: NextRequest) {
  const isAuthed = await checkAdminAuth(request);
  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ext = normalizeAudioExtension(searchParams.get('ext') || 'mp3');
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported audio type. Allowed: mp3, ogg, wav, m4a, aac' },
      { status: 400 },
    );
  }

  if (!request.body) {
    return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
  }

  try {
    const objectKey = await saveAudioStream(request.body, ext);
    return NextResponse.json(
      { objectKey },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    const tooLarge = /too large/i.test(message);
    console.error('Audio upload error:', error);
    return NextResponse.json({ error: message }, { status: tooLarge ? 413 : 500 });
  }
}
