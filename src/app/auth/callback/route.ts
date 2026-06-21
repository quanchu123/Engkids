import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { authConfig } from '@/config/auth';

// Server-side OAuth callback handler
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth error
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Exchange code for session
  if (code) {
    // The redirect response carries the auth cookies set during the exchange,
    // so the session is shared with middleware + API routes.
    const response = NextResponse.redirect(
      new URL(authConfig.redirects.afterLogin, request.url)
    );

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
        );
      }

      // Success - cookies are attached to `response`.
      return response;
    } catch (err) {
      console.error('Unexpected error during code exchange:', err);
      return NextResponse.redirect(
        new URL('/login?error=Authentication+failed', request.url)
      );
    }
  }

  // No code provided
  return NextResponse.redirect(
    new URL('/login?error=No+authorization+code', request.url)
  );
}
