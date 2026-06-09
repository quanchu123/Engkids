import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/api-auth';
import { auditStorage } from '@/services/storage-maintenance';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const minAgeHours = Number(request.nextUrl.searchParams.get('minAgeHours') || '1');
    const report = await auditStorage(Number.isFinite(minAgeHours) ? minAgeHours : 1);
    return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Storage audit error:', error);
    return NextResponse.json({ error: 'Failed to audit storage' }, { status: 500 });
  }
}
