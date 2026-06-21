import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/me
 * Get current admin user from either Supabase admin session or legacy admin JWT
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminAuthUser(request);

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    return NextResponse.json({ admin });
  } catch (error) {
    console.error('Get admin error:', error);
    return NextResponse.json({ error: 'Failed to resolve admin user' }, { status: 500 });
  }
}
