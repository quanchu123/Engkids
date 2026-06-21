import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase admin env');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await checkAdminAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action === 'reject' ? 'reject' : 'approve';
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();

    const { data: source, error: sourceError } = await supabase
      .from('curriculum_import_sources')
      .update({ approved: action === 'approve', trust_status: action === 'approve' ? 'trusted' : 'blocked', imported_at: action === 'approve' ? now : null, updated_at: now })
      .eq('id', id)
      .select('id,title,approved,trust_status')
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const status = action === 'approve' ? 'approved' : 'rejected';
    const updates = await Promise.all([
      supabase.from('curriculum_import_staging').update({ review_status: status }).eq('source_id', id).in('review_status', ['pending', 'approved']),
      supabase.from('source_lexical_items').update({ review_status: status, imported_at: action === 'approve' ? now : null }).eq('source_id', id).eq('safety_status', 'safe').in('review_status', ['pending', 'approved']),
      supabase.from('source_sentence_items').update({ review_status: status, imported_at: action === 'approve' ? now : null }).eq('source_id', id).eq('safety_status', 'safe').in('review_status', ['pending', 'approved']),
      supabase.from('source_reading_passages').update({ review_status: status, imported_at: action === 'approve' ? now : null }).eq('source_id', id).eq('safety_status', 'safe').in('review_status', ['pending', 'approved']),
    ]);
    const failed = updates.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ source, action }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin source approval error:', error);
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}
