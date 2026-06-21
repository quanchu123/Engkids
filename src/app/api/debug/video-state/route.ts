import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { getAllVideos, getAllVideosAdmin } from '@/services/video';
import { UPLOADS_DIR } from '@/services/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return process.env.GITHUB_SHA?.slice(0, 7) || 'unknown';
  }
}

function getSupabaseProjectRef(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname.split('.')[0] || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function GET() {
  const [publicVideos, adminVideos] = await Promise.all([
    getAllVideos().catch(() => []),
    getAllVideosAdmin().catch(() => []),
  ]);

  const videos = adminVideos.map((video) => {
    const objectKey = video.objectKey || null;
    const filePath = objectKey ? path.join(UPLOADS_DIR, objectKey) : null;
    return {
      id: video.id,
      title: video.title,
      status: video.status,
      category: video.category,
      objectKey,
      public: video.status === 'ready',
      fileExistsOnThisServer: filePath ? existsSync(filePath) : false,
      createdAt: video.createdAt,
    };
  });

  return NextResponse.json(
    {
      ok: true,
      commit: getGitCommit(),
      supabaseProjectRef: getSupabaseProjectRef(),
      uploadsDir: UPLOADS_DIR,
      counts: {
        adminAll: adminVideos.length,
        publicAll: publicVideos.length,
        publicVideoTab: publicVideos.filter((video) => video.category === 'video').length,
        publicMusicTab: publicVideos.filter((video) => video.category === 'music').length,
      },
      videos,
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
