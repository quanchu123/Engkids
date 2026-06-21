import { NextResponse } from 'next/server';
import { payos, SUBSCRIPTION_PLANS, PlanId } from '@/lib/payos';
import { getSupabaseClient } from '@/lib/auth-client';
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a unique order code (must be < 9007199254740991)
    // We can use a timestamp + random 3 digits to ensure uniqueness
    const orderCode = Number(String(Date.now()).slice(-9) + Math.floor(Math.random() * 1000));

    // Create a transaction in the database
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        order_code: orderCode,
        amount: plan.price,
        plan_id: planId,
        status: 'PENDING'
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Error creating transaction:', dbError);
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // Call PayOS to create a payment link
    const requestData = {
      orderCode: orderCode,
      amount: plan.price,
      description: `EK${orderCode}`, // Concise description for VietQR
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/pricing?cancel=true`,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/checkout/${orderCode}?success=true`,
    };

    const paymentLinkData = await payos.paymentRequests.create(requestData);

    return NextResponse.json({ 
      checkoutUrl: paymentLinkData.checkoutUrl,
      orderCode: orderCode,
      qrCode: paymentLinkData.qrCode, // If you want to render it locally
      paymentLinkData
    });
  } catch (error: any) {
    console.error('PayOS Create Payment Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
