import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest, getOrCreateProfileId } from '@/services/curriculum-content';
import { getNextLearningAction } from '@/services/learning-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const profileId = await getOrCreateProfileId(await getAuthUserIdFromRequest(request));
    const data = await getNextLearningAction(profileId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Next learning action error:', error);
    return NextResponse.json({ error: 'Failed to load next action' }, { status: 500 });
  }
}
