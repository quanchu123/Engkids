import { NextResponse } from 'next/server';
import { payos } from '@/lib/payos';
import { SUBSCRIPTION_PLANS, PlanId } from '@/lib/payment';
import { createClient } from '@supabase/supabase-js';

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

    if (transaction.status === 'PAID') {
      return NextResponse.json({ message: 'Already processed' });
    }

    // 2. Mark transaction as PAID
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', transaction.id);

    // 3. Upgrade user account Premium status
    const plan = SUBSCRIPTION_PLANS[transaction.plan_id as PlanId];
    if (plan) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('premium_until')
        .eq('auth_id', transaction.user_id)
        .single();

      let currentExpiry = new Date();
      if (profile?.premium_until && new Date(profile.premium_until) > currentExpiry) {
        currentExpiry = new Date(profile.premium_until);
      }

      currentExpiry.setMonth(currentExpiry.getMonth() + plan.durationMonths);

      await supabaseAdmin
        .from('user_profiles')
        .update({
          account_type: 'premium',
          premium_until: currentExpiry.toISOString(),
        })
        .eq('auth_id', transaction.user_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('PayOS Webhook Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
