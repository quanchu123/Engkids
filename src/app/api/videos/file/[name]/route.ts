import { NextRequest } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '@/services/storage';

// Serve uploaded video files from the droplet disk with HTTP Range support.
// Range support is required for <video> seeking and reliable playback; the
// built-in Next static handler does not stream runtime-added files reliably
// (especially under output: 'standalone').
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogg': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function escapeSvgText(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] || char);
}

function missingImageResponse(name: string) {
  const label = escapeSvgText(path.parse(name).name.slice(0, 18) || 'thumbnail');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="Missing thumbnail"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#7c3aed"/><stop offset="55%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="120" cy="80" r="72" fill="#ffffff" opacity="0.16"/><circle cx="550" cy="310" r="120" fill="#ffffff" opacity="0.13"/><path d="M276 132v96l92-48-92-48Z" fill="#fff" opacity="0.94"/><text x="320" y="286" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff" opacity="0.86">Engkids video</text><text x="320" y="318" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#fff" opacity="0.64">' + label + '</text></svg>';
  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Engkids-Fallback': 'missing-thumbnail',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  // Prevent path traversal: only allow a bare file name.
  const safeName = path.basename(name);
  if (safeName !== name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return new Response('Bad request', { status: 400 });
  }

  const filePath = path.join(UPLOADS_DIR, safeName);
  const ext = path.extname(safeName).toLowerCase();
  if (!existsSync(filePath)) {
    if (IMAGE_EXTENSIONS.has(ext)) return missingImageResponse(safeName);
    return new Response('Not found', { status: 404 });
  }

  const stat = statSync(filePath);
  const fileSize = stat.size;
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  const range = request.headers.get('range');

  // Full-content response (no Range header).
  if (!range) {
    const stream = createReadStream(filePath);
    return new Response(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // Partial-content (Range) response for seeking/streaming.
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  let start = match && match[1] ? parseInt(match[1], 10) : 0;
  let end = match && match[2] ? parseInt(match[2], 10) : fileSize - 1;

  if (isNaN(start) || start < 0) start = 0;
  if (isNaN(end) || end >= fileSize) end = fileSize - 1;
  if (start > end) {
    return new Response('Range Not Satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileSize}` },
    });
  }

  const chunkSize = end - start + 1;
  const stream = createReadStream(filePath, { start, end });

  return new Response(stream as unknown as ReadableStream, {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
