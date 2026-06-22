import { NextResponse } from 'next/server';
import { SUBSCRIPTION_PLANS, PlanId, generateOrderCode, BANK_CONFIG } from '@/lib/payment';
import { payos } from '@/lib/payos';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  try {
    const { planId } = await req.json();

    if (!planId || !SUBSCRIPTION_PLANS[planId as PlanId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const plan = SUBSCRIPTION_PLANS[planId as PlanId];

    // Get current user via SSR supabase client
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
      return NextResponse.json({ error: 'Vui lòng đăng nhập trước khi mua gói.' }, { status: 401 });
    }

    // Generate a unique numeric order code (less than 9007199254740991 to fit in BIGINT)
    const orderCode = generateOrderCode();

    // Create a transaction in the database
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        order_code: orderCode,
        amount: plan.price,
        plan_id: planId,
        status: 'PENDING',
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Error creating transaction:', dbError);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // Call PayOS to create a payment link
    const requestData = {
      orderCode: Number(orderCode),
      amount: plan.price,
      description: `Mua ${plan.name}`.slice(0, 25), // PayOS allows max 25 chars (no special characters/diacritics recommended, but plain Vietnamese with spaces is generally ok or we can strip it)
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/pricing?cancel=true`,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/${orderCode}?success=true`,
    };

    // Strip diacritics from description to be safe with PayOS requirements
    const safeDesc = requestData.description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd');

    const paymentLinkData = await payos.paymentRequests.create({
      ...requestData,
      description: safeDesc,
    });

    return NextResponse.json({
      orderCode,
      amount: plan.price,
      planName: plan.name,
      durationMonths: plan.durationMonths,
      checkoutUrl: paymentLinkData.checkoutUrl,
      bank: BANK_CONFIG,
      transactionId: transaction.id,
    });
  } catch (error: unknown) {
    console.error('Create Payment Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
