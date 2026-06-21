import { NextResponse } from 'next/server';

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

export async function GET() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        status: 'degraded',
        ready: false,
        missing,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: 'ready',
    ready: true,
    timestamp: new Date().toISOString(),
  });
}
