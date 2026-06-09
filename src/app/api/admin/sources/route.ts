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

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const [{ data: sources, error: sourcesError }, { data: staging, error: stagingError }] = await Promise.all([
      supabase
        .from('curriculum_import_sources')
        .select('id,title,publisher,source_url,license_name,license_url,attribution,allowed_use,source_kind,import_mode,approved,trust_status,source_hash,imported_at,updated_at')
        .order('updated_at', { ascending: false }),
      supabase
        .from('curriculum_import_staging')
        .select('source_id,review_status,entity_type'),
    ]);

    if (sourcesError) throw sourcesError;
    if (stagingError) throw stagingError;

    const counts = new Map<string, Record<string, number>>();
    for (const row of staging || []) {
      const sourceId = row.source_id || 'unknown';
      const status = row.review_status || 'unknown';
      const current = counts.get(sourceId) || {};
      current[status] = (current[status] || 0) + 1;
      counts.set(sourceId, current);
    }

    return NextResponse.json({
      sources: (sources || []).map((source) => ({ ...source, stagingCounts: counts.get(source.id) || {} })),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin sources error:', error);
    return NextResponse.json({ error: 'Failed to load sources' }, { status: 500 });
  }
}
