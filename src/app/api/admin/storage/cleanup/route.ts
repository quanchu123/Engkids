import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { cleanupStorage } from '@/services/storage-maintenance';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const result = await cleanupStorage({
      dryRun: body?.dryRun !== false,
      minAgeHours: Number.isFinite(Number(body?.minAgeHours)) ? Number(body.minAgeHours) : 1,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Storage cleanup error:', error);
    return NextResponse.json({ error: 'Failed to cleanup storage' }, { status: 500 });
  }
}
