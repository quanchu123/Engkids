import { NextRequest, NextResponse } from 'next/server';
import { listLessons } from '@/services/lessons';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const data = await listLessons(request);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Lessons list error:', error);
    return NextResponse.json({ error: 'Failed to load lessons' }, { status: 500 });
  }
}
