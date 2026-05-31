import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import {
  getMultipleChoiceForAdmin,
  getTrueFalseForAdmin,
  saveMultipleChoiceContent,
  saveTrueFalseContent,
} from '@/services/game-content';

export const dynamic = 'force-dynamic';

const SUPPORTED = ['multiple-choice', 'true-false'];

// GET /api/games/[type] - current content (override or built-in defaults)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!SUPPORTED.includes(type)) {
    return NextResponse.json({ error: 'Unsupported game type' }, { status: 404 });
  }

  try {
    const data =
      type === 'multiple-choice'
        ? await getMultipleChoiceForAdmin()
        : await getTrueFalseForAdmin();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Get game content error:', error);
    return NextResponse.json({ error: 'Failed to load game content' }, { status: 500 });
  }
}

// PUT /api/games/[type] - save content (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!SUPPORTED.includes(type)) {
    return NextResponse.json({ error: 'Unsupported game type' }, { status: 404 });
  }

  const isAuthed = await checkAdminAuth(request);
  if (!isAuthed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data =
      type === 'multiple-choice'
        ? await saveMultipleChoiceContent(body?.data)
        : await saveTrueFalseContent(body?.data);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save game content';
    const isValidation = /không hợp lệ/.test(message);
    console.error('Save game content error:', error);
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 });
  }
}
