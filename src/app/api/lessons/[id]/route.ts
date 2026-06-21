import { NextRequest, NextResponse } from 'next/server';
import { getLessonDetail, saveLessonProgress } from '@/services/lessons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const lesson = await getLessonDetail(request, id);
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    return NextResponse.json({ lesson }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Lesson detail error:', error);
    return NextResponse.json({ error: 'Failed to load lesson' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const progress = await saveLessonProgress(request, id, body as Record<string, unknown>);
    if (!progress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ progress }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Lesson progress error:', error);
    return NextResponse.json({ error: 'Failed to save lesson progress' }, { status: 500 });
  }
}
