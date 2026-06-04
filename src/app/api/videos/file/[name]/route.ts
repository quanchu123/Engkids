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

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ogg': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

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
  if (!existsSync(filePath)) {
    return new Response('Not found', { status: 404 });
  }

  const stat = statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(safeName).toLowerCase();
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
