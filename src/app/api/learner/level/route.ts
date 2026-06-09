import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserIdFromRequest, getOrCreateProfileId, getLearnerCurriculumState, setLearnerLevel } from '@/services/curriculum-content';
import { CURRICULUM_STAGES, normalizeStageId } from '@/lib/curriculum';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function requireProfileId(request: NextRequest): Promise<string | null> {
  const authUserId = await getAuthUserIdFromRequest(request);
  if (!authUserId) return null;
  return getOrCreateProfileId(authUserId);
}

export async function GET(request: NextRequest) {
  try {
    const profileId = await requireProfileId(request);
    if (!profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const learnerState = await getLearnerCurriculumState(profileId);
    return NextResponse.json({
      stages: CURRICULUM_STAGES,
      learnerState,
      needsSelection: learnerState?.needsLevelSelection ?? true,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Learner level GET error:', error);
    return NextResponse.json({ error: 'Failed to load learner level' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profileId = await requireProfileId(request);
    if (!profileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const stageId = normalizeStageId(body?.stageId);
    if (!stageId) {
      return NextResponse.json({ error: 'Invalid stageId' }, { status: 400 });
    }

    const source = body?.source === 'parent' || body?.source === 'placement' ? body.source : 'manual';
    const learnerState = await setLearnerLevel(profileId, stageId, source);
    return NextResponse.json({
      stages: CURRICULUM_STAGES,
      learnerState,
      needsSelection: false,
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Learner level PUT error:', error);
    return NextResponse.json({ error: 'Failed to save learner level' }, { status: 500 });
  }
}
