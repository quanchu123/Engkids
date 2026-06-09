import { NextRequest } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '@/services/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

const STATIC_ROOT = path.join(UPLOADS_DIR, 'static-assets');
const PUBLIC_ROOT = path.join(process.cwd(), 'public');

function safeRelativePath(parts: string[]): string | null {
  const clean = parts.filter(Boolean).join('/');
  if (!clean || clean.includes('\0') || clean.includes('..') || clean.includes('\\')) return null;
  const normalized = path.posix.normalize(clean);
  if (normalized.startsWith('../') || normalized === '..' || path.isAbsolute(normalized)) return null;
  return normalized;
}

function resolveAsset(rel: string): string | null {
  const dropletPath = path.resolve(STATIC_ROOT, rel);
  if (dropletPath.startsWith(path.resolve(STATIC_ROOT)) && existsSync(dropletPath)) return dropletPath;

  // Rollout fallback: only static game assets may fall back to /public.
  if (!rel.startsWith('games/')) return null;
  const publicPath = path.resolve(PUBLIC_ROOT, rel);
  if (publicPath.startsWith(path.resolve(PUBLIC_ROOT)) && existsSync(publicPath)) return publicPath;
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const rel = safeRelativePath(Array.isArray(parts) ? parts : []);
  if (!rel) return new Response('Bad request', { status: 400 });

  const filePath = resolveAsset(rel);
  if (!filePath) return new Response('Not found', { status: 404 });

  const info = statSync(filePath);
  if (!info.isFile()) return new Response('Not found', { status: 404 });

  const ext = path.extname(filePath).toLowerCase();
  const stream = createReadStream(filePath);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Content-Length': String(info.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
