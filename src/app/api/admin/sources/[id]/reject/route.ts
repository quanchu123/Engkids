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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdminAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const stamp = new Date().toISOString();
    const { data: source, error: sourceError } = await supabase
      .from('curriculum_import_sources')
      .update({ approved: false, trust_status: 'blocked', imported_at: null, updated_at: stamp })
      .eq('id', id)
      .select('id,title,approved,trust_status')
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const updates = await Promise.all([
      supabase.from('curriculum_import_staging').update({ review_status: 'rejected' }).eq('source_id', id).in('review_status', ['pending', 'approved']),
      supabase.from('source_lexical_items').update({ review_status: 'rejected' }).eq('source_id', id).in('review_status', ['pending', 'approved']),
      supabase.from('source_sentence_items').update({ review_status: 'rejected' }).eq('source_id', id).in('review_status', ['pending', 'approved']),
      supabase.from('source_reading_passages').update({ review_status: 'rejected' }).eq('source_id', id).in('review_status', ['pending', 'approved']),
    ]);
    const failed = updates.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ source, action: 'reject' }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin source reject error:', error);
    return NextResponse.json({ error: 'Failed to reject source' }, { status: 500 });
  }
}
