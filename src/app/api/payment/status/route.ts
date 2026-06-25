import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { payos } from '@/lib/payos';
import { markTransactionPaidAndUpgrade } from '@/lib/server/subscriptions';

/**
 * GET /api/payment/status?orderCode=EK123ABC
 * Check the current status of a transaction. Used for polling from the checkout page.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderCode = searchParams.get('orderCode');

    if (!orderCode) {
      return NextResponse.json({ error: 'orderCode is required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    let { data: transaction, error } = await supabase
      .from('transactions')
      .select('order_code, amount, plan_id, status, created_at, paid_at, premium_applied_at')
      .eq('order_code', orderCode)
      .eq('user_id', user.id)
      .single();

    if (error || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status === 'PENDING' || (transaction.status === 'PAID' && !transaction.premium_applied_at)) {
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseServiceKey) {
        try {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
          const payosPayment = transaction.status === 'PENDING'
            ? await payos.paymentRequests.get(Number(orderCode))
            : null;

          if (transaction.status === 'PAID' || payosPayment?.status === 'PAID') {
            const { data: adminTransaction, error: adminFetchError } = await supabaseAdmin
              .from('transactions')
              .select('*')
              .eq('order_code', orderCode)
              .eq('user_id', user.id)
              .single();

            if (adminFetchError || !adminTransaction) {
              throw adminFetchError ?? new Error('Transaction not found');
            }

            await markTransactionPaidAndUpgrade(supabaseAdmin, adminTransaction);
          } else if (payosPayment && ['CANCELLED', 'EXPIRED', 'FAILED'].includes(payosPayment.status)) {
            await supabaseAdmin
              .from('transactions')
              .update({ status: 'CANCELLED' })
              .eq('order_code', orderCode)
              .eq('user_id', user.id);
          }

          const { data: refreshed } = await supabase
            .from('transactions')
            .select('order_code, amount, plan_id, status, created_at, paid_at, premium_applied_at')
            .eq('order_code', orderCode)
            .eq('user_id', user.id)
            .single();

          if (refreshed) {
            transaction = refreshed;
          }
        } catch (syncError) {
          console.warn('PayOS status sync skipped:', syncError);
        }
      }
    }

    return NextResponse.json({ transaction });
  } catch (error: unknown) {
    console.error('Payment Status Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
