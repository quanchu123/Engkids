import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, hasAdminUsers, createAdminUser } from '@/services/admin-auth';

/**
 * POST /api/admin/login
 * Authenticate admin and return tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if this is initial setup (no admins exist)
    const hasAdmins = await hasAdminUsers();

    if (!hasAdmins) {
      // Require setup token for initial admin creation
      const setupToken = process.env.ADMIN_SETUP_TOKEN;
      if (!setupToken) {
        return NextResponse.json(
          { error: 'ADMIN_SETUP_TOKEN environment variable must be configured for initial setup' },
          { status: 403 }
        );
      }

      const { setupToken: providedToken } = body;
      if (!providedToken || providedToken !== setupToken) {
        return NextResponse.json(
          { error: 'Valid setup token required for initial admin creation' },
          { status: 403 }
        );
      }

      // Create first admin user
      await createAdminUser(email, password, 'Super Admin', 'super_admin');
    }

    // Authenticate
    const result = await authenticateAdmin(
      email,
      password,
      request.headers.get('x-forwarded-for') || request.ip,
      request.headers.get('user-agent') || undefined
    );

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json({
      success: true,
      admin: result.admin,
      accessToken: result.accessToken,
    });

    response.cookies.set('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  }
}
