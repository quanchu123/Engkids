import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest, getOrCreateProfileId } from '@/services/curriculum-content';
import { getParentProgressSummary } from '@/services/learning-intelligence';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const profileId = await getOrCreateProfileId(await getAuthUserIdFromRequest(request));
    const progress = await getParentProgressSummary(profileId);
    return NextResponse.json({ progress }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Parent progress error:', error);
    return NextResponse.json({ error: 'Failed to load parent progress' }, { status: 500 });
  }
}
