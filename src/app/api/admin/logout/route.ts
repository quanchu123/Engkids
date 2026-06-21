import { NextRequest, NextResponse } from 'next/server';
import { logoutAdmin } from '@/services/admin-auth';

/**
 * POST /api/admin/logout
 * Invalidate refresh token and clear cookies
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (refreshToken) {
      await logoutAdmin(refreshToken);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('refresh_token');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even if server error
    const response = NextResponse.json({ success: true });
    response.cookies.delete('refresh_token');
    
    return response;
  }
}
