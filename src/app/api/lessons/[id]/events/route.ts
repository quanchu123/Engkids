import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest, getOrCreateProfileId } from '@/services/curriculum-content';
import { saveLessonEvent } from '@/services/learning-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const profileId = await getOrCreateProfileId(await getAuthUserIdFromRequest(request));
    if (!profileId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const event = await saveLessonEvent(profileId, {
      lessonId: id,
      stepId: typeof body.stepId === 'string' ? body.stepId : null,
      eventType: body.eventType,
      skillId: typeof body.skillId === 'string' ? body.skillId : null,
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
      scorePercent: typeof body.scorePercent === 'number' ? body.scorePercent : null,
    });
    if (!event) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ event }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Lesson event error:', error);
    return NextResponse.json({ error: 'Failed to save lesson event' }, { status: 500 });
  }
}
