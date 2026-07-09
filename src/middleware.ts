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
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
            });
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({ name, value, ...options });
            });
          },
        },
      }
    );

    // Login is required to use the learning features (roadmap, lessons, games,
    // progress, ...). Browsing content is free so kids can preview without an
    // account. The public allowlist:
    //   - /login and /auth/* : the sign-in pages + OAuth callback (gating these
    //     would create a redirect loop).
    //   - / : the home/landing page.
    //   - /stories, /videos, /music : read-only content browsing.
    //   - /admin : admin auth uses a legacy JWT in sessionStorage (not a
    //     Supabase cookie session); the client-side AdminGuard handles it.
    //     Gating it here would bounce signed-in admins to /login.
    //   - /api/* : API routes authenticate themselves (see lib/api-auth.ts) and
    //     return 401 rather than an HTML redirect, so they must not be bounced.
    const PUBLIC_FILES = ['/deploy-commit.txt'];
    const PUBLIC_PREFIXES = ['/login', '/auth', '/stories', '/videos', '/music', '/pricing', '/checkout'];
    const isPublicRoute =
      pathname === '/' ||
      PUBLIC_FILES.includes(pathname) ||
      PUBLIC_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
    const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
    const isApiRoute = pathname.startsWith('/api/');

    if (!isPublicRoute && !isAdminRoute && !isApiRoute) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const loginUrl = new URL('/login', request.url);
        // Preserve where the user was heading so we can send them back after login.
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
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
