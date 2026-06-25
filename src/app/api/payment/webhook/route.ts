import { NextResponse } from 'next/server';
import { payos } from '@/lib/payos';
import { createClient } from '@supabase/supabase-js';
import { markTransactionPaidAndUpgrade } from '@/lib/server/subscriptions';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify webhook signature using PayOS SDK (throws WebhookError if invalid/tampered)
    const webhookData = await payos.webhooks.verify(body);

    const orderCode = webhookData.orderCode;

    // Use service role to update DB via webhook (since the request is server-to-server from PayOS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Find the transaction
    const { data: transaction, error: fetchError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('order_code', orderCode)
      .single();

    if (fetchError || !transaction) {
      console.error('Transaction not found for orderCode:', orderCode);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.status === 'PAID' && transaction.premium_applied_at) {
      return NextResponse.json({ message: 'Already processed' });
    }

    // 2. Mark transaction as PAID and upgrade user account Premium status.
    await markTransactionPaidAndUpgrade(supabaseAdmin, transaction);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('PayOS Webhook Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
