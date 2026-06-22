import { NextResponse } from 'next/server';

/**
 * @deprecated – This webhook route is no longer used.
 * Payment confirmation is now handled through the admin panel at
 * POST /api/payment/confirm instead of PayOS webhooks.
 */
export async function POST() {
  return NextResponse.json(
    { message: 'This webhook endpoint is deprecated. Use /api/payment/confirm instead.' },
    { status: 410 }
  );
}
