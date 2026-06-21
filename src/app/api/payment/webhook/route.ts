import { NextResponse } from 'next/server';
import { payos, SUBSCRIPTION_PLANS, PlanId } from '@/lib/payos';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify Webhook Signature according to PayOS docs
    // verifyPaymentWebhookData throws an error if signature is invalid
    const webhookData = await payos.webhooks.verify(body);

    if (webhookData.code === '00') {
      // The transaction was successful!
      const orderCode = webhookData.orderCode;

      // We need to use the SERVICE ROLE key to update the database via webhook
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // IMPORTANT: You must set this in .env.local

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
        console.error('Transaction not found:', orderCode);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      if (transaction.status === 'PAID') {
        // Already processed
        return NextResponse.json({ message: 'Already processed' });
      }

      // 2. Mark transaction as PAID
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'PAID', paid_at: new Date().toISOString() })
        .eq('id', transaction.id);

      // 3. Upgrade user account
      const plan = SUBSCRIPTION_PLANS[transaction.plan_id as PlanId];
      if (plan) {
        // Calculate new expiration date
        // First get current profile to see if they already have premium
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('premium_until')
          .eq('auth_id', transaction.user_id)
          .single();

        let currentExpiry = new Date();
        if (profile?.premium_until && new Date(profile.premium_until) > currentExpiry) {
          currentExpiry = new Date(profile.premium_until);
        }

        // Add months
        currentExpiry.setMonth(currentExpiry.getMonth() + plan.durationMonths);

        // Update profile
        await supabaseAdmin
          .from('user_profiles')
          .update({
            account_type: 'premium',
            premium_until: currentExpiry.toISOString()
          })
          .eq('auth_id', transaction.user_id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Not a successful payment' });
  } catch (error: any) {
    console.error('PayOS Webhook Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
