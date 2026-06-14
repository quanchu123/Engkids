import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://engkidstienganhchobe.tech',
  'https://www.engkidstienganhchobe.tech',
  'https://engkidstienganhchobe.me',
  'https://www.engkidstienganhchobe.me',
].join(',');

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

function getCorsHeaders(origin: string | null): Record<string, string> | null {
  // No origin header = same-origin request, no CORS headers needed
  if (!origin) return null;
  // Only allow listed origins
  if (!ALLOWED_ORIGINS.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// WARNING: This in-memory rate limiter does NOT persist across restarts
// and does NOT work in multi-instance deployments (e.g., Vercel serverless).
// For production at scale, replace with Redis-backed rate limiting (e.g., @upstash/ratelimit).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(origin);
    if (!corsHeaders) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';

    // Skip rate limiting for localhost in development
    const host = request.headers.get('host') || request.nextUrl.hostname;
    const isLocalhost = identifier === '::1' ||
      identifier === '127.0.0.1' ||
      identifier === 'anonymous' ||
      identifier.startsWith('::ffff:127.') ||
      host.startsWith('localhost') ||
      host.startsWith('127.0.0.1');
    const isDev = process.env.NODE_ENV === 'development';

    if (!(isLocalhost && isDev)) {
      // Production rate limits.
      // Use SEPARATE counters per category so normal navigation/media requests
      // never eat into upload or mutation budgets.
      const isFileUpload = pathname.startsWith('/api/videos/upload');
      const isMediaRead = request.method === 'GET' && (
        pathname.startsWith('/api/videos/file/') ||
        pathname.startsWith('/api/assets/file/') ||
        pathname.startsWith('/api/images/file/')
      );
      const bucket = isFileUpload ? 'upload' : isMediaRead ? 'media' : 'api';
      const limit = isFileUpload ? 60 : isMediaRead ? 2000 : 300;
      const windowMs = 15 * 60 * 1000; // 15 minutes

      if (!checkRateLimit(`${bucket}:${identifier}`, limit, windowMs)) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': '900',
            },
          }
        );
      }
    }
  }

  // Add CORS headers to response (only for allowed origins)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check auth for route protection
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Only a few routes require login. Everything else (home, roadmap,
    // stories, videos, music, games, learn surfaces, ...) is public so kids can
    // browse freely. We use an explicit protected-route allowlist instead of
    // protecting everything-by-default, which previously bounced every tab to
    // /login.
    // NOTE: /admin is intentionally NOT here — admin auth uses a legacy JWT in
    // sessionStorage (not a Supabase cookie session), so the client-side
    // AdminGuard handles that gate. Adding it here would bounce admins to
    // /login even when correctly signed in.
    const PROTECTED_PREFIXES = ['/progress', '/parent', '/profile'];
    const isProtectedRoute = PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    if (isProtectedRoute) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  const corsHeaders = getCorsHeaders(origin);
  if (corsHeaders) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
