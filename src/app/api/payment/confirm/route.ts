import { NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS, PlanId } from '@/lib/payment';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

    if (transaction.status === 'PAID') {
      return NextResponse.json({ message: 'Already confirmed', transaction });
    }

    // Mark as PAID
    const now = new Date().toISOString();
    await supabaseAdmin
      .from('transactions')
      .update({ status: 'PAID', paid_at: now })
      .eq('id', transaction.id);

    // Upgrade user account
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

    return NextResponse.json({ success: true, orderCode, paidAt: now });
  } catch (error: unknown) {
    console.error('Confirm Payment Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
