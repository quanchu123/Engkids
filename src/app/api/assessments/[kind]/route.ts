import { NextRequest, NextResponse } from 'next/server';
import { normalizeStageId } from '@/lib/curriculum';
import {
  getAssessment,
  getProfileIdFromRequest,
  saveAssessmentAttempt,
  type AssessmentKind,
  type AssessmentResponseInput,
} from '@/services/curriculum-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SUPPORTED: AssessmentKind[] = ['placement', 'daily-check', 'weekly-checkpoint', 'stage-exit'];

function parseKind(value: string): AssessmentKind | null {
  return SUPPORTED.includes(value as AssessmentKind) ? value as AssessmentKind : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind: rawKind } = await params;
  const kind = parseKind(rawKind);
  if (!kind) return NextResponse.json({ error: 'Unsupported assessment kind' }, { status: 404 });

  const stage = normalizeStageId(request.nextUrl.searchParams.get('stage') || undefined);
  const variantId = request.nextUrl.searchParams.get('variant') || crypto.randomUUID();

  try {
    const assessment = await getAssessment(kind, stage, variantId);
    return NextResponse.json(assessment, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Assessment load error:', error);
    return NextResponse.json({ error: 'Failed to load assessment' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind: rawKind } = await params;
  const kind = parseKind(rawKind);
  if (!kind) return NextResponse.json({ error: 'Unsupported assessment kind' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as {
    blueprintId?: unknown;
    stageId?: unknown;
    variantId?: unknown;
    responses?: unknown;
  };

  const stageId = normalizeStageId(payload.stageId);
  const responses = Array.isArray(payload.responses)
    ? payload.responses
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item): AssessmentResponseInput => ({
          itemId: typeof item.itemId === 'string' ? item.itemId : '',
          answer: typeof item.answer === 'string' ? item.answer : '',
          responseMs: typeof item.responseMs === 'number' ? item.responseMs : undefined,
        }))
        .filter((item) => item.itemId && item.answer)
    : [];

  if (responses.length === 0) {
    return NextResponse.json({ error: 'responses must contain at least one answer' }, { status: 400 });
  }

  try {
    const profileId = await getProfileIdFromRequest(request);
    const result = await saveAssessmentAttempt(profileId, {
      blueprintId: typeof payload.blueprintId === 'string' ? payload.blueprintId : undefined,
      kind,
      stageId,
      variantId: typeof payload.variantId === 'string' ? payload.variantId : undefined,
      responses,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Assessment save error:', error);
    return NextResponse.json({ error: 'Failed to save assessment' }, { status: 500 });
  }
}
