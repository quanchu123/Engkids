import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminAuthUser } from '@/lib/api-auth';
import { markTransactionPaidAndUpgrade } from '@/lib/server/subscriptions';

/**
 * POST /api/payment/confirm
 * Admin-only: confirm a PENDING transaction as PAID and upgrade the user.
 * Body: { orderCode: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { orderCode } = await req.json();
    if (!orderCode) {
      return NextResponse.json({ error: 'orderCode is required' }, { status: 400 });
    }

    const admin = await getAdminAuthUser(req);
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    const paymentTime = transaction.created_at || new Date().toISOString();
    const premiumUntil = await markTransactionPaidAndUpgrade(supabaseAdmin, transaction, paymentTime);

    return NextResponse.json({ success: true, orderCode, premiumUntil });
  } catch (error: unknown) {
    console.error('Confirm Payment Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
