import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { createLocalVideo } from '@/services/video';
import { checkAdminAuth } from '@/lib/api-auth';
import { apiCache } from '@/lib/cache';

// Local uploads can be large; allow streaming and a generous body size.
export const runtime = 'nodejs';
export const maxDuration = 300;

const ALLOWED_EXT = ['.mp4', '.webm', '.mov', '.ogg'];
const MAX_BYTES = 500 * 1024 * 1024; // 500MB safety cap for offline testing

// POST /api/videos/local - Upload a video file to the local server (no Bunny needed)
export async function POST(request: NextRequest) {
  try {
    const isAuthed = await checkAdminAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const title = String(formData.get('title') || '').trim();
    const titleVi = String(formData.get('titleVi') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const level = String(formData.get('level') || 'Beginner') as
      | 'Beginner'
      | 'Elementary'
      | 'Intermediate';
    const category = (String(formData.get('category') || 'video') === 'music'
      ? 'music'
      : 'video') as 'video' | 'music';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!title || !titleVi) {
      return NextResponse.json(
        { error: 'Title (English) and Title (Vietnamese) are required' },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_EXT.join(', ')}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large (max 500MB for local upload)' },
        { status: 400 }
      );
    }

    // Save to public/uploads so Next.js serves it statically at /uploads/<name>
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, fileName), buffer);

    const publicPath = `/uploads/${fileName}`;

    const video = await createLocalVideo({
      title,
      titleVi,
      description,
      level,
      category,
      filePath: publicPath,
    });

    // Invalidate cached lists so the new video shows up
    apiCache.invalidatePattern('videos:list');

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Local upload error:', error);
    return NextResponse.json({ error: 'Failed to upload video locally' }, { status: 500 });
  }
}
