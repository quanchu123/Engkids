import { readFile, stat } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { UPLOADS_DIR } from '@/services/storage';

export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await params;
  const root = path.resolve(UPLOADS_DIR);
  const filePath = path.resolve(root, ...parts);

  if (!filePath.startsWith(root + path.sep)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const bytes = await readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
