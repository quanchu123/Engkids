import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { createPresignedUpload, isSpacesConfigured } from '@/services/spaces';

export const dynamic = 'force-dynamic';

// POST /api/videos/upload/sign
// Returns a presigned PUT URL so the browser can upload a video file directly
// to DigitalOcean Spaces (up to ~2 GB).
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSpacesConfigured()) {
      return NextResponse.json(
        { error: 'DigitalOcean Spaces is not configured on the server.' },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const extension = String(body?.extension || 'mp4');

    const result = await createPresignedUpload(extension);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create upload URL';
    // Validation errors (bad extension) should be a 400.
    const isValidation = /Unsupported file type/i.test(message);
    console.error('Sign upload URL error:', error);
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 });
  }
}
