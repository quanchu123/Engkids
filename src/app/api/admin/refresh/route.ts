import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/services/admin-auth';

/**
 * POST /api/admin/refresh
 * Refresh access token using refresh token from cookie
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }

    const result = await refreshAccessToken(refreshToken);

    return NextResponse.json({
      success: true,
      admin: result.admin,
      accessToken: result.accessToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clear invalid refresh token
    const response = NextResponse.json(
      { error: 'Session expired' },
      { status: 401 }
    );
    
    response.cookies.delete('refresh_token');
    
    return response;
  }
}
