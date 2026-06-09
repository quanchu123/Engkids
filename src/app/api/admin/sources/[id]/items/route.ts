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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdminAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const [sourceResult, lexicalResult, sentenceResult, readingResult] = await Promise.all([
      supabase.from('curriculum_import_sources').select('id,title,publisher,source_url,license_name,license_url,attribution,allowed_use,source_kind,import_mode,approved,trust_status,source_hash,imported_at,updated_at').eq('id', id).maybeSingle(),
      supabase.from('source_lexical_items').select('*').eq('source_id', id).order('created_at', { ascending: false }),
      supabase.from('source_sentence_items').select('*').eq('source_id', id).order('created_at', { ascending: false }),
      supabase.from('source_reading_passages').select('*').eq('source_id', id).order('created_at', { ascending: false }),
    ]);

    if (sourceResult.error) throw sourceResult.error;
    if (lexicalResult.error) throw lexicalResult.error;
    if (sentenceResult.error) throw sentenceResult.error;
    if (readingResult.error) throw readingResult.error;

    return NextResponse.json({
      source: sourceResult.data,
      items: {
        lexical: lexicalResult.data || [],
        sentences: sentenceResult.data || [],
        reading: readingResult.data || [],
      },
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin source items error:', error);
    return NextResponse.json({ error: 'Failed to load source items' }, { status: 500 });
  }
}
