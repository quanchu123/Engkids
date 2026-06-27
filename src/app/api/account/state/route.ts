import { NextRequest, NextResponse } from 'next/server';
import { readAccountJson, writeAccountJson } from '@/lib/server/account-file-store';
import { getRequestAuthUserId } from '@/lib/server/request-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const BUCKET = 'progress-state';

interface StoredEnvelope {
  updatedAt?: string;
  payload?: unknown;
}

export async function GET(request: NextRequest) {
  const authUserId = await getRequestAuthUserId(request);
  if (!authUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stored = await readAccountJson<StoredEnvelope>(BUCKET, authUserId);
  return NextResponse.json(
    {
      payload: stored?.payload ?? null,
      updatedAt: stored?.updatedAt ?? null,
      source: 'digitalocean',
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}

export async function PUT(request: NextRequest) {
  const authUserId = await getRequestAuthUserId(request);
  if (!authUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = (body as { payload?: unknown } | null)?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'payload must be a non-null object' }, { status: 400 });
  }

  try {
    await writeAccountJson(BUCKET, authUserId, payload);
  } catch (error) {
    console.error('Failed to save account state file:', error);
    return NextResponse.json({ error: 'Failed to save account state' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, source: 'digitalocean' });
}
