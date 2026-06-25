import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { markTransactionPaidAndUpgrade } from '@/lib/server/subscriptions';

/**
 * POST /api/payment/confirm
 * Admin-only: confirm a PENDING transaction as PAID and upgrade the user.
 * Body: { orderCode: string }
 */
export async function POST(req: Request) {
  try {
    const { orderCode } = await req.json();
    if (!orderCode) {
      return NextResponse.json({ error: 'orderCode is required' }, { status: 400 });
    }

    // ── Verify the caller is an admin ──
    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin by email list
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!adminEmails.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    // ── Use service role to update data ──
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Find the transaction
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('order_code', orderCode)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status === 'PAID' && transaction.premium_applied_at) {
      return NextResponse.json({ message: 'Already confirmed', transaction });
    }

    const premiumUntil = await markTransactionPaidAndUpgrade(supabaseAdmin, transaction);

    return NextResponse.json({ success: true, orderCode, premiumUntil });
  } catch (error: unknown) {
    console.error('Confirm Payment Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
