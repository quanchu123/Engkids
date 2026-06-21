import { NextRequest, NextResponse } from 'next/server';
import { getCurriculumCatalog, getProfileIdFromRequest } from '@/services/curriculum-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const profileId = await getProfileIdFromRequest(request);
    const catalog = await getCurriculumCatalog(profileId);
    return NextResponse.json(catalog, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Curriculum catalog error:', error);
    return NextResponse.json({ error: 'Failed to load curriculum' }, { status: 500 });
  }
}