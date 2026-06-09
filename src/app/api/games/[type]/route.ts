import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import {
  getMultipleChoiceForAdmin,
  getTrueFalseForAdmin,
  getWordBank,
  saveMultipleChoiceContent,
  saveTrueFalseContent,
  saveWordBank,
} from '@/services/game-content';
import { filterWordBank } from '@/lib/word-bank';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPPORTED = ['multiple-choice', 'true-false', 'word-bank'];

// GET /api/games/[type] - current content (override or built-in defaults)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!SUPPORTED.includes(type)) {
    return NextResponse.json({ error: 'Unsupported game type' }, { status: 404 });
  }

  try {
    let data;
    if (type === 'multiple-choice') data = await getMultipleChoiceForAdmin();
    else if (type === 'true-false') data = await getTrueFalseForAdmin();
    else {
      const stage = request.nextUrl.searchParams.get('stage') || undefined;
      const topic = request.nextUrl.searchParams.get('topic') || undefined;
      data = filterWordBank(await getWordBank(), { level: stage, topic });
    }
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
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
    let data;
    if (type === 'multiple-choice') data = await saveMultipleChoiceContent(body?.data);
    else if (type === 'true-false') data = await saveTrueFalseContent(body?.data);
    else data = await saveWordBank(body?.data);
    revalidatePath('/games');
    revalidatePath('/games/multiple-choice');
    revalidatePath('/games/true-false');
    revalidatePath('/games/word-burst');
    revalidatePath('/games/word-puzzle');
    revalidatePath('/games/memory-match');
    revalidatePath('/games/rpg-world');
    revalidatePath('/games/matching-pairs');
    revalidatePath('/games/word-collector');
    revalidatePath('/games/rpg-battle');
    revalidatePath('/games/fill-blanks');
    revalidatePath('/games/sentence-scramble');
    revalidatePath('/games/mario-word');
    revalidatePath('/games/candy-crush');
    return NextResponse.json(
      { data },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save game content';
    const isValidation = /không hợp lệ/.test(message);
    console.error('Save game content error:', error);
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 });
  }
}
