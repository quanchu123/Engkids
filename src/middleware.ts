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

export function middleware(request: NextRequest) {
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
    const isLocalhost = identifier === '::1' || identifier === '127.0.0.1' || identifier === 'anonymous';
    const isDev = process.env.NODE_ENV === 'development';

    if (isLocalhost && isDev) {
      const limit = 1000;
      const windowMs = 60 * 1000;

      if (!checkRateLimit(identifier, limit, windowMs)) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
            },
          }
        );
      }
    } else {
      // Production rate limits.
      // Use SEPARATE counters per category so that normal navigation requests
      // (page loads, status polls, listing) never eat into the upload budget,
      // and vice-versa. Previously a single shared per-IP counter meant routine
      // browsing could trip the strict upload limit before any upload happened.
      const isFileUpload = pathname.startsWith('/api/videos/upload');
      const bucket = isFileUpload ? 'upload' : 'api';
      const limit = isFileUpload ? 60 : 300;
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
  const response = NextResponse.next();
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
    '/api/:path*',
    '/admin/:path*',
  ],
};
