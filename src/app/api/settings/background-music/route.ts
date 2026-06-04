import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { getBackgroundMusic, saveBackgroundMusic } from '@/services/site-settings';

export const dynamic = 'force-dynamic';

// GET /api/settings/background-music - current music setting (public)
export async function GET() {
  try {
    const music = await getBackgroundMusic();
    return NextResponse.json({ music });
  } catch (error) {
    console.error('Get background music error:', error);
    return NextResponse.json({ error: 'Failed to load setting' }, { status: 500 });
  }
}

// PUT /api/settings/background-music - update setting (admin only)
export async function PUT(request: NextRequest) {
  const isAuthed = await checkAdminAuth(request);
  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const music = await saveBackgroundMusic({
      enabled: typeof body?.enabled === 'boolean' ? body.enabled : undefined,
      objectKey: body?.objectKey !== undefined ? body.objectKey : undefined,
      volume: typeof body?.volume === 'number' ? body.volume : undefined,
    });
    return NextResponse.json({ music });
  } catch (error) {
    console.error('Save background music error:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
