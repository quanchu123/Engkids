import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { getAdminAuthUser } from '@/lib/api-auth';

/**
 * GET /api/payment/transactions
 * Admin-only: list all transactions with user info.
 * Query params: ?status=PENDING (optional filter)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    const admin = await getAdminAuthUser(req);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Use service role to read all transactions
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabaseAdmin
      .from('transactions')
      .select('*, user_profiles!transactions_user_id_fkey(display_name, auth_id)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: transactions, error } = await query;

    if (error) {
      // Fallback: query without join if the FK doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fallbackError) {
        console.error('Transactions query error:', fallbackError);
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
      }

      return NextResponse.json({ transactions: fallbackData || [] });
    }

    return NextResponse.json({ transactions: transactions || [] });
  } catch (error: unknown) {
    console.error('Transactions List Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
