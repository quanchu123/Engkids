import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { createVideoUploadUrl } from '@/services/storage';

const ALLOWED_EXT = ['mp4', 'webm', 'mov', 'ogg'];

// POST /api/videos/storage/sign
// Returns a signed URL so the browser can upload a video directly to Supabase Storage.
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ext = String(body?.extension || 'mp4').replace(/[^a-z0-9]/gi, '').toLowerCase();

    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_EXT.join(', ')}` },
        { status: 400 }
      );
    }

    const { path, token, bucket } = await createVideoUploadUrl(ext);
    return NextResponse.json({ path, token, bucket });
  } catch (error) {
    console.error('Sign upload URL error:', error);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}
